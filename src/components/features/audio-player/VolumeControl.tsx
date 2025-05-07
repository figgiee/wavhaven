"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { VolumeX, Volume1, Volume2 } from 'lucide-react'; // Using Volume1 and Volume2 for different levels
import { usePlayerStore } from '@/stores/use-player-store'; // Import the store
import { cn } from '@/lib/utils';

// Remove props interface
// interface VolumeControlProps {
//   volume: number; // 0-100
//   isMuted: boolean;
//   onVolumeChange: (volume: number) => void;
//   onMuteToggle: () => void;
//   className?: string;
// }

// Update component definition
export function VolumeControl({ className }: { className?: string }) {
  // Get state and actions from the store
  const volume = usePlayerStore((state) => state.volume);
  const isMuted = usePlayerStore((state) => state.isMuted);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const toggleMute = usePlayerStore((state) => state.toggleMute);

  // Internal state for smoother dragging, similar to ProgressBar
  const [sliderValue, setSliderValue] = useState<number>(volume);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  // Sync internal state with store changes, unless user is dragging
  useEffect(() => {
    if (!isSeeking) {
        // Use the muted state to determine the visual slider value
        setSliderValue(isMuted ? 0 : volume);
    }
  }, [volume, isMuted, isSeeking]);

  const handleValueChange = (value: number[]) => {
    setSliderValue(value[0]);
    // Re-add immediate store update for real-time volume change
    setVolume(value[0]);
  };

  const handlePointerDown = () => {
    setIsSeeking(true);
  };
  const handlePointerUp = () => {
      // Update global state only when drag finishes
      setVolume(sliderValue);
      setIsSeeking(false);
  }

  const VolumeIcon = () => {
    // Use state from store for determining icon
    if (isMuted || sliderValue === 0) {
      return <VolumeX className="h-6 w-6" />;
    } else if (sliderValue < 50) {
      return <Volume1 className="h-6 w-6" />;
    } else {
      return <Volume2 className="h-6 w-6" />;
    }
  };

  return (
    <div className={cn("group flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMute} // Use action from store
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-150 active:scale-95"
      >
        <VolumeIcon />
      </Button>
      <Slider
        value={[sliderValue]} // Value is based on internal state for dragging
        max={100}
        step={1}
        className={cn(
            "relative group flex h-5 w-24 touch-none select-none items-center cursor-pointer",
            // --- START: Updated Styles ---
            // Target the track directly using data-slot and override default bg-muted
            '[&_[data-slot=slider-track]]:relative [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:grow [&_[data-slot=slider-track]]:overflow-hidden [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-track]]:bg-neutral-700',
            // Target the range directly using data-slot and override default bg-primary
            '[&_[data-slot=slider-range]]:absolute [&_[data-slot=slider-range]]:h-full [&_[data-slot=slider-range]]:rounded-full [&_[data-slot=slider-range]]:bg-blue-400',
             // Target the thumb directly using data-slot and override default styles
             '[&_[data-slot=slider-thumb]]:block [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:rounded-full [&_[data-slot=slider-thumb]]:bg-white',
             // Remove default thumb border/background if needed (uncomment if thumb looks wrong)
             // '[&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:shadow-none',
             // Transitions (can often be left to default or customized here)
             '[&_[data-slot=slider-range]]:transition-colors [&_[data-slot=slider-track]]:transition-colors duration-150'
             // --- END: Updated Styles ---
        )}
        onValueChange={handleValueChange}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        aria-label="Volume control"
      />
    </div>
  );
}; 