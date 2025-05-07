import React from 'react';
import Image from 'next/image'; // Import Image
import { notFound } from 'next/navigation'; // Import notFound
import { getUserProfileByUsername, getUserTracksByUsername } from '@/lib/actions/userActions'; // Import getUserTracksByUsername
import { UserProfileHeader } from '@/components/page/user-profile/UserProfileHeader'; // Import the header

interface UserProfilePageProps {
  params: {
    username: string;
  };
}

const UserProfilePage = async ({ params }: UserProfilePageProps) => {
  // const { username } = params; // Removed destructuring

  // Log the username for initial verification (server-side)
  console.log(`Loading profile for username: ${params.username}`);

  // Fetch user data based on username
  const userProfile = await getUserProfileByUsername(params.username);

  // Fetch user's tracks (initial page)
  const userTracks = await getUserTracksByUsername(params.username, { page: 1 });

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

      {/* Container for the rest of the page content (tracks, etc.) */}
      <div className="container mx-auto px-4 py-8">
        {/* Display fetched tracks or empty state */}
        <h2 className="text-2xl font-semibold mb-4">Tracks</h2>
        {userTracks.length > 0 ? (
          <ul>
            {userTracks.map((track) => (
              <li key={track.id}>{track.title}</li> // Basic display
            ))}
          </ul>
        ) : (
          <p>This user hasn't published any tracks yet.</p>
        )}

        {/* TODO: Add TrackGrid component (Task 35) */}
        {/* TODO: Add Pagination (Task 35) */}
      </div>
    </div>
  );
};

export default UserProfilePage; 