import React from 'react';
import Image from 'next/image'; // Import Image
import { notFound } from 'next/navigation'; // Import notFound
import { getUserProfileByUsername, getUserTracksByUsername } from '@/lib/actions/userActions'; // Import getUserTracksByUsername
import { UserProfileHeader } from '@/components/page/user-profile/UserProfileHeader'; // Import the header
import { TrackGrid } from '@/components/explore/TrackGrid'; // Import TrackGrid

interface UserProfilePageProps {
  params: {
    username: string;
  };
}

const UserProfilePage = async ({ params }: UserProfilePageProps) => {
  const { username } = await params; // Await and destructure in one line

  // Log the username for initial verification (server-side)
  console.log(`Loading profile for username: ${username}`);

  // Fetch user data based on username
  const userProfile = await getUserProfileByUsername(username);

  // Fetch user's tracks (initial page)
  const userTracks = await getUserTracksByUsername(username, { page: 1 });

  // Temporarily log the fetched data or null status
  console.log('Fetched user profile:', userProfile);
  console.log('Fetched user tracks:', userTracks);

  // Handle user not found
  if (!userProfile) {
    notFound(); // Trigger 404 page
  }

  return (
    <div className="flex flex-col">
      {/* Use the UserProfileHeader component */}
      <UserProfileHeader userProfile={userProfile} />

      {/* Use <main> for the primary content section */}
      <main className="container mx-auto px-4 py-8"> 
        {/* Display fetched tracks or empty state */}
        <h2 className="text-2xl font-semibold mb-6 text-foreground">Tracks</h2> {/* Themed heading */}
        {userTracks.length > 0 ? (
          <TrackGrid tracks={userTracks as any} cardVariant="default" /> // Use TrackGrid, cast tracks for now
        ) : (
          <p className="text-muted-foreground">This user hasn't published any tracks yet.</p> /* Themed empty state text */
        )}

        {/* TODO: Add TrackGrid component (Task 35) - This is now addressed */}
        {/* TODO: Add Pagination (Task 35) */}
      </main>
    </div>
  );
};

export default UserProfilePage; 