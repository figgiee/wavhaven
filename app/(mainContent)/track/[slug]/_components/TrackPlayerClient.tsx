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

  if (!trackData) {
    return <TrackPlayerSkeleton />; // Or some other loading/error state
  }

  const coverImage = trackData.imageUrl || trackData.coverImageUrl || '/placeholder-track.jpg';

  return (
    <div className="bg-neutral-800/50 rounded-xl shadow-xl border border-neutral-700/70 p-4 sm:p-6 sticky top-24">
      {/* Track Image & Title/Artist Info */} 
      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="w-full sm:w-40 sm:h-40 md:w-48 md:h-48 aspect-square relative overflow-hidden rounded-lg shadow-lg border border-[hsl(var(--border))] bg-muted group">
          <Image
            src={coverImage}
            alt={title}
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
                  "play-button w-14 h-14 rounded-full bg-neutral-900/70 hover:bg-cyan-glow/20 backdrop-blur-md flex items-center justify-center",
                  "transform scale-75 group-hover:scale-100 transition-transform duration-300",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-75", 
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900/70"
              )}
              aria-label={
                  isThisTrackLoading ? `Loading ${title}` :
                  isCurrentlyPlaying ? `Pause ${title}` : 
                  `Play preview of ${title}`
              }
             >
               {/* Conditional Icon */}
               {isThisTrackLoading ? (
                   <Loader2 size={24} className="text-cyan-glow animate-spin" /> 
               ) : isCurrentlyPlaying ? (
                   <Pause size={24} className="text-neutral-200 group-hover:text-cyan-glow fill-current" /> 
               ) : (
                   <Play size={24} className="text-neutral-200 group-hover:text-cyan-glow fill-current ml-1" />
               )}
            </button>
          </div>
        </div>
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-neutral-100">{title}</h2>
          <p className="text-sm text-neutral-400">{producerName}</p>
        </div>
      </div>
    </div>
  );
}

function TrackPlayerSkeleton() {
    return (
        <div className="bg-neutral-800/50 rounded-xl shadow-xl border border-neutral-700/70 p-4 sm:p-6 sticky top-24">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-4 sm:mb-6">
                <Skeleton className="w-full sm:w-40 sm:h-40 md:w-48 md:h-48 aspect-square rounded-lg bg-neutral-700" />
                <div className="flex flex-col space-y-2 mt-2 sm:mt-0">
                    <Skeleton className="h-8 w-48 rounded bg-neutral-700" />
                    <Skeleton className="h-5 w-32 rounded bg-neutral-700" />
                </div>
            </div>
        </div>
    );
} 