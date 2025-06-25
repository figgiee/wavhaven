'use client';

import React from 'react';
import { usePlayerStore } from '@/stores/use-player-store';
import { Button } from '@/components/ui/button';
import { Play, Pause, Loader2 } from 'lucide-react';
import type { PlayerTrack } from '@/types';

interface TrackPlayerButtonProps {
  track: {
    id: string;
    title: string;
    artist: string;
    audioSrc: string;
    coverImage?: string | null;
  };
}

export default function TrackPlayerButton({ track }: TrackPlayerButtonProps) {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    playTrack,
    togglePlay,
  } = usePlayerStore();

  // Check if this track is currently loaded
  const isCurrentTrack = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;
  const isCurrentlyLoading = isCurrentTrack && isLoading;

  const handlePlayClick = () => {
    if (isCurrentTrack) {
      // If it's the current track, just toggle play/pause
      togglePlay();
    } else {
      // If it's a different track, load and play it
      const playerTrack: PlayerTrack = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        audioSrc: track.audioSrc,
        coverImage: track.coverImage,
      };
      playTrack(playerTrack);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <Button 
        onClick={handlePlayClick}
        disabled={isCurrentlyLoading}
        size="lg"
        className="w-full"
      >
        {isCurrentlyLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading...
          </>
        ) : isCurrentlyPlaying ? (
          <>
            <Pause className="w-5 h-5 mr-2" />
            Pause Preview
          </>
        ) : (
          <>
            <Play className="w-5 h-5 mr-2" />
            Play Preview
          </>
        )}
      </Button>
    </div>
  );
} 