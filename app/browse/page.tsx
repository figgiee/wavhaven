import { Suspense } from 'react';
import { searchTracks } from '@/server-actions/trackActions';
import TrackGrid from '@/components/features/TrackGrid';
import TrackFilters from '@/components/features/TrackFilters';
import { Skeleton } from '@/components/ui/skeleton';
// Add Pagination type if needed later for controls

// Define props for the page, explicitly listing expected searchParams
interface BrowsePageProps {
  searchParams: {
    // Keep existing
    query?: string;
    mood?: string;
    minBpm?: string;
    maxBpm?: string;
    key?: string;
    page?: string;
    // Add missing params from SearchInput
    type?: string;
    genre?: string;
    tags?: string;
    minPrice?: string;
    maxPrice?: string;
    sortBy?: string;
    limit?: string;
  };
}

// Main Page Component
export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  // Await searchParams before accessing properties
  const resolvedSearchParams = await searchParams;

  // Extract and validate/default parameters (using defaults from searchTracksSchema)
  const query = resolvedSearchParams?.query ?? undefined; // Use undefined if not present
  const type = resolvedSearchParams?.type ?? undefined;
  const genre = resolvedSearchParams?.genre ?? undefined;
  const mood = resolvedSearchParams?.mood ?? undefined;
  const minBpm = resolvedSearchParams?.minBpm ? parseInt(resolvedSearchParams.minBpm, 10) : undefined;
  const maxBpm = resolvedSearchParams?.maxBpm ? parseInt(resolvedSearchParams.maxBpm, 10) : undefined;
  const key = resolvedSearchParams?.key ?? undefined;
  const tags = resolvedSearchParams?.tags ?? undefined;
  const minPrice = resolvedSearchParams?.minPrice ? parseFloat(resolvedSearchParams.minPrice) : undefined;
  const maxPrice = resolvedSearchParams?.maxPrice ? parseFloat(resolvedSearchParams.maxPrice) : undefined;
  const sortBy = resolvedSearchParams?.sortBy ?? 'relevance'; // Default from schema
  const page = resolvedSearchParams?.page ? parseInt(resolvedSearchParams.page, 10) : 1; // Default from schema
  const limit = resolvedSearchParams?.limit ? parseInt(resolvedSearchParams.limit, 10) : 12; // Default from schema

  // Create a comprehensive key for Suspense based on all relevant filters
  const suspenseKey = JSON.stringify({ 
    query, type, genre, mood, minBpm, maxBpm, key, tags, minPrice, maxPrice, sortBy, page, limit 
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Browse Tracks</h1>

      {/* Pass validated/defaulted primitive values to TrackFilters */}
      <TrackFilters 
        initialQuery={query}
        initialType={type}
        initialGenre={genre}
        initialMood={mood}
        initialMinBpm={minBpm}
        initialMaxBpm={maxBpm}
        initialKey={key}
        initialTags={tags}
        initialMinPrice={minPrice}
        initialMaxPrice={maxPrice}
        initialSortBy={sortBy}
      /> 

      {/* Delegate data fetching, passing primitive values */}
      <Suspense key={suspenseKey} fallback={<LoadingGrid />}>
        <TrackGridLoader 
          query={query}
          type={type}
          genre={genre}
          mood={mood}
          minBpm={minBpm}
          maxBpm={maxBpm}
          keyFilter={key} // Rename prop to avoid conflict with React key
          tags={tags}
          minPrice={minPrice}
          maxPrice={maxPrice}
          sortBy={sortBy}
          page={page}
          limit={limit}
        /> 
      </Suspense>
      
      {/* TODO: Add Pagination controls here later, using totalCount from searchTracks result */}
    </div>
  );
}

// Define props for the loader component
interface TrackGridLoaderProps {
  query?: string;
  type?: string;
  genre?: string;
  mood?: string;
  minBpm?: number;
  maxBpm?: number;
  keyFilter?: string; // Renamed prop
  tags?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  page?: number;
  limit?: number;
}

// Separate async component accepting primitive filter props
async function TrackGridLoader(props: TrackGridLoaderProps) {
  // Call searchTracks with all props
  // Note: Rename keyFilter back to key when passing to searchTracks
  const { keyFilter, ...restProps } = props;
  const searchInput = { ...restProps, key: keyFilter }; 
  
  const searchResult = await searchTracks(searchInput);
  const { tracks, totalCount } = searchResult; // Destructure the result

  // Determine if any filters were actually active
  const hasActiveFilters = Object.values(searchInput).some(val => val !== undefined && val !== null && val !== '' && val !== 1 && val !== 12 && val !== 'relevance'); // Basic check

  if (tracks.length === 0 && hasActiveFilters) {
    return <p className="text-center text-muted-foreground mt-8">No tracks found matching your criteria.</p>; // Use themed text color
  }
  if (tracks.length === 0) {
    return <p className="text-center text-muted-foreground mt-8">No tracks available yet.</p>; // Use themed text color
  }

  // Pass the tracks array to TrackGrid
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