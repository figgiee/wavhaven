"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import {
	PauseIcon,
	PlayIcon,
	TrackNextIcon,
	TrackPreviousIcon,
} from '@radix-ui/react-icons'; // Using Radix icons directly
import { Loader2, Repeat, Repeat1, Shuffle, Play, Pause, SkipForward, SkipBack } from 'lucide-react'; // Import Loader2 and other needed icons
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
	nextTrackTitle?: string;
	prevTrackTitle?: string;
}

// Destructure new props
export function PlaybackControls({ 
	isLoading, 
	isShuffled, 
	toggleShuffle, 
	loopMode, 
	toggleLoop,
	nextTrackTitle,
	prevTrackTitle,
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
			<div className="flex items-center justify-center gap-2 sm:gap-3"> {/* Increased gap slightly for sm+ */}
				{/* Shuffle Button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							size="icon"
							className={cn(
								'h-8 w-8 text-muted-foreground',
								'hover:text-cyan-glow active:scale-95',
								'data-[active=true]:bg-neutral-700 data-[active=true]:text-cyan-glow data-[active=true]:ring-1 data-[active=true]:ring-dotted data-[active=true]:ring-cyan-400',
								'transition-all duration-150 hidden sm:flex'
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
							variant="ghost"
							size="icon"
							onClick={playPrevious}
							disabled={isLoading}
							className="w-9 h-9 sm:w-10 sm:h-10 text-neutral-400 hover:text-cyan-glow focus-visible:ring-cyan-glow"
							aria-label="Previous track"
						>
							<SkipBack size={18} className="sm:w-5 sm:h-5" />
						</Button>
					</TooltipTrigger>
					<TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-200 text-xs">
						<p>Previous: {prevTrackTitle || "None"}</p>
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
									<Loader2 size={24} className="animate-spin sm:w-7 sm:h-7" /> // Larger icon
								) : isPlaying ? (
									<Pause size={24} fill="currentColor" className="sm:w-7 sm:h-7" /> // Larger icon
								) : (
									<Play size={24} fill="currentColor" className="sm:w-7 sm:h-7" /> // Larger icon
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
							variant="ghost"
							size="icon"
							onClick={playNext}
							disabled={isLoading}
							className="w-9 h-9 sm:w-10 sm:h-10 text-neutral-400 hover:text-cyan-glow focus-visible:ring-cyan-glow"
							aria-label="Next track"
						>
							<SkipForward size={18} className="sm:w-5 sm:h-5" />
						</Button>
					</TooltipTrigger>
					<TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-200 text-xs">
						<p>Next: {nextTrackTitle || "None"}</p>
					</TooltipContent>
				</Tooltip>

				{/* Loop Button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							size="icon"
							className={cn(
								'h-8 w-8 text-muted-foreground',
								'hover:text-cyan-glow active:scale-95',
								'data-[active=true]:bg-neutral-700 data-[active=true]:text-cyan-glow data-[active=true]:ring-1 data-[active=true]:ring-dotted data-[active=true]:ring-cyan-400',
								'transition-all duration-150 hidden sm:flex'
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