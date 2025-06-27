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

const DeleteLicenseSchema = z.object({
  licenseId: z.string().uuid('Invalid License ID'),
});

type LicenseInput = z.infer<typeof LicenseSchema>;

// --- Helper Function ---

/**
 * Recalculates and updates the minPrice on a track based on its current licenses.
 * @param trackId The ID of the track to update.
 */
async function updateTrackMinPrice(trackId: string) {
  const licenses = await prisma.license.findMany({
    where: { trackId: trackId },
    select: { price: true },
  });

  let minPrice: number | null = null;
  if (licenses.length > 0) {
    minPrice = Math.min(...licenses.map(l => l.price));
  }
  
  await prisma.track.update({
    where: { id: trackId },
    data: { minPrice },
  });
}

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

    // After upsert, update the track's minPrice
    await updateTrackMinPrice(trackId);

    return { success: true, licenseId: license.id };

  } catch (error) {
    console.error("Error creating/updating license:", error);
    return { success: false, error: 'Failed to save license data.' };
  }
}

export async function deleteLicense(input: { licenseId: string }): Promise<Omit<LicenseActionResult, 'licenseId'>> {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
        return { success: false, error: 'User not authenticated.' };
    }

    const validationResult = DeleteLicenseSchema.safeParse(input);
    if (!validationResult.success) {
        return { success: false, error: validationResult.error.errors.map(e => e.message).join(', ') };
    }
    const { licenseId } = validationResult.data;

    try {
        const userWithProfile = await prisma.user.findUnique({
            where: { clerkId: clerkId },
            select: { id: true, sellerProfile: { select: { id: true } } }
        });

        if (!userWithProfile?.sellerProfile) {
            return { success: false, error: 'User is not a verified producer.' };
        }
        const internalUserId = userWithProfile.id;

        const license = await prisma.license.findUnique({
            where: { id: licenseId },
            select: { track: { select: { producerId: true, id: true } } }
        });

        if (!license) {
            return { success: false, error: 'License not found.' };
        }

        if (license.track.producerId !== internalUserId) {
            return { success: false, error: 'User does not own this license.' };
        }

        await prisma.license.delete({
            where: { id: licenseId },
        });

        // After deleting, update the track's minPrice
        await updateTrackMinPrice(license.track.id);

        return { success: true };

    } catch (error) {
        console.error("Error deleting license:", error);
        return { success: false, error: 'Failed to delete license.' };
    }
} 