"use client"; // Required if using hooks like useState for internal state, though this aims to be stateless

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
// import Link from 'next/link'; // Link not used in this version, can be removed if not intended for future
import { PlayerTrack } from '@/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, ImageOff } from 'lucide-react'; // Added for placeholder icon

interface TrackDisplayProps {
  track: PlayerTrack | null;
  isLoading?: boolean;
}

export function TrackDisplay({ track, isLoading }: TrackDisplayProps) {
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (track && !isLoading) {
      const newAnnouncement = `Now playing: ${track.title || "Untitled Track"} by ${track.artist || "Unknown Artist"}`;
      // Update announcement only if it's different to avoid unnecessary re-renders/announcements
      if (newAnnouncement !== announcement) {
        setAnnouncement(newAnnouncement);
      }
    } else {
      // Clear announcement if no track or loading
      setAnnouncement("");
    }
    // Depend on track ID to trigger announcement on track change
  }, [track?.id, track?.title, track?.artist, isLoading]); // Added dependencies

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded bg-neutral-700/80" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32 rounded bg-neutral-700/70" />
          <Skeleton className="h-3 w-24 rounded bg-neutral-700/60" />
        </div>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="flex items-center gap-3 text-neutral-500">
        <div className="h-12 w-12 rounded bg-neutral-800 flex items-center justify-center">
            <ImageOff size={24} />
        </div>
        <div className="space-y-1">
            <p className="text-sm font-medium">Nothing Playing</p>
            <p className="text-xs">Queue is empty</p>
        </div>
      </div>
    );
  }

  const { coverImage, title, artist } = track; // Destructure from track prop

  return (
    <div className="flex items-center gap-3 group">
      {coverImage ? (
        <Image
          src={coverImage}
          alt={title || 'Track cover'}
          width={48}
          height={48}
          className="rounded object-cover aspect-square shadow-sm border border-neutral-700/50 group-hover:border-cyan-glow/50 transition-colors duration-200"
        />
      ) : (
        <div className="h-12 w-12 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-600 group-hover:border-cyan-glow/50 transition-colors duration-200">
          <ImageOff size={24} />
        </div>
      )}
      <div>
        <p className="text-sm sm:text-base font-medium text-neutral-100 group-hover:text-cyan-glow transition-colors duration-200 truncate max-w-[150px] sm:max-w-[200px] lg:max-w-[250px]" title={title}>
          {title || "Untitled Track"}
        </p>
        <p className="text-xs sm:text-sm text-neutral-400 group-hover:text-neutral-200 transition-colors duration-200 truncate max-w-[150px] sm:max-w-[200px] lg:max-w-[220px]" title={artist}>
          {artist || "Unknown Artist"}
        </p>
      </div>
      {/* Visually hidden announcement area */}
      {announcement && (
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
      )}
    </div>
  );
}

// Default export might be preferred depending on convention
// export default TrackDisplay; 