import prisma from '@/lib/prisma';
import { Track, User, UserRole } from '@prisma/client';
import { currentUser, auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ApproveTrackButton } from './_components/ApproveTrackButton'; // Client component for the button
import Link from 'next/link';
import { Suspense } from 'react';

// Type for track with producer info
type PendingTrack = Track & {
  producer: User | null; // Assuming relation is named producer
};

async function getPendingTracks(): Promise<PendingTrack[]> {
  const { userId } = auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // --- Admin Check --- 
  const userRecord = await prisma.user.findUnique({
     where: { clerkId: userId }, 
     select: { role: true } 
  });

  if (userRecord?.role !== UserRole.ADMIN) {
    console.warn(`Non-admin user ${userId} attempted to access moderation page.`);
    redirect('/'); // Redirect non-admins away
  }
  // --- End Admin Check --- 

  const tracks = await prisma.track.findMany({
    where: {
      isPublished: false,
    },
    include: {
      producer: true, // Include producer info
    },
    orderBy: {
      createdAt: 'asc', // Show oldest pending first
    },
  });
  return tracks;
}

export default async function ModerationPage() {
  const pendingTracks = await getPendingTracks();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Track Moderation Queue</h1>

      {pendingTracks.length === 0 ? (
        <p className="text-muted-foreground">No tracks are currently pending approval.</p>
      ) : (
        <div className="space-y-4">
          {pendingTracks.map((track) => (
            <div key={track.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
              <div>
                <h2 className="font-semibold text-lg">
                  <Link href={`/track/${track.slug}`} target="_blank" className="hover:underline">
                    {track.title}
                  </Link>
                </h2>
                <p className="text-sm text-muted-foreground">By: {track.producer?.name || track.producer?.username || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">Submitted: {track.createdAt.toLocaleDateString()}</p>
              </div>
              <ApproveTrackButton trackId={track.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 