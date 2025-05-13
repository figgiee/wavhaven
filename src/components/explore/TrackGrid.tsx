import React from 'react';
import { Beat } from '@/types';
import TrackCard from '@/components/track-card';
import { TrackCardSkeleton } from '@/components/track-card-skeleton';
import { cn } from '@/lib/utils';

// --- Types --- (Assuming these are defined or imported)
// interface Beat { ... } // From types/index.ts
type LayoutMode = 'grid' | 'list';

interface TrackGridProps {
  tracks: Beat[];
  isLoading: boolean; // Use boolean for loading state
  layoutMode?: LayoutMode; // Add layoutMode prop
  cardVariant?: 'default' | 'compact'; // Added variant for TrackCard
}

export function TrackGrid({ tracks, isLoading, layoutMode = 'grid', cardVariant = 'default' }: TrackGridProps) {
  const gridClasses = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6 md:gap-8";
  const listClasses = "space-y-4 md:space-y-5"; // Slightly increased gap for list items

  return (
    <div 
      className={cn(
        "track-grid mt-6 md:mt-8",
        layoutMode === 'grid' ? gridClasses : listClasses
      )}
      data-testid="track-grid"
    >
      {isLoading && tracks.length === 0
        ? Array.from({ length: 8 }).map((_, i) => <TrackCardSkeleton key={`skel-${i}`} />)
        : tracks.map((beat, index) => (
            <TrackCard
              key={beat.id}
              beat={beat as any}
              fullTrackList={tracks as any[]}
              index={index}
              displayMode={layoutMode}
              variant={cardVariant}
            />
          ))}
    </div>
  );
}