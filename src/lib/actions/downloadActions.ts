'use server';

// Remove direct auth import, use clerkClient and verifyToken
// import { auth } from '@clerk/nextjs/server'; 
import { clerkClient, verifyToken } from '@clerk/nextjs/server'; // Use server imports
import prisma from "@/lib/db/prisma";
import { getInternalUserId } from '@/lib/userUtils';
import type { TrackFile } from '@prisma/client';
import { createSignedUrl } from '@/lib/storage'; // <-- Import createSignedUrl

// Define the return type for the Server Action
interface DownloadableItem {
  orderId: string;
  trackId: string;
  licenseId: string;
  trackTitle: string;
  trackCoverUrl?: string | null;
  licenseName: string;
  trackFiles: { id: string; fileType: string; fileName: string; storagePath: string }[];
}

interface FetchDownloadsResult {
  downloads?: DownloadableItem[];
  error?: string;
}

// Helper function to get extension from TrackFileType
function getExtensionForFileType(fileType: string, storagePath: string): string { // Added storagePath for fallback
  switch (fileType) {
    case 'PREVIEW_MP3':
    case 'MAIN_MP3':
      return '.mp3';
    case 'MAIN_WAV':
      return '.wav';
    case 'STEMS_ZIP':
      return '.zip';
    case 'IMAGE_JPEG':
      return '.jpeg';
    case 'IMAGE_PNG':
      return '.png';
    case 'IMAGE_WEBP':
      return '.webp';
    default: {
      const nameFromPath = storagePath.split('/').pop() || '';
      if (nameFromPath.includes('.')) {
          const parts = nameFromPath.split('.');
          if (parts.length > 1) return '.' + parts.pop();
      }
      return '.dat';
    }
  }
}

// Define the core logic for fetching and mapping permissions (corrected query)
async function getAndMapDownloads(userId: string): Promise<DownloadableItem[]> {
  console.log(`[Server Action] Fetching downloads for internal user ID: ${userId}`);
  try {
    const permissions = await prisma.userDownloadPermission.findMany({
      where: { userId: userId },
      select: {
        orderId: true,
        trackId: true,
        orderItem: {
          select: {
            license: {
              select: {
                id: true,
                name: true,
                filesIncluded: true
              }
            }
          }
        },
        track: {
          select: {
            title: true,
            coverImageFileId: true,
            trackFiles: { 
              select: {
                id: true,
                fileType: true,
                storagePath: true
              },
              orderBy: { fileType: 'asc' }
            }
          }
        },
      },
      orderBy: {
        order: { createdAt: 'desc' }
      }
    });

    console.log(`[Server Action] Found ${permissions.length} download permissions.`);

    // Use Promise.all to handle async URL generation within the map
    const downloads = await Promise.all(permissions.map(async (p) => { // <-- Make map callback async
      const license = p.orderItem?.license;
      const allowedFileTypes = license?.filesIncluded || [];
      const availableFiles = p.track?.trackFiles || [];
      
      const downloadableFiles = availableFiles
        .filter(tf => allowedFileTypes.includes(tf.fileType))
        .map(tf => {
          const trackTitle = p.track?.title || 'track';
          // Sanitize track title to be filename-friendly
          const sanitizedTrackTitle = trackTitle.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
          const extension = getExtensionForFileType(tf.fileType, tf.storagePath);
          
          return {
            ...tf,
            // Construct filename: e.g., "Class_1.mp3"
            fileName: `${sanitizedTrackTitle}${extension}` 
          };
        });

      // --- Generate Cover URL --- 
      let coverUrl: string | null = null;
      if (p.track?.coverImageFileId) {
        try {
          const coverFile = await prisma.trackFile.findUnique({
            where: { id: p.track.coverImageFileId },
            select: { storagePath: true },
          });
          if (coverFile?.storagePath) {
            // Generate a URL for viewing (expires in 1 hour, no download disposition)
            coverUrl = await createSignedUrl(coverFile.storagePath, 3600, false); 
          }
        } catch (urlError) {
          console.error(`Error generating cover URL for track ${p.trackId}:`, urlError);
          // Keep coverUrl as null if generation fails
        }
      }
      // --- End Generate Cover URL ---

      return {
        orderId: p.orderId,
        trackId: p.trackId,
        licenseId: license?.id || 'unknown-license',
        trackTitle: p.track?.title || 'Unknown Track',
        trackCoverUrl: coverUrl, // <-- Use generated URL
        licenseName: license?.name || 'Unknown License',
        trackFiles: downloadableFiles,
      };
    })); // <-- Close Promise.all

    return downloads;
  } catch (error) {
    console.error(`[Server Action] Error fetching download permissions for user ${userId}:`, error);
    const prismaError = error as { code?: string; message?: string };
    if (prismaError?.code === 'P2021' || prismaError?.message?.includes('relation "UserDownloadPermission" does not exist')) {
      console.warn('[Server Action] UserDownloadPermission table not found. Returning empty array.');
      return [];
    }
    throw error;
  }
}

// Define the Server Action - Now accepts a token
export async function fetchUserDownloads(token: string | null): Promise<FetchDownloadsResult> {
  console.log("[Server Action] fetchUserDownloads called with token.");
  try {
    if (!token) {
        console.warn("[Server Action] No token provided.");
        return { error: "Authentication token missing." };
    }

    let clerkUserId: string | null = null;
    try {
      // Verify the token passed from the client
      const decoded = await verifyToken(token, {
          // issuer: `https://your-issuer-url`, // Add issuer if configured
          // audience: `your-audience`, // Add audience if configured
          jwtKey: process.env.CLERK_JWT_KEY, // Make sure this is set in .env
      });
      clerkUserId = decoded.sub; // Get user ID from 'sub' claim
      if (!clerkUserId) {
          throw new Error("Clerk User ID (sub) not found in token payload.");
      }
      console.log(`[Server Action] Token verified successfully. Clerk User ID: ${clerkUserId}`);

      // Optional: Double check with clerkClient if needed, though verifyToken should suffice
      // const user = await clerkClient.users.getUser(clerkUserId);
      // console.log(`[Server Action] Verified user via clerkClient: ${user.id}`);

    } catch (error) {
      console.error("[Server Action] Token verification failed:", error);
      return { error: "Invalid or expired authentication session." };
    }

    // Proceed with the validated clerkUserId
    console.log(`[Server Action] Using verified Clerk User ID: ${clerkUserId}`);
    let internalUserId: string | null = null;
    try {
      internalUserId = await getInternalUserId(clerkUserId);
      if (!internalUserId) {
         console.error(`[Server Action] Failed to get internal user ID for Clerk ID: ${clerkUserId}`);
         return { error: "Failed to retrieve user profile." };
      }
      console.log(`[Server Action] Mapped internal user ID: ${internalUserId}`);
    } catch (error) {
      console.error("[Server Action] Error getting internal user ID:", error);
      return { error: "Error retrieving user profile details." };
    }

    const downloads = await getAndMapDownloads(internalUserId);
    console.log(`[Server Action] Returning ${downloads.length} downloads.`);
    return { downloads };

  } catch (error) {
    console.error("[Server Action] Unexpected error in fetchUserDownloads:", error);
    return { error: "An unexpected error occurred while fetching downloads." };
  }
} 