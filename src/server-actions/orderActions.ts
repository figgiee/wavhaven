'use server';

import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import { getInternalUserId } from '@/lib/userUtils';
import { createSignedUrl } from '@/lib/storage';
import { clerkClient, verifyToken } from '@clerk/nextjs/server';
import type { OrderStatus } from '@prisma/client';
import { stripe } from '@/lib/payments/stripe';

// Define Zod Schema
const downloadSchema = z.object({
  // Assuming trackFileId is a CUID or similar non-empty string.
  // Add .uuid() or .cuid() if you have stricter requirements.
  trackFileId: z.string().uuid({ message: "Invalid Track File ID format." }),
  token: z.string().min(1, { message: "Auth token is required." }),
  suggestedFilename: z.string().optional(),
});

type ActionResponse = 
  | { success: true; url: string } 
  | { success: false; error: string };

/**
 * Generates a secure, time-limited download URL for a purchased track file.
 * Accessible only by authenticated users who have purchased a license for the track.
 * 
 * @param input Object containing trackFileId, token, and optional suggestedFilename.
 * @returns Object with success status and URL or error message.
 */
export async function generateDownloadUrl(
  input: { trackFileId: string; token: string; suggestedFilename?: string } // Update input type
): Promise<ActionResponse> {
  
  // Validate input using Zod
  const validationResult = downloadSchema.safeParse(input);

  if (!validationResult.success) {
    const errors = validationResult.error.flatten().fieldErrors;
    const firstError = errors.trackFileId?.[0] || 'Invalid input data.';
    return { success: false, error: firstError };
  }
  
  // Use validated data from Zod result
  const { trackFileId, token, suggestedFilename } = validationResult.data;

  // 1. Verify Token & Get User ID
  let clerkUserId: string | null = null;
  try {
    // Use CLERK_SECRET_KEY from environment variables for verification
    const claims = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      // You might need to add other options like authorizedParties if required by your setup
    });

    if (claims && claims.sub) {
      clerkUserId = claims.sub; // 'sub' usually holds the user ID
    } else {
      return { success: false, error: 'Authentication failed: Invalid token claims.' };
    }
  } catch (error) {
    console.error("[generateDownloadUrl] Token verification failed:", error);
    return { success: false, error: 'Authentication failed: Token verification error.' };
  }
  
  if (!clerkUserId) {
    // This case should ideally be caught by the try-catch or claims check above
    return { success: false, error: 'Authentication failed: User ID not found in token.' };
  }

  // 2. Get Internal User ID
  const internalUserId = await getInternalUserId(clerkUserId);
  if (!internalUserId) {
    return { success: false, error: 'User not found.' };
  }

  try {
    // 3. Verify Purchase
    // Find the trackId associated with the requested trackFileId
    const trackFile = await prisma.trackFile.findUnique({
      where: { id: trackFileId },
      select: { trackId: true, storagePath: true },
    });

    if (!trackFile) {
      return { success: false, error: 'Track file not found.' };
    }

    // Check if a UserDownloadPermission record exists for this user and track.
    // This is the correct and efficient way to verify access.
    const permission = await prisma.userDownloadPermission.findFirst({
      where: {
        userId: internalUserId,
        trackId: trackFile.trackId,
        // Optionally, you could add a check on the order status if needed,
        // but the existence of the permission should imply a completed order.
        order: {
          status: 'COMPLETED'
        }
      },
      select: { id: true }, // We only need to know if the record exists.
    });

    if (!permission) {
      return { success: false, error: 'You do not have permission to download this file. Please purchase a license.' };
    }

    // 4. Generate Signed URL (Purchase verified)
    const signedUrl = await createSignedUrl(trackFile.storagePath, undefined, suggestedFilename || true);

    return { success: true, url: signedUrl };

  } catch (error: unknown) {
    console.error(`Error generating download URL for trackFileId ${trackFileId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    // Check for Prisma validation error specifically
    if (error instanceof Prisma.PrismaClientValidationError) {
        console.error("Prisma Validation Error details:", error); // Log the full validation error
        return { success: false, error: `Database query error. Please check server logs.` }; // More generic client message
    }
    return { success: false, error: `Failed to generate download link: ${errorMessage}` };
  }
} 