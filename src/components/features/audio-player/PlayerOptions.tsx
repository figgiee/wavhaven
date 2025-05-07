"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Repeat, Repeat1, Shuffle } from 'lucide-react';
import { usePlayerStore } from '@/stores/use-player-store';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function PlayerOptions({ className }: { className?: string }) {
  const loopMode = usePlayerStore((state) => state.loopMode);
  const isShuffled = usePlayerStore((state) => state.isShuffled);
  const toggleLoop = usePlayerStore((state) => state.toggleLoop);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);

  const LoopIcon = loopMode === 'one' ? Repeat1 : Repeat;
  const loopLabel = 
    loopMode === 'one' ? "Looping track" : 
    loopMode === 'all' ? "Looping queue" : 
    "Looping off";
  const shuffleLabel = isShuffled ? 'Shuffle on' : 'Shuffle off';

  return (
    <div className={cn("flex items-center justify-between w-full", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 data-[active=true]:text-primary data-[active=true]:bg-primary/20',
              'hover:bg-accent/50 hover:text-foreground transition-all duration-150 active:scale-95'
            )}
            data-active={isShuffled}
            onClick={toggleShuffle}
            aria-label={shuffleLabel}
          >
            <Shuffle className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{shuffleLabel}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 data-[active=true]:text-primary data-[active=true]:bg-primary/20',
              'hover:bg-accent/50 hover:text-foreground transition-all duration-150 active:scale-95'
            )}
            data-active={loopMode !== 'off'}
            onClick={toggleLoop}
            aria-label={loopLabel}
          >
            <LoopIcon className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{loopLabel}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}; 