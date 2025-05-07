"use client"; // Required if using hooks like useState for internal state, though this aims to be stateless

import React from 'react';
import Image from 'next/image';
import Link from 'next/link'; // Used for linking
import { PlayerTrack } from '@/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Music } from 'lucide-react'; // Added for placeholder icon

interface TrackDisplayProps {
  track: PlayerTrack | null;
  isLoading: boolean;
  className?: string;
}

export const TrackDisplay: React.FC<TrackDisplayProps> = ({
  track,
  isLoading,
  className,
}) => {
  // --- Skeleton States ---
  if (isLoading || (!track && !isLoading)) {
    const isPlaceholder = !track && !isLoading;
    return (
      <div
        className={cn(
          'flex items-center gap-3 w-full',
          className,
          isPlaceholder ? 'opacity-50' : 'animate-pulse'
        )}
      >
        {/* Increased Skeleton Size */}
        <Skeleton className="h-16 w-16 rounded flex-shrink-0" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
      </div>
    );
  }

  if (!track) return null; // Should not happen if covered above, but safe guard

  // --- Main Display ---
  const hasLink = !!track.url;

  const imageElement = (
      <div className="group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-muted transition-transform duration-150 ease-in-out">
        {track.coverImage ? (
          <Image
            src={track.coverImage}
            alt={`${track.title} cover art`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-150 ease-in-out"
            sizes="64px" // Explicit size for small image
            priority // Consider adding priority if it's often LCP
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-accent group-hover:scale-105 transition-transform duration-150 ease-in-out">
            <Music className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>
  );

  return (
    <div className={cn('flex items-center gap-3 w-full', className)}>
      {/* Wrap Image in Link if URL exists */}
      {hasLink ? (
        <Link href={track.url!} aria-label={`View details for ${track.title}`}>
          {imageElement}
        </Link>
      ) : (
        imageElement
      )}

      {/* Wrap Text in Separate Links if URL exists */}
      <div className="min-w-0 flex-1 flex flex-col"> { /* Container for text */}
        {hasLink ? (
          <Link href={track.url!}>
            <p className="truncate text-base font-medium leading-tight text-foreground hover:text-primary hover:underline transition-all duration-150">
              {track.title || 'Untitled Track'}
            </p>
          </Link>
        ) : (
          <p className="truncate text-base font-medium leading-tight text-foreground hover:underline transition-all duration-150">
             {track.title || 'Untitled Track'}
          </p>
        )}
        {hasLink ? (
          <Link href={track.artistUrl || track.url!} > { /* Link to artist page if available, fallback to track */}
            <p className="truncate text-sm text-muted-foreground hover:text-foreground hover:underline transition-all duration-150">
              {track.artist || 'Unknown Artist'}
            </p>
          </Link>
        ) : (
          <p className="truncate text-sm text-muted-foreground hover:underline transition-all duration-150">
             {track.artist || 'Unknown Artist'}
          </p>
        )}
      </div>
    </div>
  );
};

// Default export might be preferred depending on convention
// export default TrackDisplay; 