'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Pause, Loader2, Music, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrackCardActions } from '@/hooks/useTrackCardActions';
import type { Beat } from '@/types';

export interface TrackCardDetailProps {
  beat: Beat;
  fullTrackList: Beat[];
  index: number;
  className?: string;
}

export const TrackCardDetail: React.FC<TrackCardDetailProps> = ({
  beat,
  fullTrackList,
  index,
  className,
}) => {
  const [isImageLoading, setIsImageLoading] = useState(true);

  const {
    isFavorited,
    isCurrentTrackPlaying,
    isThisTrackLoading,
    isLikePending,
    producerProfileUrl,
    handlePlayPauseClick,
    handleLikeClick,
  } = useTrackCardActions({ beat, fullTrackList, index, isInitiallyLiked: beat.isLiked ?? false });

  const imageToDisplay = beat.imageUrl || beat.coverImageUrl;

  // If no image URL, set loading to false immediately.
  React.useEffect(() => {
    if (!imageToDisplay) {
      setIsImageLoading(false);
    }
  }, [imageToDisplay]);

  const PlayPauseIcon = useMemo(() => {
    if (isThisTrackLoading) return Loader2;
    return isCurrentTrackPlaying ? Pause : Play;
  }, [isThisTrackLoading, isCurrentTrackPlaying]);

  return (
    <div className={cn("w-full flex flex-col bg-neutral-800 rounded-lg shadow-lg", className)}>
      {/* Image Section */}
      <div className="relative aspect-square w-full overflow-hidden">
        {isImageLoading && <Skeleton className="absolute inset-0 w-full h-full bg-neutral-700" />}
        <Image 
          src={imageToDisplay || '/placeholder-image.svg'} // Fallback placeholder
          alt={beat.title || 'Track artwork'}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className={cn(
            "object-cover transition-all duration-300 ease-in-out",
            isImageLoading ? 'opacity-0' : 'opacity-100'
          )}
          onLoad={() => setIsImageLoading(false)}
          onError={() => {
            setIsImageLoading(false);
          }}
          priority // Important for LCP on detail pages
        />
        {/* Play/Pause Button Overlay - Centered */}
        <button 
          onClick={handlePlayPauseClick} 
          aria-label={isCurrentTrackPlaying ? "Pause" : "Play"}
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity duration-200 group"
        >
          <PlayPauseIcon className={cn(
            "h-16 w-16 text-white drop-shadow-lg",
            isThisTrackLoading ? 'animate-spin' : ''
          )} />
        </button>
      </div>

      {/* Waveform Placeholder Section */}
      <div className="h-24 bg-neutral-700/50 my-4 mx-4 rounded flex items-center justify-center">
        <Music size={32} className="text-neutral-500" />
        <span className="ml-2 text-neutral-500 text-sm">Waveform loading...</span>
        {/* Later: <ActualWaveformComponent src={beat.waveformUrl} /> */}
      </div>

      {/* Info Section (Title, Producer) - Kept brief for detail page context */}
      <div className="p-4 text-center">
        <h3 className="text-lg font-semibold text-neutral-100 truncate" title={beat.title}>{beat.title}</h3>
        <Link href={producerProfileUrl} className="text-xs text-cyan-glow hover:underline truncate block" title={beat.producerName}>
          By {beat.producerName}
        </Link>
      </div>
      
      {/* Action Buttons (Like) */}
      <div className="p-4 border-t border-neutral-700/50 flex justify-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleLikeClick}
          disabled={isLikePending}
          aria-label={isFavorited ? "Unlike track" : "Like track"}
          className="text-muted-foreground hover:text-pink-500 data-[favorited=true]:text-pink-500"
          data-favorited={isFavorited}
        >
          <Heart fill={isFavorited ? "currentColor" : "none"} className="w-5 h-5" />
        </Button>
        {/* Other actions like Share could go here */}
      </div>
    </div>
  );
}; 