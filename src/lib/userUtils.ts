import { supabaseAdmin } from './supabase/admin'; // Import the admin client
import clerkClient from '@clerk/nextjs/server';
import prisma from './db/prisma';

export async function getInternalUserId(clerkId: string | null | undefined): Promise<string | null> {
  console.log(`[userUtils] getInternalUserId called with clerkId: ${clerkId}`);

  if (!clerkId) {
    console.warn("[userUtils] Aborting: clerkId is null or undefined.");
    return null;
  }

  // Log the Supabase URL being used by the admin client (optional)
  // console.log(`[getInternalUserId] Using Supabase URL: ${supabaseAdmin.supabaseUrl}`);

  // console.log(`[getInternalUserId] Attempting Supabase query for clerkId: ${clerkId}`);

  // --- REMOVE TEMPORARY DIAGNOSTIC LOG ---
  // console.log(`[getInternalUserId] supabaseAdmin object exists: ${!!supabaseAdmin}`);
  // -------------------------------------

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      select: { id: true },
    });

    if (user) {
      console.log(`[userUtils] Found user with ID: ${user.id}`);
      return user.id;
    } else {
      console.warn(`[userUtils] No user found with clerkId: ${clerkId}`);
      return null;
    }
  } catch (e) {
    console.error(`[userUtils] An unexpected error occurred in getInternalUserId:`, e instanceof Error ? e.message : String(e));
    // console.log("--- Exiting getInternalUserId (Supabase Client) ---"); // Moved exit log here
    return null;
  }
}

/**
 * Checks if one user is following another.
 * @param followerId The ID of the user who might be following.
 * @param followingId The ID of the user who might be followed.
 * @returns A boolean indicating the follow status.
 */
export async function isFollowingUser(followerId: string, followingId: string): Promise<boolean> {
    if (followerId === followingId) return false; // Can't follow yourself

    const follow = await prisma.follows.findUnique({
        where: {
            followerId_followingId: {
                followerId,
                followingId,
            },
        },
    });

    return !!follow;
}