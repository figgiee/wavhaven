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
    
    // 1. Validate Input
    const validation = finalizeInputSchema.safeParse(input);
    if (!validation.success) {
        console.error("Finalize Single Validation Error:", validation.error.flatten());
        return { success: false, error: 'Invalid finalization data.' };
    }
    const finalizeData = validation.data;

    // 2. Authenticate User (Check ownership)
    const authData = await auth();
    const clerkUserId = authData?.userId;
    if (!clerkUserId) {
        return { success: false, error: 'User not authenticated.' };
    }
    let producerId: string | null = null;
    try {
        producerId = await getInternalUserId(clerkUserId);
    } catch (error: unknown) { 
        const msg = error instanceof Error ? error.message : 'User lookup failed';
        console.error("Error getting producer ID in finalize:", error);
        return { success: false, error: msg };
    }

    if (!producerId) {
        return { success: false, error: 'Failed to resolve user ID.' };
    }

    // --- Ensure Seller Profile Exists ---
    try {
        console.log(`[finalize] Checking/ensuring SellerProfile for User ID: ${producerId}`);
        const user = await prisma.user.findUnique({
            where: { id: producerId },
            select: { role: true, sellerProfile: { select: { id: true } } }
        });

        if (!user) {
            // Should be impossible if producerId was resolved, but defensive check
            throw new Error('User record not found after resolving ID.');
        }

        if (!user.sellerProfile) {
            console.log(`[finalize] SellerProfile not found for user ${producerId}. Creating profile and updating role...`);
            // Use a transaction to ensure atomicity
            await prisma.$transaction([
                prisma.user.update({ 
                    where: { id: producerId }, 
                    data: { role: 'PRODUCER' } // Use direct enum value if possible, else string
                }),
                prisma.sellerProfile.create({
                    data: { 
                        userId: producerId, 
                        // Add default required fields for SellerProfile here if any
                    }
                })
            ]);
            console.log(`[finalize] Successfully created SellerProfile and updated role for user ${producerId}.`);
        } else {
            console.log(`[finalize] SellerProfile already exists for user ${producerId}.`);
            // Optionally ensure role is PRODUCER even if profile exists
            if (user.role !== 'PRODUCER') { // Use direct enum value if possible
                console.log(`[finalize] User role is ${user.role}, updating to PRODUCER...`);
                await prisma.user.update({ where: { id: producerId }, data: { role: 'PRODUCER' } });
            }
        }
    } catch (profileError) {
        console.error(`[finalize] Error ensuring SellerProfile for user ${producerId}:`, profileError);
        const message = profileError instanceof Error ? profileError.message : 'Failed to ensure seller profile.';
        return { success: false, error: message };
    }
    // --- Seller Profile Ensured ---

    // 3. Verify Upload Status & Existence (Basic checks)
    if (!finalizeData.previewUploaded || !finalizeData.coverUploaded) {
        console.warn(`Finalization warning for track ${finalizeData.trackId}: Client reported incomplete uploads.`);
    }
    
    try {
        // 4. Find Track and verify ownership
        const track = await prisma.track.findUnique({
            where: {
                id: finalizeData.trackId,
                producerId: producerId, // *** Authorization Check ***
            },
            select: { id: true, tags: true, genres: true, moods: true } // Select existing relations
        });

        if (!track) {
            console.error(`Track not found or user ${producerId} does not own track ${finalizeData.trackId}`);
            return { success: false, error: 'Track not found or permission denied.' };
        }

        // 5. Use Prisma Transaction for atomic updates
        await prisma.$transaction(async (tx) => {
            console.log(`[finalize] Starting transaction for track ${track.id}`);

            // 5a. Create TrackFile records
            // Create MAIN TrackFile (MP3 or WAV based on original filename? For now, assume MP3 if previewUploaded)
            // TODO: Determine FileType more reliably (e.g., from MIME type passed from client)
            const mainFileType = finalizeData.previewStoragePath.toLowerCase().endsWith('.wav') 
                                 ? TrackFileType.MAIN_WAV 
                                 : TrackFileType.MAIN_MP3; 
            const mainAudioFile = await tx.trackFile.create({
                data: {
                    trackId: track.id,
                    fileType: mainFileType, // Use determined type
                    storagePath: finalizeData.previewStoragePath, // Path of the main audio file
                },
                 select: { id: true }
            });
            console.log(`[finalize] Created main audio TrackFile (${mainFileType}): ${mainAudioFile.id}`);

            // Create Cover Image TrackFile
            // TODO: Determine FileType more reliably
            const imageFileType = finalizeData.coverStoragePath.toLowerCase().endsWith('.png') 
                                ? TrackFileType.IMAGE_PNG
                                : finalizeData.coverStoragePath.toLowerCase().endsWith('.webp') 
                                ? TrackFileType.IMAGE_WEBP
                                : TrackFileType.IMAGE_JPEG; // Default to JPEG
            const coverFile = await tx.trackFile.create({
                data: {
                    trackId: track.id,
                    fileType: imageFileType, // Use determined type
                    storagePath: finalizeData.coverStoragePath,
                },
                 select: { id: true }
            });
            console.log(`[finalize] Created cover TrackFile (${imageFileType}): ${coverFile.id}`);

            // 5b. Update Track with Metadata (No FKs needed anymore)
            // Connect Genre/Mood (requires finding/creating them first)
            let genreConnect: Prisma.GenreWhereUniqueInput | undefined;
            if (finalizeData.genre) {
                const genre = await tx.genre.upsert({
                    where: { name: finalizeData.genre },
                    update: {}, // No update needed if found
                    create: { name: finalizeData.genre },
                    select: { id: true }
                });
                if(genre) genreConnect = { id: genre.id };
            }
            let moodConnect: Prisma.MoodWhereUniqueInput | undefined;
            if (finalizeData.mood) {
                const mood = await tx.mood.upsert({
                    where: { name: finalizeData.mood },
                    update: {}, // No update needed if found
                    create: { name: finalizeData.mood },
                    select: { id: true }
                });
                if(mood) moodConnect = { id: mood.id };
            }
            
            // Handle Tags (Connect/Create)
            const tagNames = finalizeData.tags?.split(',').map(t => t.trim()).filter(Boolean) ?? [];
            const tagConnectOrCreateOps = tagNames.map(tagName => ({
                 where: { name: tagName },
                 create: { name: tagName },
             }));

            console.log(`[finalize] Updating track ${track.id} with metadata...`);
            await tx.track.update({
                where: { id: track.id },
                data: {
                    bpm: finalizeData.bpm,
                    key: finalizeData.key,
                    isPublished: true, // Mark as published upon finalization
                    genres: genreConnect 
                        ? { connectOrCreate: { where: { id: genreConnect.id }, create: { name: finalizeData.genre! } } } 
                        : undefined,
                    mood: moodConnect 
                        ? { connectOrCreate: { where: { id: moodConnect.id }, create: { name: finalizeData.mood! } } } 
                        : undefined,
                    tags: {
                        connectOrCreate: tagConnectOrCreateOps,
                        // Optional: disconnect tags not in the new list if needed
                        // set: tagConnectOrCreateOps // Alternative: replaces all tags
                    }
                }
            });
            console.log(`[finalize] Updated track ${track.id} successfully.`);

        }); // --- End Transaction ---

        console.log(`Successfully finalized upload for track ${finalizeData.trackId}`);
        return { success: true };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred during finalization.';
        console.error(`Error finalizing track ${finalizeData.trackId}:`, error);
        // If the transaction failed, DB state should be rolled back.
        // If the error occurred before the transaction, no DB changes were made.
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
    console.log(`[cleanupFailedUpload] Initiating cleanup for track ID: ${trackId}`);

    if (!trackId) {
        console.error("[cleanupFailedUpload] No track ID provided.");
        return { success: false, error: "Track ID is required for cleanup." };
    }

    try {
        // Find the track and its associated files
        const trackToDelete = await prisma.track.findUnique({
            where: { id: trackId },
            select: {
                id: true,
                trackFiles: { // Select associated file records
                    select: { storagePath: true }
                }
            }
        });

        if (!trackToDelete) {
            console.warn(`[cleanupFailedUpload] Track ID ${trackId} not found in database. Assuming already cleaned up or never created properly.`);
            return { success: true }; // Nothing to delete
        }

        // Collect storage paths to delete
        const storagePathsToDelete = trackToDelete.trackFiles
            .map(file => file.storagePath)
            .filter((path): path is string => !!path); // Filter out null/undefined paths

        // Delete storage files if any exist
        if (storagePathsToDelete.length > 0) {
            console.log(`[cleanupFailedUpload] Attempting to delete ${storagePathsToDelete.length} storage files for track ${trackId}:`, storagePathsToDelete);
            try {
                const { error: deleteError } = await supabaseAdmin.storage
                    .from('wavhaven-tracks') // Use your bucket name
                    .remove(storagePathsToDelete);

                if (deleteError) {
                    console.error(`[cleanupFailedUpload] Storage deletion error for track ${trackId}:`, deleteError);
                    // Log error but proceed to delete DB record anyway
                } else {
                    console.log(`[cleanupFailedUpload] Successfully deleted storage files for track ${trackId}.`);
                }
            } catch (storageClientError) {
                console.error(`[cleanupFailedUpload] Error initializing/using storage client for deletion (Track ID ${trackId}):`, storageClientError);
                 // Log error but proceed to delete DB record anyway
            }
        }

        // Delete the track record from the database (Prisma handles cascading deletes for TrackFile)
        await prisma.track.delete({
            where: { id: trackId }
        });

        console.log(`[cleanupFailedUpload] Successfully deleted track record ${trackId} from database.`);
        return { success: true };

    } catch (error) {
        console.error(`[cleanupFailedUpload] Error during cleanup for track ${trackId}:`, error);
        const message = error instanceof Error ? error.message : "An unexpected error occurred during cleanup.";
        return { success: false, error: message };
    }
}
// --- End Cleanup Failed Upload Action --- 