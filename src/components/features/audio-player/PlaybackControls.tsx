"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import {
	PauseIcon,
	PlayIcon,
	TrackNextIcon,
	TrackPreviousIcon,
} from '@radix-ui/react-icons'; // Using Radix icons directly
import { Loader2, Repeat, Repeat1, Shuffle } from 'lucide-react'; // Import Loader2 and other needed icons
import { usePlayerStore } from '@/stores/use-player-store';
import { cn } from '@/lib/utils';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components
import { LoopMode } from '@/types'; // Import LoopMode type if not already globally available

interface PlaybackControlsProps {
	isLoading: boolean;
	// Add props passed down from AudioPlayerContainer
	isShuffled: boolean;
	toggleShuffle: () => void;
	loopMode: LoopMode;
	toggleLoop: () => void;
	// Removed props that can be directly accessed from store
	// isPlaying: boolean;
	// onPlayPause: () => void;
	// onNext: () => void;
	// onPrev: () => void;
}

// Destructure new props
export function PlaybackControls({ 
	isLoading, 
	isShuffled, 
	toggleShuffle, 
	loopMode, 
	toggleLoop 
}: PlaybackControlsProps) {
	// Get needed state/actions directly from the store
	const isPlaying = usePlayerStore((state) => state.isPlaying);
	const togglePlay = usePlayerStore((state) => state.togglePlay);
	const playPrevious = usePlayerStore((state) => state.playPrevious);
	const playNext = usePlayerStore((state) => state.playNext);

	// Logic for Loop button appearance and label
	const LoopIcon = loopMode === 'one' ? Repeat1 : Repeat;
	const loopLabel = 
		loopMode === 'one' ? "Looping track" : 
		loopMode === 'all' ? "Looping queue" : 
		"Looping off";
	const shuffleLabel = isShuffled ? 'Shuffle on' : 'Shuffle off';

	// TODO: Add logic based on queue/currentIndex to disable prev/next buttons
	// const canSkipPrevious = usePlayerStore(state => state.currentIndexInQueue > 0 || state.loopMode !== 'off');
	// const canSkipNext = usePlayerStore(state => state.currentIndexInQueue < state.queue.length - 1 || state.loopMode !== 'off');

	return (
		// Wrap in TooltipProvider
		<TooltipProvider delayDuration={100}> 
			<div className="flex items-center justify-center gap-2 md:gap-4"> {/* Increased gap slightly for md+ */}
				{/* Shuffle Button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							size="icon"
							className={cn(
								// Base state: default button appearance, muted text
								'h-8 w-8 text-muted-foreground',
								'hover:text-foreground active:scale-95',
								// Active state: Lighter bg, cyan dotted ring, foreground text
								'data-[active=true]:bg-neutral-700 data-[active=true]:text-foreground data-[active=true]:ring-1 data-[active=true]:ring-dotted data-[active=true]:ring-cyan-400',
								// Transitions and layout
								'transition-all duration-150 hidden md:flex'
							)}
							data-active={isShuffled}
							onClick={toggleShuffle}
							aria-label={shuffleLabel}
						>
							<Shuffle className="h-5 w-5" />
						</Button>
					</TooltipTrigger>
					<TooltipContent className="bg-black text-popover-foreground border px-3 py-1.5 text-xs rounded-md shadow-md">
						<p>{shuffleLabel}</p>
					</TooltipContent>
				</Tooltip>

				{/* Previous Button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							size="icon"
							className="h-9 w-9 hover:bg-accent/50 active:scale-95 disabled:opacity-50 text-muted-foreground hover:text-foreground transition-all duration-150"
							onClick={playPrevious}
							aria-label="Previous track"
							// disabled={!canSkipPrevious}
						>
							<TrackPreviousIcon className="h-6 w-6" />
						</Button>
					</TooltipTrigger>
					<TooltipContent className="bg-black text-popover-foreground border px-3 py-1.5 text-xs rounded-md shadow-md">
						<p>Previous track</p>
					</TooltipContent>
				</Tooltip>

				{/* Play/Pause Button */}
				<Tooltip>
					<TooltipTrigger asChild>
						{/* The outer div acts as the trigger area */}
						<div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
							<Button
								variant="ghost" // Make button transparent
								size="icon"
								className="h-10 w-10 rounded-full text-primary-foreground transition-transform active:scale-90 disabled:opacity-50 ring-1 ring-ring" // Apply ring styling permanently
								onClick={togglePlay}
								aria-label={isPlaying ? 'Pause' : 'Play'} // Keep aria-label for accessibility
								disabled={isLoading} // Disable button while loading
							>
								{isLoading ? (
									<Loader2 className="h-8 w-8 animate-spin" /> // Larger icon
								) : isPlaying ? (
									<PauseIcon className="h-8 w-8" /> // Larger icon
								) : (
									<PlayIcon className="h-8 w-8" /> // Larger icon
								)}
							</Button>
						</div>
					</TooltipTrigger>
					<TooltipContent className="bg-black text-popover-foreground border px-3 py-1.5 text-xs rounded-md shadow-md">
						<p>{isPlaying ? 'Pause' : 'Play'}</p>
					</TooltipContent>
				</Tooltip>

				{/* Next Button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							size="icon"
							className="h-9 w-9 hover:bg-accent/50 active:scale-95 disabled:opacity-50 text-muted-foreground hover:text-foreground transition-all duration-150"
							onClick={playNext}
							aria-label="Next track"
							// disabled={!canSkipNext}
						>
							<TrackNextIcon className="h-6 w-6" />
						</Button>
					</TooltipTrigger>
					<TooltipContent className="bg-black text-popover-foreground border px-3 py-1.5 text-xs rounded-md shadow-md">
						<p>Next track</p>
					</TooltipContent>
				</Tooltip>

				{/* Loop Button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							size="icon"
							className={cn(
								// Base state: default button appearance, muted text
								'h-8 w-8 text-muted-foreground',
								'hover:text-foreground active:scale-95',
								// Active state: Lighter bg, cyan dotted ring, foreground text
								'data-[active=true]:bg-neutral-700 data-[active=true]:text-foreground data-[active=true]:ring-1 data-[active=true]:ring-dotted data-[active=true]:ring-cyan-400',
								// Transitions and layout
								'transition-all duration-150 hidden md:flex'
							)}
							data-active={loopMode !== 'off'}
							onClick={toggleLoop}
							aria-label={loopLabel}
						>
							<LoopIcon className="h-5 w-5" />
						</Button>
					</TooltipTrigger>
					<TooltipContent className="bg-black text-popover-foreground border px-3 py-1.5 text-xs rounded-md shadow-md">
						<p>{loopLabel}</p>
					</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	);
} 