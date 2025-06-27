import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { getInternalUserId } from '@/lib/userUtils';
import prisma from '@/lib/db/prisma';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlaylistsPageClient } from './PlaylistsPageClient';

async function getUserPlaylistsWithTracks(userId: string) {
    const playlists = await prisma.playlist.findMany({
        where: { userId },
        include: {
            _count: {
                select: { tracks: true },
            },
            tracks: {
                take: 4, // Get first 4 track images for a preview grid
                select: {
                    track: {
                        select: {
                            coverImageUrl: true,
                        }
                    }
                }
            }
        },
        orderBy: {
            updatedAt: 'desc',
        },
    });
    return playlists;
}

export default async function MyPlaylistsPage() {
    const { userId: clerkId } = auth();
    if (!clerkId) {
        redirect('/sign-in');
    }

    const internalUserId = await getInternalUserId(clerkId);
    if (!internalUserId) {
        // Handle case where Clerk user exists but internal user doesn't
        notFound();
    }

    const playlists = await getUserPlaylistsWithTracks(internalUserId);

    return (
        <PlaylistsPageClient playlists={playlists} />
    );
} 