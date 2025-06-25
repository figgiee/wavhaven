import { Suspense } from 'react';
import { searchTracks } from '@/server-actions/tracks/trackQueries';
import { TrackGrid } from '@/components/explore/TrackGrid';
import TrackFilters from '@/components/features/TrackFilters';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

// Define props for the page, explicitly listing expected searchParams
// This matches how Next.js provides them
interface BrowsePageProps {
  searchParams: Promise<{
    query?: string;
    mood?: string;
    minBpm?: string;
    maxBpm?: string;
    key?: string;
    page?: string; // For pagination later
  }>;
}

// Main Page Component - Mark as async and await searchParams
export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  // Await searchParams before accessing properties
  const resolvedSearchParams = await searchParams;

  // Extract primitive values directly here from the awaited object
  const query = resolvedSearchParams?.query ?? '';
  // Extract others as needed...

  // Create a key based on the extracted primitive values for Suspense
  const suspenseKey = `${query}`; // Remove genre from key

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Browse Tracks</h1>

      {/* Pass primitive values to TrackFilters */}
      <TrackFilters initialQuery={query} /> {/* Remove initialGenre */}

      {/* Delegate data fetching, passing primitive values */}
      <Suspense key={suspenseKey} fallback={<LoadingGrid />}>
        <TrackGridLoader query={query} /> {/* Remove genre */}
      </Suspense>
    </div>
  );
}

// Separate async component accepting primitive filter props
async function TrackGridLoader({ query }: { query: string }) { // Remove genre from props
  // Call searchTracks with individual primitive arguments and destructure the result
  const { tracks } = await searchTracks({ query }); // Use correct parameter structure

  // Convert TrackSearchResult[] to Beat[] format expected by TrackGrid
  const convertedTracks = tracks.map(track => ({
    id: track.id,
    title: track.title,
    slug: track.slug,
    imageUrl: track.coverImageUrl,
    coverImageUrl: track.coverImageUrl,
    producerName: track.producer?.username || track.producer?.firstName || 'Unknown',
    producerProfileUrl: track.producer?.username ? `/u/${track.producer.username}` : undefined,
    price: track.licenses[0]?.price || null,
    bpm: track.bpm,
    key: track.key,
    audioSrc: track.previewAudioUrl,
    previewAudioUrl: track.previewAudioUrl,
    beatUrl: `/track/${track.slug}`,
    licenses: track.licenses?.map(l => ({
      id: l.id,
      name: l.name,
      price: l.price,
      includedFiles: l.filesIncluded || [],
      usageTerms: [], // Add minimal usage terms or fetch if needed
    })) || [],
  }));

  // Determine if any filters were actually active
  const hasActiveFilters = !!query; // Update active filter check

  if (convertedTracks.length === 0 && hasActiveFilters) {
    return <p className="text-center text-gray-500 mt-8">No tracks found matching your criteria.</p>;
  }
  if (convertedTracks.length === 0) {
    return <p className="text-center text-gray-500 mt-8">No tracks available yet.</p>;
  }

  return <TrackGrid tracks={convertedTracks} isLoading={false} />;
}

// Simple skeleton loader for the grid - remains the same
function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
      {[...Array(8)].map((_, i) => (
         <Skeleton key={i} className="h-[250px] w-full rounded-lg" />
      ))}
    </div>
  );
} 
