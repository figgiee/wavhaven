"use client";

import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

// Utility function to format time (seconds) into MM:SS
const formatTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || timeInSeconds === Infinity || timeInSeconds < 0) {
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
  const [internalValue, setInternalValue] = useState<number[]>([0]);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  useEffect(() => {
    if (!isSeeking && !isNaN(currentTime)) {
      setInternalValue([currentTime]);
    }
  }, [currentTime, isSeeking]);

  const handleValueChange = (value: number[]) => {
    if (!isSeeking) setIsSeeking(true);
    setInternalValue(value);
  };

  const handleValueCommit = (value: number[]) => {
    setIsSeeking(false);
    onSeek(value[0]);
  };

  const isDisabled = duration === 0 || isLoading;
  const displayTime = isSeeking ? internalValue[0] : currentTime;

  return (
    <div className={cn("w-full flex items-center gap-2 text-xs", className)}>
      <span className="text-neutral-400 w-10 text-right tabular-nums">{formatTime(displayTime)}</span>
      <Slider
        value={internalValue}
        onValueChange={handleValueChange}
        onValueCommit={handleValueCommit}
        max={duration > 0 ? duration : 1} // Slider max cannot be 0
        step={1} // Seek by 1 second increments
        disabled={isDisabled}
        className={cn("w-full group", isDisabled && "opacity-50")}
        aria-label="Track progress"
      />
      <span className="text-neutral-400 w-10 text-left tabular-nums">{formatTime(duration)}</span>
    </div>
  );
}; 