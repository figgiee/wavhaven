import { notFound } from 'next/navigation';
import { getTrackBySlug } from '@/server-actions/tracks/trackQueries';
import { EditTrackForm } from '@/components/features/EditTrackForm';
import { auth } from '@clerk/nextjs/server';

interface TrackEditPageProps {
  params: {
    slug: string;
  };
}

export default async function TrackEditPage({ params }: TrackEditPageProps) {
  const { slug } = params;
  const { userId: clerkId } = auth();
  
  const track = await getTrackBySlug(slug);

  if (!track) {
    notFound();
  }

  // Basic authorization: Ensure the logged-in user is the producer of the track
  if (!clerkId || track.producer?.clerkId !== clerkId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">Unauthorized</h1>
        <p>You do not have permission to edit this track.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Edit Track: {track.title}</h1>
      <EditTrackForm track={track} />
    </div>
  );
} 