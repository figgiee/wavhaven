"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { VolumeX, Volume1, Volume2, Volume } from 'lucide-react'; // Using Volume1, Volume2, and Volume for different levels
import { usePlayerStore } from '@/stores/use-player-store'; // Import the store
import { cn } from '@/lib/utils';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  onVolumeChange,
  isMuted,
  onMuteToggle,
}) => {
  const [isHovering, setIsHovering] = useState(false);

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX size={20} />;
    if (volume < 0.5) return <Volume1 size={20} />;
    if (volume < 0.8) return <Volume size={20} />;
    return <Volume2 size={20} />;
  };

  const handleVolumeBarClick = (value: number[]) => {
    const newVolume = value[0] / 100; // Slider max is 100, convert to 0-1 range
    onVolumeChange(newVolume);
  };

  const effectiveVolume = isMuted ? 0 : volume;

  return (
    <div className="flex items-center gap-1 sm:gap-2 w-28 transition-all duration-200 ease-in-out">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onMuteToggle} 
        className="w-8 h-8 text-neutral-400 hover:text-cyan-glow focus-visible:ring-cyan-glow"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {getVolumeIcon()}
      </Button>
      <Slider 
        defaultValue={[volume]} 
        max={100} 
        step={1} 
        aria-label="Volume"
        className={cn(
          "relative h-1.5 w-16 rounded-full cursor-pointer bg-neutral-700",
          "transition-all duration-150 ease-in-out",
          "opacity-0 sm:opacity-100 sm:w-20 group-hover:opacity-100"
        )}
        value={[isMuted ? 0 : Math.round(volume * 100)]} // Convert 0-1 volume to 0-100 for slider
        onValueChange={handleVolumeBarClick}
      >
        {isHovering && !isMuted && (
            <div 
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-cyan-glow rounded-full shadow-glow-cyan-sm pointer-events-none" // Added pointer-events-none
                style={{ left: `${effectiveVolume * 100}%` }}
            />
        )}
      </Slider>
    </div>
  );
}; 