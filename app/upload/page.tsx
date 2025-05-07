import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
// import { UploadForm } from '@/components/features/UploadForm'; // Old form
import { TrackUploadForm } from '@/components/forms/TrackUploadForm'; // New form

export const metadata: Metadata = {
  title: 'Upload Your Track - Wavhaven', // Updated title
  description: 'Upload your track details, audio files, cover art, and define licenses.',
};

export default async function UploadPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Upload New Track</h1>
        <p className="text-lg text-muted-foreground">
          Share your music with the world.
        </p>
      </div>

      {/* Use the new form component */}
      <TrackUploadForm /> 
    </div>
  );
} 