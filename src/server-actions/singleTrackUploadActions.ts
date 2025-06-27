'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { getInternalUserId } from '@/lib/userUtils';
import type { ContentType as ContentTypeEnum } from '@prisma/client';
import { TrackFileType, LicenseType, Prisma, ContentType } from '@prisma/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateUniqueSlug } from './tracks/trackMutations';
import prisma from '@/lib/db/prisma'; // Import prisma client
import { revalidatePath } from 'next/cache';
import { 
    sanitizeFilename, 
    generateTrackStoragePaths, 
    createSignedUploadUrls,
    getPublicUrl 
} from '@/services/track.service';

// --- Input Schema for Preparation ---
const prepareInputSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().max(1000).optional().nullable(),
    bpm: z.number().positive().int().nullable(),
    key: z.string().max(50).nullable(),
    tags: z.string().optional().nullable(),
    genre: z.string().optional().nullable(), // Also allow null for genre
    contentType: z.enum(['BEATS', 'LOOPS', 'SOUNDKITS', 'PRESETS']),
    price: z.number().nonnegative(),
    _previewFileName: z.string().min(1, 'Preview filename missing'),
    _coverFileName: z.string().min(1, 'Cover filename missing'),
});

type PrepareInput = z.infer<typeof prepareInputSchema>;

// --- Output Structure for Preparation ---
interface PrepareResult {
    success: boolean;
    error?: string;
    errorDetails?: ReturnType<z.ZodError<PrepareInput>['flatten']>;
    preparations?: {
        trackId: string;
        previewUploadUrl: string;
        coverUploadUrl: string;
        previewStoragePath: string;
        coverStoragePath: string;
    };
}

// --- Filename Sanitization moved to track.service.ts ---

// --- Constants ---
const BUCKET_NAME = 'wavhaven-tracks'; // Ensure this matches your bucket
const SIGNED_URL_UPLOAD_EXPIRY = 300; // 5 minutes

// --- prepareSingleTrackUpload Action --- Refactored for Prisma ---
export async function prepareSingleTrackUpload(
    input: PrepareInput
): Promise<PrepareResult> {
    'use server';
    console.log("--- Inside prepareSingleTrackUpload (Prisma) ---");
    console.log("[prepareSingleTrackUpload] Received input:", input);

    // 1. Validate Input Data
    const validation = prepareInputSchema.safeParse(input);
    if (!validation.success) {
        console.error("Prepare Single Validation Error:", validation.error.flatten());
        return { 
            success: false, 
            error: 'Invalid input data.',
            errorDetails: validation.error.flatten()
        };
    }
    const trackData = validation.data;

    // 2. Authenticate User
    const authData = await auth();
    const clerkUserId = authData?.userId;
    if (!clerkUserId) {
        console.error("[prepareSingleTrackUpload] Auth Error: User not authenticated.");
        return { success: false, error: 'User not authenticated.' };
    }
    console.log(`[prepareSingleTrackUpload] Authenticated Clerk User ID: ${clerkUserId}`);

    // 3. Get Internal User ID (with improved error handling)
    let producerId: string | null = null;
    try {
        producerId = await getInternalUserId(clerkUserId); // Use the utility
        if (!producerId) {
             // Throw a more specific error if lookup returns null
             // This is the most likely place the Supabase error occurred
             throw new Error(`Internal user ID not found for Clerk user ${clerkUserId}. Please ensure user synchronization is working correctly.`);
        }
        console.log(`[prepareSingleTrackUpload] Found Internal User ID: ${producerId}`);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error during user lookup';
        console.error(`[prepareSingleTrackUpload] Failed to get internal user ID for Clerk ID ${clerkUserId}:`, error);
         // Return the specific error message from getInternalUserId or the catch block
        return { success: false, error: `User lookup failed: ${msg}` }; // This error likely includes the Supabase message
    }

    let newTrackId: string | null = null;
    let tempPreviewPath: string | null = null; 
    let tempCoverPath: string | null = null;   

    try {
        // 4. Map Content Type
        const contentTypeMap: Record<string, ContentTypeEnum> = {
            'BEATS': ContentType.BEATS,
            'LOOPS': ContentType.LOOPS,
            'SOUNDKITS': ContentType.SOUNDKITS,
            'PRESETS': ContentType.PRESETS,
        };
        const dbContentType = contentTypeMap[trackData.contentType];
        if (!dbContentType) throw new Error(`Invalid content type: ${trackData.contentType}`);

        // 5. Generate Unique Slug
        const uniqueSlug = await generateUniqueSlug(trackData.title);

        // 6. Create Track & Basic License within a Transaction
        console.log("[prepareSingleTrackUpload] Creating track and license records via Prisma transaction...");
        const createdTrack = await prisma.$transaction(async (tx) => {
             // Create Track Record
             const track = await tx.track.create({
                data: {
                    producerId: producerId!, // producerId is checked above
                title: trackData.title,
                slug: uniqueSlug,
                description: trackData.description || null,
                bpm: trackData.bpm,
                key: trackData.key,
                    // Tags will be handled in finalize step or separate action
                isPublished: false,
                },
                select: { id: true }, // Select only the ID we need
            });

            if (!track?.id) {
                throw new Error('Track creation failed within transaction.');
        }
            console.log(`[prepareSingleTrackUpload] Transaction: Created track record with ID: ${track.id}`);
            newTrackId = track.id; // Assign ID within transaction scope (useful if needed for license)

            // Create Basic License Record
            await tx.license.create({
                data: {
                    trackId: track.id,
                type: LicenseType.BASIC,
                name: 'Basic License',
                price: trackData.price,
                description: 'Standard license terms.',
                    filesIncluded: [TrackFileType.MAIN_MP3], // Example default
                    isAvailable: true,
                }
            });
            console.log(`[prepareSingleTrackUpload] Transaction: Created BASIC License for Track ID: ${track.id}`);
            
            return track; // Return the created track (or just the ID)
        });
        // --- Transaction Complete ---
        
        // Reassign ID outside transaction scope if needed
        newTrackId = createdTrack.id;
        if (!newTrackId) {
             // Should not happen if transaction succeeded, but safety check
             throw new Error("Transaction completed but failed to get track ID.");
        }

        // 7. Prepare Storage Paths & Generate Signed URLs (Uses Track Service)
        const { previewStoragePath, coverStoragePath } = generateTrackStoragePaths(
            producerId!,
            newTrackId,
            trackData._previewFileName,
            trackData._coverFileName
        );
        
        if (!previewStoragePath || !coverStoragePath) {
            throw new Error('Failed to generate storage paths.');
        }
        
        tempPreviewPath = previewStoragePath;
        tempCoverPath = coverStoragePath;

        console.log("[prepareSingleTrackUpload] Generating signed URLs...");
        const { urls, error } = await createSignedUploadUrls(
            BUCKET_NAME,
            [previewStoragePath, coverStoragePath],
            SIGNED_URL_UPLOAD_EXPIRY
        );

        if (error || urls.length !== 2) {
            console.error('Signed URL generation error:', error);
            throw new Error(error || 'Failed to create signed URLs');
        }

        const [previewUploadUrl, coverUploadUrl] = urls;
        console.log("[prepareSingleTrackUpload] Signed URLs generated successfully.");

        // 8. Prepare Result (Success)
        return {
            success: true,
            preparations: {
                trackId: newTrackId,
                previewUploadUrl,
                coverUploadUrl,
                previewStoragePath,
                coverStoragePath,
            },
        };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred during preparation.';
        console.error(`Error in prepareSingleTrackUpload processing for user ${producerId ?? 'unknown'}:`, error);
        
        // Note: Transaction handles rollback of DB changes if it fails internally.
        // If error occurs *after* transaction but before returning success (e.g., URL gen failure),
        // DB records (Track, License) will exist but upload URLs won't be returned.
        // This might require manual DB cleanup or a retry mechanism on the client.
        
        // No need for manual DB cleanup here as transaction handles it.

        return { success: false, error: message };
    }
}

// --- Input Schema for Finalization ---
const finalizeInputSchema = z.object({
    trackId: z.string().min(1, 'Invalid Track ID'),
    previewUploaded: z.boolean(),
    coverUploaded: z.boolean(),
    // Pass storage paths back from client for verification/linking
    previewStoragePath: z.string().min(1, 'Preview path missing'),
    coverStoragePath: z.string().min(1, 'Cover path missing'),
    // --- Add Fields for Track Metadata Update ---
    duration: z.number().nonnegative().optional().nullable(),
    bpm: z.number().positive().int().optional().nullable(),
    key: z.string().max(50).optional().nullable(),
    tags: z.string().optional().nullable(), // Comma-separated string
    genre: z.string().optional().nullable(), // Genre name/ID
    mood: z.string().optional().nullable(), // Mood name/ID
});

type FinalizeInput = z.infer<typeof finalizeInputSchema>;

// --- finalizeSingleTrackUpload Action --- Refactored for Prisma ---
export async function finalizeSingleTrackUpload(
    input: FinalizeInput
): Promise<{ success: boolean; error?: string }> {
    'use server';
    console.log("--- Inside finalizeSingleTrackUpload (Prisma) ---");
    console.log("[finalizeSingleTrackUpload] Received input:", input);

    const validation = finalizeInputSchema.safeParse(input);
    if (!validation.success) {
        console.error("Finalize Validation Error:", validation.error.flatten());
        return { success: false, error: 'Invalid input for finalizing upload.' };
    }
    const { 
        trackId, 
        previewUploaded, 
        coverUploaded, 
        previewStoragePath, 
        coverStoragePath,
        duration,
        tags,
        // other metadata fields...
    } = validation.data;

    // Authenticate user to ensure they own the track
    const { userId: clerkUserId } = await auth();
    const producerId = clerkUserId ? await getInternalUserId(clerkUserId) : null;
    if (!producerId) {
        return { success: false, error: 'User not authenticated or not found.' };
    }
    
    // Check if both files were reported as uploaded by the client
    if (!previewUploaded || !coverUploaded) {
        console.error(`Client reported failed upload for track ${trackId}. Triggering cleanup.`);
        await cleanupFailedUpload(trackId);
        return { success: false, error: 'Upload was not completed successfully. Cleanup has been performed.' };
    }

    try {
        const track = await prisma.track.findFirst({
            where: {
                id: trackId,
                producerId: producerId
            },
        });

        if (!track) {
            return { success: false, error: 'Track not found or you do not have permission to edit it.' };
        }

        // --- Use a transaction to ensure atomicity ---
        await prisma.$transaction(async (tx) => {
            // 1. Create TrackFile records for the uploaded files
            const filesToCreate = [
                {
                    trackId: trackId,
                    fileType: TrackFileType.PREVIEW_MP3,
                    storagePath: previewStoragePath,
                    // url: will be generated on read, not stored
                },
                {
                    trackId: trackId,
                    fileType: TrackFileType.ARTWORK,
                    storagePath: coverStoragePath,
                    // url: will be generated on read, not stored
                }
            ];
            await tx.trackFile.createMany({ data: filesToCreate });
            console.log(`[finalize] Created TrackFile records for track ${trackId}`);

            // 2. Get public URL for the cover art to store on the track
            const { publicUrl: artworkPublicUrl, error: urlError } = getPublicUrl(BUCKET_NAME, coverStoragePath);
            if (urlError) {
                // Throwing an error here will cause the transaction to roll back
                throw new Error(`Failed to get public URL for cover art: ${urlError}`);
            }

            // 3. Create or find Tag records and prepare for connection
            const tagConnectOrCreate = [];
            if (tags) {
                const tagNames = tags.split(',').map(t => t.trim()).filter(Boolean);
                for (const name of tagNames) {
                    tagConnectOrCreate.push({
                        where: { name: name.toLowerCase() },
                        create: { name: name.toLowerCase(), slug: name.toLowerCase().replace(/\s+/g, '-') }
                    });
                }
            }

            // 4. Update the Track record with final details
            await tx.track.update({
                where: { id: trackId },
                data: {
                    isPublished: true, // Publish the track
                    duration: duration,
                    artworkUrl: artworkPublicUrl,
                    // Connect tags
                    tags: {
                        connectOrCreate: tagConnectOrCreate
                    },
                    // Update other metadata if needed from input
                    bpm: input.bpm,
                    key: input.key,
                    genre: input.genre,
                    mood: input.mood,
                },
            });
            console.log(`[finalize] Published and updated metadata for track ${trackId}`);
        });
        
        // --- Revalidation ---
        revalidatePath('/explore');
        revalidatePath(`/track/${track.slug}`); // Revalidate specific track page
        revalidatePath('/dashboard'); // Revalidate producer dashboard

        console.log(`Finalization complete for track ${trackId}.`);
        return { success: true };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred during finalization.';
        console.error(`Error finalizing upload for track ${trackId}:`, error);
        
        // If finalization fails, we should clean up.
        await cleanupFailedUpload(trackId);
        
        return { success: false, error: message };
    }
}

// --- Helper function moved to track.service.ts ---

// --- NEW: Cleanup Failed Upload Action ---
/**
 * Cleans up database records and storage files for a track when the upload process fails
 * after the preparation step.
 * @param trackId The ID of the track record to clean up.
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function cleanupFailedUpload(trackId: string): Promise<{ success: boolean; error?: string }> {
    'use server';
    console.log(`--- Starting cleanup for failed upload: Track ID ${trackId} ---`);

    if (!trackId) {
        return { success: false, error: 'Invalid Track ID for cleanup.' };
    }

    try {
        // Authenticate user to ensure they own the track they're trying to clean up
        const { userId: clerkUserId } = await auth();
        const producerId = clerkUserId ? await getInternalUserId(clerkUserId) : null;
        if (!producerId) {
            return { success: false, error: 'User not authenticated for cleanup.' };
        }

        // Fetch the track and its associated files to get storage paths
        const trackWithFiles = await prisma.track.findFirst({
            where: {
                id: trackId,
                producerId: producerId, // Security check
            },
            select: {
                id: true,
                files: {
                    select: {
                        storagePath: true,
                    },
                },
            },
        });

        // If track doesn't exist or isn't owned by the user, we can consider it "cleaned"
        if (!trackWithFiles) {
            console.log(`Cleanup not needed or not permitted for track ${trackId}. It may already be deleted.`);
            return { success: true };
        }

        const storagePaths = trackWithFiles.files.map(file => file.storagePath).filter(Boolean);

        // Use a transaction to delete DB records
        await prisma.$transaction(async (tx) => {
            // Deleting the track will cascade to licenses, trackfiles, etc.
            // based on the Prisma schema `onDelete: Cascade` settings.
            await tx.track.delete({
                where: { id: trackId },
            });
            console.log(`[cleanup] Successfully deleted track record ${trackId} from database.`);
        });
        
        // After DB records are gone, attempt to delete files from storage
        if (storagePaths.length > 0) {
            console.log(`[cleanup] Deleting associated files from storage for track ${trackId}:`, storagePaths);
            const { data, error } = await supabaseAdmin.storage
                .from(BUCKET_NAME)
                .remove(storagePaths);

            if (error) {
                // Log the error but don't fail the whole operation,
                // as the DB record is the most important part.
                console.error(`[cleanup] Storage cleanup error for track ${trackId}:`, error.message);
                // Optionally, you could flag this for manual review
            } else {
                console.log(`[cleanup] Successfully removed ${data?.length || 0} files from storage.`);
            }
        } else {
             console.log(`[cleanup] No storage files were associated with track ${trackId} in the database.`);
        }

        return { success: true };

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred during cleanup.';
        console.error(`Error during cleanup for track ${trackId}:`, error);
        return { success: false, error: message };
    }
}
// --- End Cleanup Failed Upload Action --- 