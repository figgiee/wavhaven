import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProducerTracks } from '@/server-actions/trackActions'; // Assuming this exists
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { StripeConnectManager } from "./_components/StripeConnectManager"; // Import the client component
import { StripeBalanceDisplay } from "./_components/StripeBalanceDisplay"; // Import the balance display
import { getInternalUserId } from "@/lib/userUtils";

// Fetch producer-specific data
async function getProducerDashboardData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      sellerProfile: {
        select: {
          id: true,
          stripeAccountId: true, // Need this for Stripe connect status
        }
      }
    }
  });

  if (!user || user.role !== UserRole.PRODUCER) {
    // Redirect if not found or not a producer
    redirect('/'); 
  }

  // Fetch tracks (using the existing action)
  const clerkUser = await auth(); // We need clerkId for getProducerTracks if it uses it
  const tracks = clerkUser ? await getProducerTracks(clerkUser.id) : []; 

  return {
    sellerProfile: user.sellerProfile,
    tracks: tracks
  };
}

export default async function ProducerDashboardPage() {
  const user = await auth();
  if (!user?.id) {
    redirect('/sign-in');
  }

  // Fetch internal ID first
  const internalUser = await prisma.user.findUnique({ 
    where: { clerkId: user.id },
    select: { id: true }
  });

  if (!internalUser) {
     // This might happen on first login if ensureUserRecord hasn't run
     // Or if there's an issue. Redirect or show error.
     console.error(`Producer Dashboard: Could not find internal ID for Clerk user ${user.id}`);
     redirect('/'); // Or redirect to an error/sync page
  }

  const dashboardData = await getProducerDashboardData(internalUser.id);
  const stripeAccountId = dashboardData.sellerProfile?.stripeAccountId; // Extract for convenience

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Producer Dashboard</h1>
        <Button asChild>
          <Link href="/upload">
            <PlusCircle className="mr-2 h-4 w-4" /> Upload New Track
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Stats Card - Now includes Balance Display */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Your earnings summary.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Render the StripeBalanceDisplay component */}
            <StripeBalanceDisplay stripeAccountId={stripeAccountId} /> 
            {/* Placeholder for total earnings can remain or be integrated with balance */}
            {/* <p className="text-2xl font-bold">$0.00</p> */}
            {/* <p className="text-xs text-muted-foreground">Total earnings (coming soon)</p> */}
          </CardContent>
        </Card>

        {/* Placeholder Card for Tracks */}
        <Card>
          <CardHeader>
            <CardTitle>Your Tracks</CardTitle>
            <CardDescription>{dashboardData.tracks.length} tracks uploaded.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Display track list or summary here */}
            <ul>
              {dashboardData.tracks.slice(0, 5).map((track) => (
                <li key={track.id} className="text-sm mb-1">{track.title} ({track.isPublished ? 'Live' : 'Pending'})</li>
              ))}
            </ul>
             {dashboardData.tracks.length > 5 && <p className="text-xs text-muted-foreground mt-2">...and more</p>}
             {/* Link to full track management page */} 
             <Button variant="outline" size="sm" className="mt-4" asChild>
               <Link href="/producer/tracks">Manage Tracks</Link>
             </Button>
          </CardContent>
        </Card>
        
        {/* Placeholder Card for Payouts / Stripe Connect */}
         <Card>
           <CardHeader>
             <CardTitle>Payouts</CardTitle>
             <CardDescription>Manage your payout settings.</CardDescription>
           </CardHeader>
           <CardContent>
             <StripeConnectManager stripeAccountId={stripeAccountId} />
           </CardContent>
         </Card>

      </div>

      {/* Add more sections later, e.g., recent orders, analytics */}
    </div>
  );
} 