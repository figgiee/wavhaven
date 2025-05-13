'use server';

import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";

export const getUserProfileByUsername = async (username: string) => {
  console.log(`[Server Action] Fetching profile for username: ${username}`);
  try {
    const user = await prisma.user.findUnique({
      where: {
        username: username,
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profileImageUrl: true,
        createdAt: true,
        sellerProfile: {
          select: {
            bio: true,
            bannerImageUrl: true,
            isVerified: true,
            // Add other desired public fields like location, website etc. if needed
          },
        },
      },
    });

    if (!user) {
      console.log(`[Server Action] User not found: ${username}`);
      return null; // User not found
    }

    console.log(`[Server Action] Found user: ${username}`, user);
    // Prisma returns null for the relation if not found, 
    // so user object structure is consistent whether SellerProfile exists or not.
    return user;

  } catch (error) {
    console.error(`[Server Action] Error fetching profile for ${username}:`, error);
    // Depending on requirements, you might throw the error or return null/specific error object
    // Returning null for simplicity, align with not found case
    return null;
  }
};

interface GetUserTracksOptions {
  page?: number;
  pageSize?: number;
}

export const getUserTracksByUsername = async (
  username: string,
  options: GetUserTracksOptions = {}
) => {
  const { page = 1, pageSize = 12 } = options; // Default page size, e.g., 12

  console.log(`[Server Action] Fetching tracks for username: ${username}, page: ${page}, pageSize: ${pageSize}`);

  try {
    // 1. Find the user by username to get their ID
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      console.log(`[Server Action] User not found for tracks query: ${username}`);
      return []; // Return empty array if user doesn't exist
    }

    // 2. Fetch the user's published tracks with pagination
    const tracksData = await prisma.track.findMany({
      where: {
        producerId: user.id,
        isPublished: true, // Assuming `isPublished` field exists based on T6/T33
        // isApproved: true, // Consider adding if moderation (T28) is implemented
      },
      include: {
        // Include necessary relations for BeatCard (adjust as needed)
        producer: {
          select: { username: true, profileImageUrl: true }, // Example
        },
        licenses: {
          select: { price: true, type: true }, // Example
          orderBy: { price: 'asc' },
        },
        // Add other relations if BeatCard needs them (e.g., coverImage)
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: 'desc', // Order by newest first
      },
    });

    console.log(`[Server Action] Found ${tracksData.length} tracks for ${username}`);
    
    // Convert Decimal prices to numbers for each license
    const tracksWithConvertedPrices = tracksData.map(track => ({
      ...track,
      licenses: track.licenses.map(license => ({
        ...license,
        price: Number(license.price), // Convert Decimal to number
      })),
    }));

    return tracksWithConvertedPrices;

  } catch (error) {
    console.error(`[Server Action] Error fetching tracks for ${username}:`, error);
    return []; // Return empty array on error
  }
}; 