import React from 'react';
import { Beat } from '@/types';
import { TrackCard } from '@/components/track-card';
import { TrackCardSkeleton } from '@/components/track-card-skeleton';
import { cn } from '@/lib/utils';

// --- Types --- (Assuming these are defined or imported)
// interface Beat { ... } // From types/index.ts
type LayoutMode = 'grid' | 'list';

interface TrackGridProps {
  tracks: Beat[];
  isLoading: boolean; // Use boolean for loading state
  layoutMode?: LayoutMode; // Add layoutMode prop
}

export function TrackGrid({ tracks, isLoading, layoutMode = 'grid' }: TrackGridProps) {
  const gridClasses = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6";
  const listClasses = "space-y-4"; // Example list styling

  return (
    <div className={cn(
      "track-grid mt-6",
      layoutMode === 'grid' ? gridClasses : listClasses
    )}>
      {isLoading
        ? Array.from({ length: 9 }).map((_, i) => <TrackCardSkeleton key={`skel-${i}`} />)
        : tracks.map((beat, index) => (
            // Pass the necessary props to TrackCard
            <TrackCard
              key={beat.id}
              beat={beat}
              fullTrackList={tracks} // Pass the current list context
              index={index} // Pass the index within the list
              // Add other necessary props for TrackCard if any
            />
          ))}
    </div>
  );
}