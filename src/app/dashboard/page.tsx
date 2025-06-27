import { prisma } from '@/lib/db/prisma';
// import { getInternalUserId } from '@/lib/userUtils'; // Remove outdated import
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProducerTrackList from '@/components/features/ProducerTrackList';
import { BecomeProducer } from '@/components/dashboard/BecomeProducer'; // Import the new component
import { StripeConnectManager } from '@/components/dashboard/StripeConnectManager';
import { ProducerStatsGrid } from '@/components/dashboard/ProducerStatsGrid';
import { ProducerAnalyticsCharts } from '@/components/dashboard/ProducerAnalyticsCharts';
import { getProducerAnalytics } from '@/server-actions/users/userQueries';
// import { UserRole } from '@prisma/client'; // Remove outdated import

// Remove getProducerTracks function - fetch directly in component
// async function getProducerTracks(producerId: string) { ... }

export default async function ProducerDashboardPage() {
  const { userId } = await auth(); // Use await and get userId (clerkId)
  if (!userId) {
    redirect('/sign-in');
  }

  // Verify user is a producer by checking for SellerProfile AND get internal User ID
  const userWithProfile = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true, // Select the internal User ID
      sellerProfile: {
        select: {
          id: true,
          stripeAccountId: true,
          stripeAccountReady: true
        },
      }
    }
  });

  // If no SellerProfile exists, user isn't a producer. Show onboarding.
  if (!userWithProfile?.sellerProfile) {
    return <BecomeProducer />;
  }

  const { id: internalUserId, sellerProfile } = userWithProfile;
  const { stripeAccountId, stripeAccountReady } = sellerProfile;

  // Fetch tracks directly using the internal User ID (producerId)
  let tracks: Array<{
    id: string;
    title: string;
    slug: string;
    bpm: number | null;
    key: string | null;
    isPublished: boolean;
    artworkUrl: string | null;
    createdAt: Date;
    licenses: Array<{ price: any }>;
  }> = [];
  try {
    const rawTracks = await prisma.track.findMany({
      where: {
        producerId: internalUserId, // Use producerId (linked to User.id)
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
          id: true,
          title: true,
          slug: true,
          bpm: true,
          key: true,
          isPublished: true,
          createdAt: true,
          licenses: {
            select: {
              price: true,
            }
          }
      }
    });
    
    // Add the missing artworkUrl field with null value and convert Decimal prices to numbers
    tracks = rawTracks.map(track => ({
      ...track,
      artworkUrl: null as string | null,
      licenses: track.licenses.map(license => ({
        price: Number(license.price), // Convert Decimal to number
      })),
    }));
  } catch (error) {
    console.error("Error fetching producer tracks for dashboard:", error);
    // Optionally show an error message to the user
    // tracks remains []
  }

  // Fetch analytics data
  const analytics = await getProducerAnalytics(internalUserId);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <StripeConnectManager 
        stripeAccountId={stripeAccountId}
        stripeAccountReady={stripeAccountReady}
      />
      <ProducerStatsGrid producerId={internalUserId} />
      
      {/* Analytics Charts Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Analytics</h2>
        <ProducerAnalyticsCharts analytics={analytics} />
      </div>

      {/* Tracks Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-2xl font-bold">My Tracks</h2>
           {/* Optional: Add Link to Upload Page */}
           {/* <Link href="/producer/upload" className={buttonVariants()}>Upload New Track</Link> */}
        </div>
        {/* Pass the fetched tracks to the list component */}
        <ProducerTrackList tracks={tracks} /> 
      </div>
    </div>
  );
} 
