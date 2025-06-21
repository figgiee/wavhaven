import { Suspense } from 'react';
import { searchTracks } from '@/server-actions/trackActions'; // Keep SearchFilters type if needed elsewhere, but not for props here
import TrackGrid from '@/components/features/TrackGrid';
import TrackFilters from '@/components/features/TrackFilters';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

// Define props for the page, explicitly listing expected searchParams
// This matches how Next.js provides them
interface BrowsePageProps {
  searchParams: {
    query?: string;
    mood?: string;
    minBpm?: string;
    maxBpm?: string;
    key?: string;
    page?: string; // For pagination later
  };
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
  // Call searchTracks with individual primitive arguments
  const tracks = await searchTracks({ query }); // Remove genre from call

  // Determine if any filters were actually active
  const hasActiveFilters = !!query; // Update active filter check

  if (tracks.length === 0 && hasActiveFilters) {
    return <p className="text-center text-gray-500 mt-8">No tracks found matching your criteria.</p>;
  }
  if (tracks.length === 0) {
    return <p className="text-center text-gray-500 mt-8">No tracks available yet.</p>;
  }

  return <TrackGrid tracks={tracks} />;
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