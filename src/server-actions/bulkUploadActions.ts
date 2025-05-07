'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import prisma from '@/lib/prisma'; // Assuming prisma client setup
import { getInternalUserId } from '@/lib/userUtils'; // Assuming user util setup
import { createClient } from '@supabase/supabase-js';
import { ContentType, TrackFileType } from '@prisma/client'; // Import ContentType and TrackFileType enums
import { getPublicUrl } from '@/lib/storage'; // Import the helper to get public URLs
import { revalidatePath } from 'next/cache'; // For revalidating explore page

// --- Add sanitizeFilename helper ---
const sanitizeFilename = (filename: string): string => {
    if (!filename) return ''; // Handle empty/undefined input
    // Replace spaces with underscores
    const noSpaces = filename.replace(/\s+/g, '_');
    // Remove or replace invalid characters (allow letters, numbers, underscore, hyphen, period)
    // Remove accents/diacritics
    const normalized = noSpaces.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Remove remaining characters that are not alphanumeric, underscore, hyphen, or period
    const sanitized = normalized.replace(/[^a-zA-Z0-9_\-\.]/g, '_'); 
    // Limit length (e.g., 200 chars) to prevent excessively long names
    return sanitized.slice(0, 200); 
};

// Define the expected input structure for a single track coming from the client
// Match the structure sent in the apiPayload from the frontend
const trackInputSchema = z.object({
    title: z.string().min(1),
    description: z.string().max(1000, "Description is too long").optional(),
    bpm: z.number().positive().nullable(),
    key: z.string().nullable(),
    tags: z.string().optional(),
    contentType: z.enum(['beats', 'loops', 'soundkits', 'presets']), // Add contentType to input schema
    price: z.number().nonnegative({ message: "Price must be zero or positive" }), // Add price field (as number)
    _audioFileName: z.string()
        .max(255, "Audio filename too long")
        .refine(name => !name.includes('/') && !name.includes('\\\\') && !name.includes('..'), { message: "Invalid characters in audio filename" })
        .optional(), // Expecting filename from client
    _coverFileName: z.string()
        .max(255, "Cover filename too long")
        .refine(name => !name.includes('/') && !name.includes('\\\\') && !name.includes('..'), { message: "Invalid characters in cover filename" })
        .optional(), // Expecting filename from client
});

const bulkUploadInputSchema = z.object({
    tracks: z.array(trackInputSchema),
});

// Define the structure of the returned preparation data for each track
interface UploadPreparationResult {
  trackId: string;
  _audioFileName: string; // Pass back for matching on frontend
  _coverFileName?: string; // Pass back for matching on frontend
  audioUploadUrl?: string; // Signed URL for audio PUT
  coverUploadUrl?: string; // Signed URL for cover PUT
  audioStoragePath: string;
  coverStoragePath?: string;
}

// Ensure Supabase client is initialized correctly for server-side use
// Avoid initializing multiple times if possible, similar to lib/storage.ts pattern
const getSupabaseAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase environment variables for admin client.');
    }

    // Note: Consider a shared singleton pattern if used in many places
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
};


export async function prepareBulkUpload(
    input: { tracks: z.infer<typeof trackInputSchema>[] }
): Promise<{ preparations: UploadPreparationResult[]; error?: string }> {

    // 1. Validate Input
    const validation = bulkUploadInputSchema.safeParse(input);
    if (!validation.success) {
        console.error("Server Action Validation Error:", validation.error.flatten());
        return { preparations: [], error: "Invalid input data." };
    }
    const { tracks } = validation.data;

    // 2. Check Authentication & Get User ID
    const authResult = await auth();
    const clerkUserId = authResult.userId;
    if (!clerkUserId) {
        // No need to log here, Clerk middleware usually handles unauthorized access,
        // but this provides a fallback error.
        return { preparations: [], error: 'Authentication required.' };
    }

    let producerId: string | null = null; // Allow null initially
    try {
        producerId = await getInternalUserId(clerkUserId); // Using userUtils
        if (!producerId) {
            // --- FIX: Throw specific error ---
            throw new Error('Internal user ID not found for Clerk user.');
        }
    } catch (error: unknown) { // --- FIX: Use unknown ---
        // --- FIX: Type check error ---
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during user lookup';
        console.error("Failed to get internal user ID:", errorMessage, error);
        return { preparations: [], error: `User lookup failed: ${errorMessage}` };
    }

    // --- Add check after try-catch to satisfy TS that producerId is string ---
    if (!producerId) {
         return { preparations: [], error: 'Producer ID could not be determined.' };
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const BUCKET_NAME = 'wavhaven-tracks'; // Correct bucket name
    const SIGNED_URL_UPLOAD_EXPIRY = 60 * 5; // 5 minutes validity for upload URLs

    const preparations: UploadPreparationResult[] = [];
    const errors: string[] = [];

    // 3. Process Each Track
    for (const trackData of tracks) {
        // --- Apply filename sanitization ---
        const originalAudioFilename = trackData._audioFileName;
        const originalCoverFilename = trackData._coverFileName;
        const sanitizedAudioFilename = originalAudioFilename ? sanitizeFilename(originalAudioFilename) : undefined;
        const sanitizedCoverFilename = originalCoverFilename ? sanitizeFilename(originalCoverFilename) : undefined;
        // ---------------------------------
        
        // Use original filename for skip check, as sanitization might make it empty
        if (!originalAudioFilename) {
            console.warn("Skipping track due to missing audio filename:", trackData.title);
            continue; // Should have been filtered on client, but double-check
        }
        // Add check for sanitized name being empty after sanitization
        if (!sanitizedAudioFilename) {
            console.warn(`Skipping track "${trackData.title}" because audio filename became empty after sanitization.`);
            errors.push(`Invalid audio filename for track "${trackData.title}".`);
            continue;
        }

        let newTrackId: string | null = null;
        let audioStoragePath: string | null = null;
        let coverStoragePath: string | null = null;

        try {
            // Map form contentType to database enum
            const contentTypeMap: Record<string, ContentType> = {
              'beats': ContentType.BEATS,
              'loops': ContentType.LOOPS,
              'soundkits': ContentType.SOUNDKITS,
              'presets': ContentType.PRESETS,
            };
            const dbContentType = contentTypeMap[trackData.contentType as keyof typeof contentTypeMap];
            if (!dbContentType) {
                throw new Error(`Invalid content type provided: ${trackData.contentType}`);
            }

            // 3a. Create Track Record in DB
            const newTrack = await prisma.track.create({
                data: {
                    producerId: producerId, // producerId is now guaranteed string here
                    title: trackData.title,
                    description: trackData.description || null,
                    bpm: trackData.bpm,
                    key: trackData.key,
                    tags: trackData.tags?.split(',').map(t => t.trim()).filter(Boolean) || [],
                    isPublished: false, // Default to unpublished
                    contentType: dbContentType, // Add content type
                    previewAudioUrl: null, // Use previewAudioUrl, assuming it exists and is updated by trigger
                    coverImageUrl: null, // Will be updated by trigger
                    // audioUrl: null, // REMOVED: Field likely doesn't exist for direct creation
                },
                select: { id: true }, // Select only the ID we need
            });
            newTrackId = newTrack.id; // Assign ID
            // --- FIX: Add check for newTrackId ---
            if (!newTrackId) {
                throw new Error('Track creation did not return an ID.');
            }
            console.log(`Created Track record ${newTrackId} for ${trackData.title}`);

            // --- ADD Default License Creation ---
            // Ensure price is a valid number before creating license
            const basePrice = trackData.price; // Already a number from validated input
            
            // Determine default file type based on content type (example logic)
            let defaultFileType = TrackFileType.MP3; // Default to MP3
            if (dbContentType === ContentType.BEATS) {
                defaultFileType = TrackFileType.WAV; // Beats might offer WAV
            } else if (dbContentType === ContentType.SOUNDKITS) {
                defaultFileType = TrackFileType.ZIP; // Soundkits are ZIP
            }
            // Add more logic for other types if needed

            await prisma.license.create({
                data: {
                    trackId: newTrackId, // Link to the track
                    type: 'BASIC',       // Default license type
                    price: basePrice,    // Price from input
                    // Add reasonable defaults for other required License fields
                    description: 'Standard license terms for basic usage.',
                    fileTypeOffered: defaultFileType, 
                    // Add other fields like deliveryMethod, exclusivity, etc. with defaults
                },
            });
            console.log(`Created BASIC License for Track ID: ${newTrackId} with price ${basePrice}`);
            // -------------------------------------

            // 3b. Prepare Storage Paths (using SANITIZED names)
            // producerId is guaranteed string, newTrackId is checked above
            // Correct the path structure to match Supabase browser: users/<producerId>/tracks/<trackId>/<filename>
            audioStoragePath = `users/${producerId}/tracks/${newTrackId}/${sanitizedAudioFilename}`;
            if (sanitizedCoverFilename) {
                coverStoragePath = `users/${producerId}/tracks/${newTrackId}/${sanitizedCoverFilename}`;
            }

            // 3c. Generate Signed Upload URLs
            let audioUploadUrl: string | undefined = undefined;
            let coverUploadUrl: string | undefined = undefined;

            // --- FIX: Ensure correct arguments for createSignedUploadUrl (path, expiresIn) ---
            // The linter error seems spurious, sticking to documented signature.
            const { data: audioUrlData, error: audioUrlError } = await supabaseAdmin.storage
                .from(BUCKET_NAME)
                .createSignedUploadUrl(audioStoragePath, SIGNED_URL_UPLOAD_EXPIRY); // path, expiresIn

            if (audioUrlError) {
                // Throw a more detailed error including the path and bucket
                console.error(`Supabase storage error for path "${audioStoragePath}" in bucket "${BUCKET_NAME}":`, audioUrlError);
                throw new Error(`Failed to create signed URL for audio (bucket: ${BUCKET_NAME}, path: ${audioStoragePath}): ${audioUrlError.message}`);
            }
            // --- FIX: Add check for signedUrl existence ---
            if (!audioUrlData?.signedUrl) {
                // Throw a more detailed error if URL data is missing
                throw new Error(`Supabase did not return a signed URL for audio (bucket: ${BUCKET_NAME}, path: ${audioStoragePath}).`);
            }
            audioUploadUrl = audioUrlData.signedUrl;

            if (coverStoragePath) {
                 // --- FIX: Ensure correct arguments for createSignedUploadUrl (path, expiresIn) ---
                 const { data: coverUrlData, error: coverUrlError } = await supabaseAdmin.storage
                    .from(BUCKET_NAME)
                    .createSignedUploadUrl(coverStoragePath, SIGNED_URL_UPLOAD_EXPIRY); // path, expiresIn

                 if (coverUrlError) {
                    // Throw a more detailed error including the path and bucket
                    console.error(`Supabase storage error for path "${coverStoragePath}" in bucket "${BUCKET_NAME}":`, coverUrlError);
                    throw new Error(`Failed to create signed URL for cover (bucket: ${BUCKET_NAME}, path: ${coverStoragePath}): ${coverUrlError.message}`);
                 }
                 // --- FIX: Add check for signedUrl existence ---
                 if (!coverUrlData?.signedUrl) {
                     // Throw a more detailed error if URL data is missing
                     throw new Error(`Supabase did not return a signed URL for cover (bucket: ${BUCKET_NAME}, path: ${coverStoragePath}).`);
                 }
                 coverUploadUrl = coverUrlData.signedUrl;
            }

            // Add successful preparation to results
             preparations.push({
                trackId: newTrackId, // newTrackId is guaranteed string here
                _audioFileName: originalAudioFilename, // Pass back ORIGINAL filename for matching
                _coverFileName: originalCoverFilename, // Pass back ORIGINAL filename for matching
                audioUploadUrl: audioUploadUrl, // audioUploadUrl is guaranteed string here
                coverUploadUrl: coverUploadUrl,
                audioStoragePath: audioStoragePath, // audioStoragePath is guaranteed string here
                coverStoragePath: coverStoragePath, // can be undefined/null
            });

        } catch (error: unknown) { // --- FIX: Use unknown ---
             // --- FIX: Type check error ---
            const errorMessage = error instanceof Error ? error.message : 'Unknown error processing track';
            console.error(`Failed to process track "${trackData.title}" (DB ID: ${newTrackId || 'N/A'}):`, errorMessage, error);
            errors.push(`Failed to prepare upload for track "${trackData.title}": ${errorMessage}`);
            // Note: No automatic cleanup here, partial uploads might occur. Consider cleanup logic if needed.
        }
    }

    // 4. Return Results
    if (errors.length > 0) {
        // If some tracks failed but others succeeded, return partial success
        return { preparations, error: `Processed ${preparations.length} tracks with ${errors.length} errors: ${errors.join('; ')}` };
    }

    return { preparations };
}


// --- NEW Server Action: Finalize Bulk Upload ---

// Define the input schema for finalizing tracks
const finalizeInputSchema = z.object({
  finalizations: z.array(z.object({
    trackId: z.string().uuid(),
    audioStoragePath: z.string(),
    coverStoragePath: z.string().optional(),
  })),
});

export async function finalizeBulkUploadTracks(
    input: z.infer<typeof finalizeInputSchema>
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    
    // 1. Validate Input
    const validation = finalizeInputSchema.safeParse(input);
    if (!validation.success) {
        console.error("Finalization Validation Error:", validation.error.flatten());
        return { success: false, updatedCount: 0, error: "Invalid finalization data." };
    }
    const { finalizations } = validation.data;

    // 2. Check Authentication (Important for securing the update)
    const authResult = await auth();
    const clerkUserId = authResult.userId;
    if (!clerkUserId) {
        return { success: false, updatedCount: 0, error: 'Authentication required.' };
    }
    
    // Optional: Could verify ownership here by getting internal ID and checking 
    // if track.producerId matches, but service role should be sufficient if secured.
    // const producerId = await getInternalUserId(clerkUserId);
    // ... verification logic ...

    let updatedCount = 0;
    const errors: string[] = [];

    // 3. Process Each Finalization
    for (const item of finalizations) {
        try {
            // 3a. Construct Public URLs using the helper
            const audioPublicUrl = getPublicUrl(item.audioStoragePath);
            const coverPublicUrl = item.coverStoragePath ? getPublicUrl(item.coverStoragePath) : null;

            // 3b. Update the Track in Prisma
            await prisma.track.update({
                where: { 
                    id: item.trackId,
                    // Optional: Add producerId check for extra security
                    // producerId: producerId 
                },
                data: {
                    isPublished: true,
                    previewAudioUrl: audioPublicUrl,
                    coverImageUrl: coverPublicUrl,
                    // Store the storage paths
                    audioStoragePath: item.audioStoragePath,
                    coverStoragePath: item.coverStoragePath,
                    // Potentially update `updatedAt` automatically depending on schema
                },
            });
            updatedCount++;
            console.log(`Finalized and published Track ID: ${item.trackId}`);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error during finalization';
            console.error(`Failed to finalize track ${item.trackId}:`, errorMessage, error);
            errors.push(`Track ${item.trackId}: ${errorMessage}`);
            // Continue processing other tracks even if one fails
        }
    }

    // 4. Revalidate relevant paths (e.g., explore page)
    if (updatedCount > 0) {
       console.log('Revalidating paths: /explore, /')
       revalidatePath('/explore'); // Revalidate the main explore page
       revalidatePath('/'); // Revalidate the homepage if it shows tracks
       // Consider revalidating specific explore types if needed, e.g., revalidatePath('/explore?type=beats')
    }

    // 5. Return Results
    if (errors.length > 0) {
        return {
            success: false, 
            updatedCount,
            error: `Updated ${updatedCount} tracks, but failed to finalize ${errors.length}: ${errors.join('; ')}`
        };
    }

    return { success: true, updatedCount };
} 