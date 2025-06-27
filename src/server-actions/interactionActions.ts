'use server';

import { currentUser, auth } from '@clerk/nextjs/server';
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
    const user = await currentUser();
    if (!user?.id) {
        return { success: false, error: 'Authentication required.' };
    }
    const clerkId = user.id;

    if (!trackId) {
        return { success: false, error: 'Track ID is required.' };
    }

    try {
        let internalUserId = await getInternalUserId(clerkId);

        if (!internalUserId) {
            console.warn(`[toggleLike] User not found locally, creating new user for clerkId: ${clerkId}`);
            try {
                const newUser = await prisma.user.create({
                    data: {
                        clerkId: clerkId,
                        email: user.emailAddresses[0]?.emailAddress,
                        username: user.username,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        profileImageUrl: user.imageUrl,
                    },
                });
                internalUserId = newUser.id;
                console.log(`[toggleLike] Created new user with internal ID: ${internalUserId}`);
            } catch (error) {
                console.error('[toggleLike] Error creating new user:', error);
                return { success: false, error: 'Failed to create user profile for like action.' };
            }
        }
        
        // Now that we're guaranteed to have an internalUserId, proceed with toggle logic.
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_trackId: { // Use the compound unique index name
                    userId: internalUserId,
                    trackId: trackId,
                },
            },
        });

        let newIsLikedState: boolean;

        const updatedTrack = await prisma.$transaction(async (tx) => {
            if (existingLike) {
                // Like exists, delete it and decrement count
                await tx.like.delete({
                    where: { id: existingLike.id },
                });
                newIsLikedState = false;
                return await tx.track.update({
                    where: { id: trackId },
                    data: { likeCount: { decrement: 1 } },
                    select: { likeCount: true },
                });
            } else {
                // Like doesn't exist, create it and increment count
                await tx.like.create({
                    data: {
                        userId: internalUserId,
                        trackId: trackId,
                    },
                });
                newIsLikedState = true;
                return await tx.track.update({
                    where: { id: trackId },
                    data: { likeCount: { increment: 1 } },
                    select: { likeCount: true },
                });
            }
        });

        return {
            success: true,
            isLiked: newIsLikedState,
            newLikeCount: updatedTrack.likeCount,
        };

    } catch (error) {
        console.error(`[Server Action] toggleLike: Error for track ${trackId}:`, error);
        return {
            success: false,
            error: 'An error occurred while updating like status.',
        };
    }
}

const addCommentSchema = z.object({
    trackId: z.string().uuid(),
    content: z.string().min(1, "Comment cannot be empty.").max(1000, "Comment is too long."),
});

export async function addComment(input: z.infer<typeof addCommentSchema>) {
    'use server';
    const validation = addCommentSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: validation.error.flatten().fieldErrors.content?.[0] || 'Invalid input.' };
    }
    
    const { userId: clerkId } = auth();
    if (!clerkId) {
        return { success: false, error: 'Authentication required.' };
    }
    
    try {
        const internalUserId = await getInternalUserId(clerkId);
        if (!internalUserId) {
            return { success: false, error: 'User not found.' };
        }

        const { trackId, content } = validation.data;

        await prisma.$transaction([
            prisma.comment.create({
                data: {
                    content,
                    userId: internalUserId,
                    trackId: trackId,
                },
            }),
            prisma.track.update({
                where: { id: trackId },
                data: { commentCount: { increment: 1 } },
            }),
        ]);

        const track = await prisma.track.findUnique({ where: { id: trackId }, select: { slug: true } });
        if (track?.slug) {
            revalidatePath(`/track/${track.slug}`);
        }
        
        return { success: true };

    } catch (error) {
        console.error(`Error adding comment for track ${input.trackId}:`, error);
        return { success: false, error: 'An error occurred while posting the comment.' };
    }
}

export async function deleteComment(commentId: string) {
    'use server';
    
    if (!commentId) {
        return { success: false, error: 'Comment ID is required.' };
    }

    const { userId: clerkId } = auth();
    if (!clerkId) {
        return { success: false, error: 'Authentication required.' };
    }

    try {
        const internalUserId = await getInternalUserId(clerkId);
        if (!internalUserId) {
            return { success: false, error: 'User not found.' };
        }

        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            select: { userId: true, trackId: true },
        });

        if (!comment) {
            return { success: false, error: 'Comment not found.' };
        }

        // Add admin check later if needed
        if (comment.userId !== internalUserId) {
            return { success: false, error: 'Permission denied.' };
        }

        await prisma.$transaction([
            prisma.comment.delete({ where: { id: commentId } }),
            prisma.track.update({
                where: { id: comment.trackId },
                data: { commentCount: { decrement: 1 } },
            }),
        ]);

        const track = await prisma.track.findUnique({ where: { id: comment.trackId }, select: { slug: true } });
        if (track?.slug) {
            revalidatePath(`/track/${track.slug}`);
        }

        return { success: true };

    } catch (error) {
        console.error(`Error deleting comment ${commentId}:`, error);
        return { success: false, error: 'An error occurred while deleting the comment.' };
    }
}

export async function getLikeStatus(trackId: string, userId?: string) {
    'use server';

    if (!userId) {
        return {
            success: true,
            isLiked: false,
            likeCount: 0
        };
    }

    try {
        const internalUserId = await getInternalUserId(userId);
        if (!internalUserId) {
            return {
                success: true,
                isLiked: false,
                likeCount: 0
            };
        }

        const [existingLike, track] = await prisma.$transaction([
            prisma.like.findFirst({
                where: {
                    userId: internalUserId,
                    trackId: trackId,
                },
            }),
            prisma.track.findUnique({
                where: { id: trackId },
                select: { likeCount: true },
            }),
        ]);

        return {
            success: true,
            isLiked: !!existingLike,
            likeCount: track?.likeCount ?? 0
        };
    } catch (error) {
        console.error('Error getting like status:', error);
        return {
            success: false,
            error: 'Failed to get like status',
            isLiked: false,
            likeCount: 0
        };
    }
}

export async function getLikeCount(trackId: string) {
    'use server';

    try {
        const track = await prisma.track.findUnique({
            where: { id: trackId },
            select: { likeCount: true },
        });

        return {
            success: true,
            likeCount: track?.likeCount ?? 0
        };
    } catch (error) {
        console.error('Error getting like count:', error);
        return {
            success: false,
            error: 'Failed to get like count',
            likeCount: 0
        };
    }
} 