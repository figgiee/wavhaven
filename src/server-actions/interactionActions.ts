'use server';

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/db/prisma';
import { getInternalUserId } from '@/lib/userUtils';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

interface ToggleLikeResult {
    success: boolean;
    error?: string;
    isLiked?: boolean; // The new like state after toggling
    newLikeCount?: number; // The updated like count
}

/**
 * Server Action to toggle the like status for a track by the current user.
 * @param trackId - The ID of the track to like/unlike.
 * @returns Promise<ToggleLikeResult> - Result indicating success, new like state, and count.
 */
export async function toggleLike(trackId: string): Promise<ToggleLikeResult> {
    const { userId: clerkId } = auth();

    if (!clerkId) {
        return { success: false, error: 'Authentication required.' };
    }

    if (!trackId) {
        return { success: false, error: 'Track ID is required.' };
    }

    try {
        const internalUserId = await getInternalUserId(clerkId);
        if (!internalUserId) {
            // This case should be rare if user is authenticated and synced
            return { success: false, error: 'User not found in database.' };
        }

        // Check if the like already exists
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_trackId: { // Use the compound unique index name
                    userId: internalUserId,
                    trackId: trackId,
                },
            },
        });

        let newIsLikedState: boolean;

        if (existingLike) {
            // Like exists, delete it (unlike)
            await prisma.like.delete({
                where: {
                    id: existingLike.id,
                },
            });
            console.log(`[Server Action] User ${internalUserId} unliked track ${trackId}`);
            newIsLikedState = false;
        } else {
            // Like doesn't exist, create it (like)
            await prisma.like.create({
                data: {
                    userId: internalUserId,
                    trackId: trackId,
                },
            });
            console.log(`[Server Action] User ${internalUserId} liked track ${trackId}`);
            newIsLikedState = true;
        }

        // Get the updated like count for the track
        const updatedLikeCount = await prisma.like.count({
            where: { trackId: trackId },
        });

        // Revalidate paths where like counts might be displayed
        revalidatePath('/explore'); // Revalidate explore page as counts might show on cards
        // Ideally, also revalidate the specific track page if slug is available
        // const track = await prisma.track.findUnique({ where: { id: trackId }, select: { slug: true } });
        // if (track?.slug) revalidatePath(`/track/${track.slug}`);

        return {
            success: true,
            isLiked: newIsLikedState,
            newLikeCount: updatedLikeCount,
        };

    } catch (error) {
        console.error(`[Server Action] toggleLike: Error for track ${trackId}:`, error);
        return {
            success: false,
            error: 'An error occurred while updating like status.',
        };
    }
}

// Add other interaction actions here later (e.g., addComment) 