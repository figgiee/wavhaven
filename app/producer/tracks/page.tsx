import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { getProducerTracks } from '@/server-actions/trackActions';
import { TrackManagementClient } from '@/components/producer/TrackManagementClient';
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Tracks - WavHaven",
  description: "View, edit, and manage your uploaded tracks.",
};

const breadcrumbItems = [
  { label: "Dashboard", href: "/producer/dashboard" },
  { label: "Manage Tracks", isCurrent: true },
];

// Fetch producer tracks server-side
async function fetchTracksForProducer(clerkUserId: string) {
  // Ensure user is a producer before fetching
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { role: true }
  });

  if (!user || user.role !== UserRole.PRODUCER) {
    console.warn(`Attempt to access producer tracks by non-producer or non-existent user: ${clerkUserId}`);
    redirect('/'); // Or redirect to dashboard with an error message
  }

  return getProducerTracks(clerkUserId); // Fetch tracks using the existing action
}

export default async function ManageTracksPage() {
  const { userId: clerkUserId } = auth();

  if (!clerkUserId) {
    redirect('/sign-in');
  }

  const tracks = await fetchTracksForProducer(clerkUserId);

  return (
    <div className="container mx-auto py-8">
      <Breadcrumbs items={breadcrumbItems} />
      <h1 className="text-3xl font-bold mt-6 mb-8">Manage Your Tracks</h1>
      <TrackManagementClient initialTracks={tracks} />
    </div>
  );
} 