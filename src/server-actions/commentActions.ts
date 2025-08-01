'use server';

// Log environment variable check at module load time
console.log("[commentActions] CLERK_SECRET_KEY available:", !!process.env.CLERK_SECRET_KEY);

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/db/prisma';
import { getInternalUserId } from '@/lib/userUtils'; // Ensure this path is correct
import { revalidatePath } from 'next/cache';
// Explicitly import types from the generated client location
import type { User, Comment, CommentLike } from '../../node_modules/.prisma/client'; 

// Updated type to include like count and user's like status
// Replies will be handled separately for now
export type CommentWithDetails = Comment & {
    user: Pick<User, 'id' | 'username' | 'firstName' | 'lastName' | 'profileImageUrl'>;
    _count: { likes: number }; // Add like count
    currentUserHasLiked: boolean; // Add flag for current user's like
    // replies?: CommentWithDetails[]; // We might add replies later
};

// --- Schemas ---
const addCommentSchema = z.object({
    trackId: z.string(),
    content: z.string().min(1, "Comment cannot be empty").max(1000, "Comment too long"),
    parentId: z.string().optional(),
});

const commentIdSchema = z.object({ 
    commentId: z.string()
});

// --- Action: Fetch Comments (Updated) ---
export async function getCommentsForTrack(trackId: string): Promise<{ success: boolean; comments?: CommentWithDetails[]; error?: string }> {
    if (!trackId) {
        return { success: false, error: 'Track ID is required' };
    }
    // Use currentUser() to get user info if available
    const user = await currentUser(); 
    const internalUserId = user?.id ? await getInternalUserId(user.id).catch(() => null) : null;
    console.log(`[getCommentsForTrack] User ID: ${user?.id}, Internal ID: ${internalUserId}`);

    try {
        const comments = await prisma.comment.findMany({
            where: {
                trackId,
                // parentId: null, // Fetch all comments, not just top-level
            },
            include: {
                user: {
                    select: { id: true, username: true, firstName: true, lastName: true, profileImageUrl: true }
                },
                replies: { // Include nested replies
                    include: {
                        user: { select: { id: true, username: true, firstName: true, lastName: true, profileImageUrl: true } },
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 50,
        });

        const commentsWithDetails = comments.map(comment => {
          const likeCount = comment._count?.likes ?? 0;
          // Check if the 'likes' array exists AND has elements (only included if internalUserId was found)
          const currentUserLiked = !!(comment.likes && comment.likes.length > 0); 
          const { likes, ...restOfComment } = comment;
          return {
            ...restOfComment,
            _count: { likes: likeCount },
            currentUserHasLiked: currentUserLiked,
            replies: [], // Add empty replies array to satisfy the type
          };
        }) as unknown as CommentWithDetails[];

        return { success: true, comments: commentsWithDetails };
    } catch (error) {
        console.error("Error fetching comments:", error);
        return { success: false, error: 'Failed to fetch comments.' };
    }
}

// --- Action: Add Comment (Updated) ---
export async function addComment(input: { trackId: string; content: string; parentId?: string }): Promise<{ success: boolean; comment?: CommentWithDetails; error?: string }> {
    console.log("[addComment] Action started.");
    const user = await currentUser();

    if (!user) {
        return { success: false, error: 'Authentication required.' };
    }
    
    let internalUserId = await getInternalUserId(user.id);

    // Just-in-time user creation
    if (!internalUserId) {
        console.warn(`[addComment] User not found locally, creating new user for clerkId: ${user.id}`);
        try {
            const newUser = await prisma.user.create({
                data: {
                    clerkId: user.id,
                    email: user.emailAddresses[0]?.emailAddress,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    profileImageUrl: user.imageUrl,
                },
            });
            internalUserId = newUser.id;
            console.log(`[addComment] Created new user with internal ID: ${internalUserId}`);
        } catch (error) {
            console.error('[addComment] Error creating new user:', error);
            return { success: false, error: 'Failed to create user profile.' };
        }
    }

    if (!internalUserId) {
        console.error(`[addComment] Failed to find or create internal user ID for clerkId: ${user.id}`);
        return { success: false, error: 'User not found.' };
    }

    const validation = addCommentSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
    }

    const { trackId, content, parentId } = validation.data;
    console.log(`[addComment] Input: trackId=${trackId}, parentId=${parentId}, userId=${internalUserId}`);

    try {
        const newCommentData = await prisma.comment.create({
            data: {
                content,
                trackId,
                userId: internalUserId,
                parentId: parentId, // Include parentId if provided
            },
            include: {
                user: { select: { id: true, username: true, firstName: true, lastName: true, profileImageUrl: true } },
            }
        });

        // Construct the CommentWithDetails shape for the response
        const newComment: CommentWithDetails = {
            ...newCommentData,
             user: newCommentData.user, 
             _count: { likes: 0 }, // A new comment always has 0 likes
            currentUserHasLiked: false, // User can't have liked their own new comment yet
            replies: [], // Add empty replies array
        };

        console.log(`[addComment] Successfully created comment ID: ${newComment.id}`);
        // revalidatePath('/explore'); // Revalidate relevant paths

        return { success: true, comment: newComment };
    } catch (error) {
        console.error("[addComment] Error during prisma.comment.create:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: `Failed to add comment: ${errorMessage}` };
    }
}

// --- Action: Toggle Comment Like ---
export async function toggleCommentLike(input: { commentId: string }): Promise<{ success: boolean; liked?: boolean; error?: string }> {
    // Use currentUser()
    const user = await currentUser();
    if (!user || !user.id) {
        return { success: false, error: 'Authentication required.' };
    }
    const clerkId = user.id;

    const internalUserId = await getInternalUserId(clerkId);
    if (!internalUserId) return { success: false, error: 'User not found.' };

    const validation = commentIdSchema.safeParse(input);
    if (!validation.success) return { success: false, error: 'Invalid comment ID format.' };

    const { commentId } = validation.data;
    const likeWhere = { userId_commentId: { userId: internalUserId, commentId } };

    try {
        const existingLike = await prisma.commentLike.findUnique({ where: likeWhere });

        let liked: boolean;
        if (existingLike) {
            await prisma.commentLike.delete({ where: likeWhere });
            liked = false;
            console.log(`[toggleCommentLike] User ${internalUserId} unliked comment ${commentId}`);
        } else {
            await prisma.commentLike.create({ data: { userId: internalUserId, commentId } });
            liked = true;
            console.log(`[toggleCommentLike] User ${internalUserId} liked comment ${commentId}`);
        }
        // No revalidation needed here as like counts are fetched dynamically
        return { success: true, liked };
    } catch (error) {
        console.error(`[toggleCommentLike] Error for user ${internalUserId} and comment ${commentId}:`, error);
        return { success: false, error: 'Failed to update like status.' };
    }
}

// --- Action: Delete Comment ---
export async function deleteComment(input: { commentId: string }): Promise<{ success: boolean; error?: string }> {
    // Use currentUser()
    const user = await currentUser();
    if (!user || !user.id) {
        return { success: false, error: 'Authentication required.' };
    }
    const clerkId = user.id;

    const internalUserId = await getInternalUserId(clerkId);
    if (!internalUserId) return { success: false, error: 'User not found.' };

    const validation = commentIdSchema.safeParse(input);
    if (!validation.success) return { success: false, error: 'Invalid comment ID format.' };

    const { commentId } = validation.data;

    try {
        // Find the comment to verify ownership (or admin/producer role)
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            select: { userId: true, track: { select: { producerId: true } } }, // Select author and track producer
        });

        if (!comment) {
            return { success: false, error: 'Comment not found.' };
        }

        // Authorization check: Allow deletion if user is the author OR the track producer
        // TODO: Add Admin role check if needed
        const isAuthor = comment.userId === internalUserId;
        const isProducer = comment.track?.producerId === internalUserId;

        if (!isAuthor && !isProducer) {
            console.warn(`[deleteComment] Unauthorized attempt by user ${internalUserId} to delete comment ${commentId}`);
            return { success: false, error: 'You are not authorized to delete this comment.' };
        }

        // Proceed with deletion (Prisma handles cascading delete for likes/replies based on schema)
        await prisma.comment.delete({ where: { id: commentId } });

        console.log(`[deleteComment] User ${internalUserId} deleted comment ${commentId} (Author: ${isAuthor}, Producer: ${isProducer})`);

        revalidatePath('/explore'); // Revalidate relevant paths

        return { success: true };
    } catch (error) {
        console.error(`[deleteComment] Error deleting comment ${commentId} by user ${internalUserId}:`, error);
        return { success: false, error: 'Failed to delete comment.' };
    }
} 