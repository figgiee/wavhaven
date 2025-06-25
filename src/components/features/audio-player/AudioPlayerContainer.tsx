"use client";

import React, { useCallback } from 'react';
import { Loader2 } from 'lucide-react';

import { usePlayerStore } from '@/stores/use-player-store';
import { cn } from '@/lib/utils';
import { useHowler } from '@/hooks/useHowler';
import { useAudioVisualizer } from '@/hooks/useAudioVisualizer';

import { TrackDisplay } from './TrackDisplay';
import { PlaybackControls } from './PlaybackControls';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { Button } from '@/components/ui/button';
import { Repeat, Repeat1, Shuffle, ListMusic } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { QueueDisplay } from './QueueDisplay';

export function AudioPlayerContainer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    loopMode,
    isShuffled,
    isLoading,
    error,
    playNext,
    playPrevious,
    togglePlay,
    setVolume,
    toggleMute,
    toggleLoop,
    toggleShuffle,
    queue,
    currentIndexInQueue: currentTrackIndex,
    removeFromQueue,
  } = usePlayerStore();

  // Use custom hooks for Howler and visualization logic
  const { howlRef, currentTime, duration, handleSeek } = useHowler();
  const { canvasRef } = useAudioVisualizer(howlRef);

  // Determine visibility: show player when a track is selected
  const isPlayerVisible = Boolean(currentTrack);

  // Early return if no track and not loading
  if (!currentTrack && !isLoading) {
    return null;
  }

  // Calculate next and previous track titles for tooltips
  const nextTrackTitle = queue.length > 0 && currentTrackIndex !== null && currentTrackIndex < queue.length - 1 ? queue[currentTrackIndex + 1].title : "None";
  const prevTrackTitle = queue.length > 0 && currentTrackIndex !== null && currentTrackIndex > 0 ? queue[currentTrackIndex - 1].title : "None";

  return (
    <div 
      className={cn(
        "audio-player-container fixed bottom-0 left-0 right-0 z-[100]",
        "transition-transform duration-300 ease-in-out",
        isPlayerVisible ? "translate-y-0" : "translate-y-full",
        "bg-neutral-900/80 backdrop-blur-md border-t border-neutral-700/50 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]",
        "h-20 flex items-center justify-between px-3 sm:px-4 text-neutral-200"
      )}
      aria-hidden={!isPlayerVisible}
    >
      <div className="max-w-screen-xl mx-auto grid grid-cols-[auto_1fr_auto] sm:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
        {/* Left Section: Track Info & Album Art */}
        <div className="flex items-center gap-3 overflow-hidden">
          <TrackDisplay track={currentTrack} />
        </div>

        {/* Center Section: Playback Controls & Progress Bar */}
        <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
          <PlaybackControls 
            onPlayPause={togglePlay} 
            onNext={playNext} 
            onPrevious={playPrevious} 
            isPlaying={isPlaying} 
            isLoading={isLoading}
            nextTrackTitle={nextTrackTitle}
            prevTrackTitle={prevTrackTitle}
          />
          <ProgressBar 
            currentTime={currentTime} 
            duration={duration} 
            onSeek={handleSeek}
            disabled={isLoading || !duration}
          />
        </div>

        {/* Right Section: Volume, Loop/Shuffle, Visualizer Toggle */}
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleLoop} className={cn("w-8 h-8", loopMode !== 'none' && "text-cyan-glow")} aria-label={loopMode === 'one' ? 'Disable loop track' : loopMode === 'all' ? 'Disable loop queue' : 'Enable loop queue'}>
                  {loopMode === 'track' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-200 text-xs">
                <p>Loop: {loopMode === 'none' ? 'Off' : loopMode === 'track' ? 'Track' : 'Queue'}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleShuffle} className={cn("w-8 h-8", isShuffled && "text-cyan-glow")} aria-label={isShuffled ? 'Disable shuffle' : 'Enable shuffle'}>
                  <Shuffle size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-200 text-xs">
                <p>Shuffle: {isShuffled ? 'On' : 'Off'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <VolumeControl 
            volume={volume}
            onVolumeChange={setVolume}
            isMuted={isMuted}
            onMuteToggle={toggleMute}
          />
          <Sheet>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn("w-8 h-8")} aria-label="View Queue">
                      <ListMusic size={18} />
                    </Button>
                  </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-200 text-xs">
                  <p>View Queue</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <SheetContent className="w-[350px] sm:w-[400px] p-0 flex flex-col bg-background text-foreground border-l border-border">
              <QueueDisplay
                 queue={queue}
                 currentTrackIndex={currentTrackIndex}
                 onRemoveTrack={removeFromQueue}
              />
            </SheetContent>
          </Sheet>
          {/* Optional: Visualizer canvas - can be toggled */}
          {/* <canvas ref={canvasRef} width="100" height="30" className="hidden sm:block rounded"></canvas> */}
        </div>
      </div>
      {isLoading && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-cyan-glow/30 animate-pulse">
          <span className="sr-only" aria-live="polite">Loading track...</span>
        </div>
      )}
      {error && (
        <div 
          className="absolute bottom-full left-0 right-0 bg-red-500/80 text-white text-xs text-center py-1 px-4 shadow-md"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}
    </div>
  );
} 