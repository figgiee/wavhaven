import React from 'react';
import { notFound } from 'next/navigation';
import { UserProfileHeader } from '@/components/page/user-profile/UserProfileHeader';
import { getPublicUserData } from '@/server-actions/users/userQueries';
import { getInternalUserId, isFollowingUser } from '@/lib/userUtils';
import { auth } from '@clerk/nextjs/server';

interface UserProfilePageProps {
    params: {
        username: string;
    };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
    const { username } = params;
    
    const profileData = await getPublicUserData(username);
    if (!profileData) {
        notFound();
    }

    const { userId: clerkId } = auth();
    let currentInternalUserId: string | null = null;
    let isFollowing = false;

    if (clerkId) {
        currentInternalUserId = await getInternalUserId(clerkId);
        if (currentInternalUserId) {
            isFollowing = await isFollowingUser(currentInternalUserId, profileData.id);
        }
    }
    
    return (
        <div className="container mx-auto px-4 py-8">
            <UserProfileHeader
                userProfile={profileData}
                currentUserId={currentInternalUserId ?? undefined}
                isFollowing={isFollowing}
            />

            {/* Other profile content (tabs for tracks, playlists, etc.) will go here */}
            <div className="mt-8">
                <h2 className="text-2xl font-bold">Tracks</h2>
                {/* Placeholder for track grid */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     <p className="text-muted-foreground col-span-full">Tracks will be displayed here.</p>
                </div>
            </div>
        </div>
    );
} 