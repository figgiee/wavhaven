'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { getInternalUserId } from '@/lib/userUtils';

const followSchema = z.object({
    targetUserId: z.string().uuid(),
});

export async function toggleFollow(input: z.infer<typeof followSchema>) {
    const validation = followSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: 'Invalid input.' };
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

        const { targetUserId } = validation.data;

        if (internalUserId === targetUserId) {
            return { success: false, error: "You cannot follow yourself." };
        }

        const existingFollow = await prisma.follows.findUnique({
            where: {
                followerId_followingId: {
                    followerId: internalUserId,
                    followingId: targetUserId,
                },
            },
        });

        if (existingFollow) {
            await prisma.follows.delete({
                where: {
                    followerId_followingId: {
                        followerId: internalUserId,
                        followingId: targetUserId,
                    },
                },
            });
            return { success: true, isFollowing: false };
        } else {
            await prisma.follows.create({
                data: {
                    followerId: internalUserId,
                    followingId: targetUserId,
                },
            });
            return { success: true, isFollowing: true };
        }

    } catch (error) {
        console.error('Error in toggleFollow:', error);
        return { success: false, error: 'An unexpected error occurred.' };
    } finally {
        // Revalidate user profiles - you might need to get their slugs/usernames for this
        // For now, revalidating generic paths
        revalidatePath('/[username]', 'page');
    }
}

const playlistSchema = z.object({
    name: z.string().min(1, "Playlist name is required.").max(100),
    description: z.string().max(500).optional(),
    isPublic: z.boolean().optional().default(false),
});

export async function createPlaylist(input: z.infer<typeof playlistSchema>) {
    const validation = playlistSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: validation.error.flatten().fieldErrors.name?.[0] || 'Invalid input.' };
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

        const playlist = await prisma.playlist.create({
            data: {
                ...validation.data,
                userId: internalUserId,
            },
        });

        revalidatePath('/dashboard'); // Or wherever playlists are managed
        return { success: true, playlist };

    } catch (error) {
        console.error('Error creating playlist:', error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}

export async function deletePlaylist(playlistId: string) {
    if (!playlistId) {
        return { success: false, error: 'Playlist ID is required.' };
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

        const playlist = await prisma.playlist.findUnique({
            where: { id: playlistId },
        });

        if (!playlist) {
            return { success: false, error: 'Playlist not found.' };
        }
        
        if (playlist.userId !== internalUserId) {
            return { success: false, error: 'Permission denied.' };
        }

        await prisma.playlist.delete({
            where: { id: playlistId },
        });

        revalidatePath('/dashboard'); // Or wherever playlists are managed
        return { success: true };

    } catch (error) {
        console.error('Error deleting playlist:', error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}

const playlistTrackSchema = z.object({
    playlistId: z.string().uuid(),
    trackId: z.string().uuid(),
});

export async function addTrackToPlaylist(input: z.infer<typeof playlistTrackSchema>) {
    const validation = playlistTrackSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: 'Invalid input.' };
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

        const { playlistId, trackId } = validation.data;

        const playlist = await prisma.playlist.findFirst({
            where: { id: playlistId, userId: internalUserId },
            include: { _count: { select: { tracks: true } } },
        });

        if (!playlist) {
            return { success: false, error: 'Playlist not found or permission denied.' };
        }

        await prisma.playlistTrack.create({
            data: {
                playlistId,
                trackId,
                order: playlist._count.tracks,
            },
        });

        revalidatePath(`/playlist/${playlistId}`);
        return { success: true };

    } catch (error) {
        console.error('Error adding track to playlist:', error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}

export async function removeTrackFromPlaylist(input: z.infer<typeof playlistTrackSchema>) {
    const validation = playlistTrackSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: 'Invalid input.' };
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

        const { playlistId, trackId } = validation.data;

        const playlist = await prisma.playlist.findFirst({
            where: { id: playlistId, userId: internalUserId },
        });

        if (!playlist) {
            return { success: false, error: 'Playlist not found or permission denied.' };
        }

        await prisma.playlistTrack.delete({
            where: {
                playlistId_trackId: {
                    playlistId,
                    trackId,
                },
            },
        });

        // Note: Re-ordering other tracks might be needed here in a real app
        revalidatePath(`/playlist/${playlistId}`);
        return { success: true };

    } catch (error) {
        console.error('Error removing track from playlist:', error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
} 