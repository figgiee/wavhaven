import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getProducerTracks } from '@/server-actions/trackActions';
import ProducerTrackList from '@/components/features/ProducerTrackList';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { TrackListItem } from '@/types';

export default async function DashboardPage() {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    redirect('/sign-in');
  }

  const userWithProfile = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, sellerProfile: { select: { id: true } } }
  });

  if (!userWithProfile) {
    console.error(`Dashboard access error: DB user not found for Clerk ID ${userId}`);
    redirect('/');
  }

  if (!userWithProfile.sellerProfile) {
    redirect('/upload?notice=upload_required_for_dashboard');
  }

  let fetchedTracks: TrackListItem[] = [];
  let fetchError = false;

  try {
    fetchedTracks = await getProducerTracks(userId);
  } catch (error) {
    console.error("Failed to fetch tracks for dashboard:", error);
    fetchError = true;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Tracks</h1>
        <Button asChild>
          <Link href="/upload">Upload New Track</Link>
        </Button>
      </div>

      {fetchError ? (
        <div className="border border-destructive/50 rounded-lg p-4 text-center text-destructive">
          <p className="font-semibold">Could not load your tracks.</p>
          <p className="text-sm">There was an error fetching your track data. Please try again later.</p>
        </div>
      ) : (
        <ProducerTrackList tracks={fetchedTracks} />
      )}

    </div>
  );
} 