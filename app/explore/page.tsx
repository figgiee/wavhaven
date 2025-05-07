import { Suspense } from 'react';
import { searchTracks, type TrackSearchResult } from "@/server-actions/trackActions";
import { ExploreClientUI } from '@/components/explore/ExploreClientUI'; // Import the new client component
import type { License } from '@/components/license/license.types'; // Keep type if needed for mapping
import { Skeleton } from '@/components/ui/skeleton'; // Keep for SkeletonGrid
import { ExploreLoadingSkeleton } from '@/components/explore/ExploreLoadingSkeleton'; // Ensure this component exists

// --- Constants (Keep only if needed server-side, like ITEMS_PER_PAGE) ---
const ITEMS_PER_PAGE = 9;

// --- Types (Keep only if needed server-side for mapping) ---
interface Beat {
  id: string | number;
  title: string;
  imageUrl?: string;
  producerName: string;
  producerProfileUrl?: string;
  bpm?: number;
  key?: string;
  audioSrc?: string;
  beatUrl?: string;
  licenses: License[];
}
interface FilterValues {
  keyword?: string;
  genres?: string[];
  bpm?: [number, number];
  keys?: string[];
  tags?: string[];
  price?: [number, number];
}
type SortOrder = 'relevance' | 'newest' | 'price_asc' | 'price_desc';

// --- Skeleton Component (Keep for Suspense fallback) ---
function BeatCardSkeleton() {
    return (
        <div className="rounded-xl overflow-hidden bg-white/5 border border-transparent">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex justify-end items-center gap-2 pt-2">
                     <Skeleton className="h-4 w-10" />
                     <Skeleton className="h-4 w-10" />
                 </div>
            </div>
        </div>
    );
}
const SkeletonGrid = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => <BeatCardSkeleton key={i} />)}
    </div>
  );
};

interface ExplorePageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

// --- Server Component --- 
export default async function ExplorePage({ searchParams }: ExplorePageProps) {

  // Pass the entire searchParams object directly to the action
  const { tracks: searchResultTracks, totalCount } = await searchTracks({ searchParams });

  // Map TrackSearchResult to Beat for the client UI
  const mappedTracks: Beat[] = searchResultTracks.map(track => ({
    id: track.id,
    title: track.title,
    imageUrl: (track.coverImageUrl && track.coverImageUrl.trim() !== '') ? track.coverImageUrl : undefined,
    producerName: track.producer?.username || "Unknown Producer",
    producerProfileUrl: track.producer?.username ? `/u/${track.producer.username}` : undefined,
    bpm: track.bpm ?? undefined,
    key: track.key ?? undefined,
    audioSrc: (track.previewAudioUrl && track.previewAudioUrl.trim() !== '') ? track.previewAudioUrl : undefined,
    beatUrl: `/track/${track.slug}`,
    licenses: track.licenses as License[], // This might need more careful mapping
  }));

  return (
    <div className="flex flex-col min-h-screen">
      {/* SiteHeader might be in a layout above */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Explore Tracks</h1>
          {/* Render the Client Component, passing initial data */}
          {/* Suspense handles the initial server load fallback */}
          <Suspense fallback={<SkeletonGrid />}>
            <ExploreClientUI initialTracks={mappedTracks} totalCount={totalCount} />
          </Suspense>
        </div>
      </main>
      {/* SiteFooter might be in a layout above */}
    </div>
  );
} 