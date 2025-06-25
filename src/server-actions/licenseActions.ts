'use server';

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/db/prisma';
import { LicenseType } from '@prisma/client';
import { z } from 'zod';

// --- Validation Schema ---
const LicenseSchema = z.object({
  trackId: z.string().uuid('Invalid Track ID'),
  licenseId: z.string().uuid('Invalid License ID').optional(), // For updates
  type: z.nativeEnum(LicenseType), 
  name: z.string().min(1, 'License name is required'),
  price: z.coerce.number().positive('Price must be a positive number'),
  description: z.string().optional(),
});

type LicenseInput = z.infer<typeof LicenseSchema>;

// --- Server Action ---

interface LicenseActionResult {
  success: boolean;
  error?: string;
  licenseId?: string;
}

export async function createOrUpdateLicense(input: LicenseInput): Promise<LicenseActionResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: 'User not authenticated.' };
  }

  // Validate input data
  const validationResult = LicenseSchema.safeParse(input);
  if (!validationResult.success) {
    return { success: false, error: validationResult.error.errors.map(e => e.message).join(', ') };
  }
  const { trackId, licenseId, type, name, price, description } = validationResult.data;

  try {
    // Verify producer status AND get internal ID in one go
    const userWithProfile = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      select: { 
        id: true, // Get internal User ID
        sellerProfile: { select: { id: true } } // Check for SellerProfile
      }
    });

    // If no profile or user record, deny access
    if (!userWithProfile?.sellerProfile) {
      return { success: false, error: 'User is not a verified producer.' };
    }
    const internalUserId = userWithProfile.id; // Use this internal ID for ownership check

    // Verify track exists and belongs to this producer
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: { producerId: true }, // Select producerId (which is the internal User ID)
    });

    if (!track) {
      return { success: false, error: 'Track not found.' };
    }

    if (track.producerId !== internalUserId) {
      return { success: false, error: 'User does not own this track.' };
    }

    // Upsert the license
    const licenseData = {
      trackId,
      type,
      name,
      price,
      description,
    };

    const license = await prisma.license.upsert({
      where: {
        id: licenseId ?? '' // Use provided ID for update, empty string won't match for create
      },
      update: licenseData, 
      create: licenseData, 
    });

    return { success: true, licenseId: license.id };

  } catch (error) {
    console.error("Error creating/updating license:", error);
    return { success: false, error: 'Failed to save license data.' };
  }
} 