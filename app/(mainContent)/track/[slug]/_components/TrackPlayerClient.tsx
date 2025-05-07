'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Play, Pause, Loader2, Music } from 'lucide-react';
import { cn } from '@/lib/utils'; 
import { usePlayerStore } from '@/stores/use-player-store';
import { PlayerTrack } from '@/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { usePostHog } from 'posthog-js/react';

interface TrackPlayerClientProps {
  trackId: string | number;
  title: string;
  producerName: string;
  imageUrl?: string;
  audioSrc: string;
  // Add other necessary props if needed
}

export function TrackPlayerClient({ 
    trackId,
    title,
    producerName,
    imageUrl,
    audioSrc 
}: TrackPlayerClientProps) {
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Get player state and actions from Zustand
  const {
      currentTrack,
      isPlaying,
      isLoading,
      togglePlay,
      playTrackFromList,
  } = usePlayerStore();

  const posthog = usePostHog();

  const isCurrentlyPlaying = isPlaying && currentTrack?.id === trackId;
  const isThisTrackLoading = isLoading && currentTrack?.id === trackId;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isCurrentlyPlaying) {
        console.log('[TrackPlayerClient] Pausing current track via togglePlay');
        togglePlay(); // Pause the currently playing track
    } else {
         // Check if the clicked beat is the one currently loaded (but paused)
         if (currentTrack?.id === trackId) {
             console.log('[TrackPlayerClient] Resuming current track via togglePlay');
             togglePlay(); // Resume the paused current track
         } else {
             // Otherwise, play this track
             if (audioSrc) {
                 console.log(`[TrackPlayerClient] Playing track ${trackId} via playTrackFromList`);
                 // Map current track to PlayerTrack format
                 const trackData: PlayerTrack = {
                     id: trackId,
                     title: title,
                     artist: producerName,
                     audioSrc: audioSrc,
                     coverImage: imageUrl,
                    //  url: `/track/${slug}` // Optional: Need slug passed if we want player link
                 };

                  // Call the store action to load and play this track (as a single-item list)
                  playTrackFromList(trackData, [trackData], 0); 
             } else {
                 toast.error('No audio preview available for this track.');
                 console.warn("No audio source available for track:", trackId);
             }
         }
    }
    // Track PostHog event: track_preview_played
    if (!isCurrentlyPlaying && audioSrc) {
      posthog?.capture('track_preview_played', {
        trackId: String(trackId),
        trackTitle: title,
        producerName: producerName,
      });
    }
  };

  // Fallback image if needed
  const imageSrc = imageUrl || 'https://via.placeholder.com/400x400/cccccc/9ca3af?text=No+Image';

  // Reset image loading state if imageUrl changes
  useEffect(() => {
    setIsImageLoading(true);
  }, [imageUrl]);

  return (
    <div className="w-full aspect-square relative overflow-hidden rounded-lg shadow-lg border border-border bg-muted group">
      {isImageLoading && (
          <Skeleton className="absolute inset-0 w-full h-full rounded-lg" />
      )}
      <Image 
        src={imageSrc}
        alt={`${title} cover art`}
        fill
        sizes="(max-width: 768px) 100vw, 33vw"
        className={cn(
            "object-cover transition-opacity duration-300",
            isImageLoading ? "opacity-0" : "opacity-100"
        )}
        priority
        onLoad={() => setIsImageLoading(false)} 
        onError={() => setIsImageLoading(false)} 
      />
      {/* Play button overlay */}
      <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300",
          isImageLoading ? "opacity-0" : "opacity-0 group-hover:opacity-100"
      )}>
        <button 
          onClick={handlePlayPause}
          disabled={!audioSrc}
          className={cn(
              "play-button w-14 h-14 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center",
              "transform scale-75 group-hover:scale-100 transition-transform duration-300",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-75", 
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background/50"
          )}
          aria-label={
              isThisTrackLoading ? `Loading ${title}` :
              isCurrentlyPlaying ? `Pause ${title}` : 
              `Play preview of ${title}`
          }
         >
           {/* Conditional Icon */}
           {isThisTrackLoading ? (
               <Loader2 size={24} className="text-foreground animate-spin" /> 
           ) : isCurrentlyPlaying ? (
               <Pause size={24} className="text-foreground fill-foreground" /> 
           ) : (
               <Play size={24} className="text-foreground fill-foreground ml-1" />
           )}
        </button>
      </div>
    </div>
  );
} 