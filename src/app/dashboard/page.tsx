import { prisma } from '@/lib/prisma';
// import { getInternalUserId } from '@/lib/userUtils'; // Remove outdated import
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProducerTrackList from '@/components/features/ProducerTrackList';
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
        select: { id: true }, 
      }
    }
  });

  // If no SellerProfile exists, user isn't a producer
  if (!userWithProfile?.sellerProfile) {
    // TODO: Redirect to a "Become a Producer" page or better landing page
    console.log(`User ${userId} attempted to access producer dashboard without SellerProfile.`);
    redirect('/'); 
  }

  // User is verified as a producer, get their internal User ID
  const internalUserId = userWithProfile.id;

  // Fetch tracks directly using the internal User ID (producerId)
  let tracks = [];
  try {
    tracks = await prisma.track.findMany({
      where: {
        producerId: internalUserId, // Use producerId (linked to User.id)
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
          id: true,
          title: true,
          isPublished: true,
          createdAt: true,
      }
    });
  } catch (error) {
    console.error("Error fetching producer tracks for dashboard:", error);
    // Optionally show an error message to the user
    // tracks remains []
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
         <h1 className="text-3xl font-bold">My Tracks</h1>
         {/* Optional: Add Link to Upload Page */}
         {/* <Link href="/producer/upload" className={buttonVariants()}>Upload New Track</Link> */}
      </div>
      {/* Pass the fetched tracks to the list component */}
      <ProducerTrackList tracks={tracks} /> 
    </div>
  );
} 