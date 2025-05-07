import React from 'react';
import Image from 'next/image';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

interface BeatImageProps {
  artworkUrl: string;
  title: string;
  // playCount?: number; // Add later if needed
  isPlaying: boolean; // Assume controlled by parent/global state
  onPlayPauseClick: () => void;
  className?: string;
}

export const BeatImage: React.FC<BeatImageProps> = ({
  artworkUrl,
  title,
  isPlaying,
  onPlayPauseClick,
  className,
}) => {
  return (
    <div className={cn('relative group flex-shrink-0 w-36 h-36 sm:w-48 sm:h-48', className)}>
      <Image
        src={artworkUrl}
        alt={`Artwork for ${title}`}
        fill
        sizes="(max-width: 640px) 144px, 192px" // Tailwind w-36, sm:w-48
        className="object-cover rounded-md bg-gray-700"
        priority // Load image eagerly as it's a key element
      />
      {/* Play/Pause Overlay - Shown on hover/focus or when playing */}
      <button
        onClick={onPlayPauseClick}
        className={cn(
          'absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500',
          { 'opacity-100': isPlaying } // Keep visible when playing
        )}
        aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
      >
        {isPlaying ? (
          <PauseIcon className="h-10 w-10" />
        ) : (
          <PlayIcon className="h-10 w-10" />
        )}
      </button>
      {/* Play Count Corner - Add later if needed using absolute positioning and SVG */}
      {/* <div className="absolute top-0 left-0 bg-some-color text-white p-1 text-xs rounded-br-md">...</div> */}
    </div>
  );
}; 