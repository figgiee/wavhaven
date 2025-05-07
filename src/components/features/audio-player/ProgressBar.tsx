"use client";

import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

// Utility function to format time (seconds) into MM:SS
const formatTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || timeInSeconds === Infinity) {
    return '00:00';
  }
  const totalSeconds = Math.floor(timeInSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

interface ProgressBarProps {
  currentTime: number; // in seconds
  duration: number;    // in seconds
  onSeek: (time: number) => void;
  isLoading: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  duration,
  onSeek,
  isLoading,
  className,
}) => {
  // Internal state to manage slider value during dragging
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  // Update slider value when currentTime changes, but only if not currently seeking
  useEffect(() => {
    if (!isSeeking) {
      setSliderValue(currentTime);
    }
  }, [currentTime, isSeeking]);

  const handleValueChange = (value: number[]) => {
    // This is triggered while dragging
    setSliderValue(value[0]);
  };

  const handleCommit = (value: number[]) => {
    // This is triggered when the drag finishes (mouse up)
    setIsSeeking(false);
    onSeek(value[0]);
  };

  const handlePointerDown = () => {
    setIsSeeking(true);
  };

  const isDisabled = duration === 0 || isLoading;
  const displayTime = isSeeking ? sliderValue : currentTime;

  return (
    <div className={cn("group flex items-center gap-2 w-full", className)}>
      <span className="text-xs font-mono text-muted-foreground w-10 text-right tabular-nums sm:text-sm">
        {formatTime(displayTime)}
      </span>
      <Slider
        value={[sliderValue]} // Slider expects an array
        max={duration}
        step={0.1} // Allow finer seeking steps
        onValueChange={handleValueChange}
        onValueCommit={handleCommit} // Use onValueCommit for final seek action
        onPointerDown={handlePointerDown} // Track when seeking starts
        disabled={isDisabled}
        className={cn(
          "relative group flex h-5 touch-none select-none items-center cursor-pointer", // Keep group for hover effects
          // Target Track: Apply base styles and background (neutral-700)
          '[&_[data-slot=slider-track]]:relative [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:grow [&_[data-slot=slider-track]]:overflow-hidden [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-track]]:bg-neutral-700',
          // Target Track Hover: Apply hover style (thicker track)
          '[&_[data-slot=slider-track]]:group-hover:h-2 [&_[data-slot=slider-track]]:transition-all [&_[data-slot=slider-track]]:duration-150',
          // Target Range: Apply styles and background (using primary color)
          '[&_[data-slot=slider-range]]:absolute [&_[data-slot=slider-range]]:h-full [&_[data-slot=slider-range]]:rounded-full [&_[data-slot=slider-range]]:bg-primary',
          // Target Thumb: Apply styles (bg-white, size), remove defaults (border, shadow)
           '[&_[data-slot=slider-thumb]]:block [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:rounded-full [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:shadow-none',
           // Target Thumb Hover: Scale up on hover (Keep this part)
           '[&_[data-slot=slider-thumb]]:group-hover:scale-110 [&_[data-slot=slider-thumb]]:transition-all [&_[data-slot=slider-thumb]]:duration-150',
           // Disabled State Handling (apply to the wrapper)
           isDisabled && "opacity-50 cursor-not-allowed [&_[data-slot=slider-thumb]]:group-hover:opacity-0 [&_[data-slot=slider-thumb]]:group-hover:scale-100" // Hide/prevent scale on thumb when disabled
        )}
        aria-label="Track progress"
      />
      <span className="text-xs font-mono text-muted-foreground w-10 text-left tabular-nums sm:text-sm">
        {formatTime(duration)}
      </span>
    </div>
  );
}; 