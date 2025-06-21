"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import { Loader2 } from 'lucide-react';

import { usePlayerStore } from '@/stores/use-player-store';
import { PlayerTrack } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { incrementPlayCount } from '@/server-actions/trackActions'; // Import the server action

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

// Define constants for visualization
const FFT_SIZE = 256; // Smaller FFT size for less detail, better performance
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const BAR_COLOR = '#00E0FF'; // Changed to cyan-glow hex

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
    setPlayState,
    setVolume,
    toggleMute,
    toggleLoop,
    toggleShuffle,
    setLoading,
    setError,
    queue, // Access queue for next/prev track display
    currentIndexInQueue: currentTrackIndex, // Access current track index
    removeFromQueue, // Get remove action from store
  } = usePlayerStore();

  const howlRef = useRef<Howl | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const vizAnimationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioSourceNodeRef = useRef<AudioNode | null>(null);
  const playCountIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref for interval ID
  const hasCountedPlayRef = useRef<boolean>(false); // Ref to track if play count incremented

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Determine visibility: show player when a track is selected
  const isPlayerVisible = Boolean(currentTrack);

  // --- Visualization Setup ---
  const setupVisualization = useCallback(() => {
    if (!howlRef.current || !Howler.ctx || analyserRef.current) {
        // console.log('[Viz] Setup skipped: No Howl, no AudioContext, or analyser already exists.');
        return false; // Already set up or not possible
    }

    try {
      const analyser = Howler.ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      // Connect Howler's masterGain to the analyser
      // Note: Accessing _node is internal, might break in future Howler versions
      // Consider exposing gain node if possible via Howler's API or managing context separately
      const sourceNode: AudioNode = (Howler as any).masterGain; // Use master gain as the source
      if (!sourceNode) {
          console.error("[Viz] Could not get Howler's master gain node.");
          analyserRef.current = null; // Reset refs if connection failed
          dataArrayRef.current = null;
          return false;
      }
      
      console.log("[Viz] Setting up connection: Howler Master Gain -> Analyser");
      sourceNode.connect(analyser);
      // We don't connect analyser to destination, just analyze the signal passing through masterGain
      audioSourceNodeRef.current = sourceNode; // Store the node we connected

      console.log('[Viz] Analyser setup complete.');
      return true;

    } catch (e) {
      console.error('[Viz] Error setting up AnalyserNode:', e);
      analyserRef.current = null;
      dataArrayRef.current = null;
      audioSourceNodeRef.current = null;
      return false;
    }
  }, []);

  // --- Visualization Drawing Loop ---
  const drawVisualization = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current || !isPlaying) {
      if (vizAnimationFrameRef.current) {
        cancelAnimationFrame(vizAnimationFrameRef.current);
        vizAnimationFrameRef.current = null;
      }
      return; // Stop drawing if conditions not met
    }

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    analyser.getByteFrequencyData(dataArray); // Get frequency data

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

    const bufferLength = analyser.frequencyBinCount;
    const barCount = Math.floor(canvas.width / (BAR_WIDTH + BAR_GAP));
    const step = Math.floor(bufferLength / barCount); // How many data points per bar

    let barX = 0;
    for (let i = 0; i < barCount; i++) {
        let barHeightSum = 0;
        // Average frequency data for the bar
        for (let j = 0; j < step; j++) {
            barHeightSum += dataArray[i * step + j];
        }
        const barHeightAverage = barHeightSum / step;
        const barHeightScaled = (barHeightAverage / 255) * canvas.height * 0.8; // Scale height (80% of canvas height)

        ctx.fillStyle = BAR_COLOR;
        // Draw bar centered vertically
        ctx.fillRect(barX, (canvas.height - barHeightScaled) / 2, BAR_WIDTH, Math.max(1, barHeightScaled)); // Min height 1px
        
        barX += BAR_WIDTH + BAR_GAP;
    }

    vizAnimationFrameRef.current = requestAnimationFrame(drawVisualization); // Loop
  }, [isPlaying]); // Depend on isPlaying to automatically stop/start the loop via the guard clause

  // --- Visualization Cleanup ---
  const cleanupVisualization = useCallback(() => {
    console.log("[Viz] Cleaning up visualization.");
    if (vizAnimationFrameRef.current) {
      cancelAnimationFrame(vizAnimationFrameRef.current);
      vizAnimationFrameRef.current = null;
    }
    // Disconnect the analyser from the source node if it exists
    try {
        if (analyserRef.current && audioSourceNodeRef.current) {
            console.log("[Viz] Disconnecting Analyser from Source Node.");
            audioSourceNodeRef.current.disconnect(analyserRef.current);
        }
    } catch (e) {
        console.warn("[Viz] Error disconnecting analyser:", e);
    }
    
    analyserRef.current = null;
    dataArrayRef.current = null;
    audioSourceNodeRef.current = null; // Clear the stored node ref

    // Clear the canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  // --- Time Update Logic --- (Modified slightly for visualization)
  const updateCurrentTime = useCallback(() => {
    const howl = howlRef.current;
    // Use Zustand state directly for isPlaying check
    const storeIsPlaying = usePlayerStore.getState().isPlaying;

    if (howl && howl.state() === 'loaded') {
        const time = howl.seek() as number;
        setCurrentTime(time); // Update local state for progress bar

        if (storeIsPlaying) {
            // Ensure viz loop is running if playing
            if (!vizAnimationFrameRef.current) {
                // console.log('[Viz] Restarting viz loop from updateCurrentTime');
            }
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
        } else {
             // Stop viz/time loops if paused
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
            if (vizAnimationFrameRef.current) cancelAnimationFrame(vizAnimationFrameRef.current);
            vizAnimationFrameRef.current = null;
        }
    } else {
         // Stop loops if Howl is not ready
         if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
         animationFrameRef.current = null;
         if (vizAnimationFrameRef.current) cancelAnimationFrame(vizAnimationFrameRef.current);
         vizAnimationFrameRef.current = null;
     }
  }, [/* drawVisualization removed as dependency */]); // drawVisualization removed as it caused infinite loops

  // --- Howler Instance Cleanup --- (Ensure viz cleanup included)
  const cleanupHowl = useCallback(() => {
    console.log("[Howl] Cleaning up Howl instance and visualization.");
    if (playCountIntervalRef.current) { // Clear play count interval
        clearInterval(playCountIntervalRef.current);
        playCountIntervalRef.current = null;
    }
    cleanupVisualization(); // Cleanup viz first
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setCurrentTime(0);
    setDuration(0);
  }, [cleanupVisualization]);

  // --- Howler Instance Creation/Update Effect ---
  useEffect(() => {
    // Ensure Howler's context is running (needed for AnalyserNode)
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().then(() => {
            console.log("AudioContext resumed successfully.");
        }).catch(e => console.error("Error resuming AudioContext:", e));
    }

    cleanupHowl(); // Clean up previous instance first

    if (currentTrack?.audioSrc) {
      setLoading(true); setError(null); setCurrentTime(0); setDuration(0);
      hasCountedPlayRef.current = false; // Reset play count flag for new track

      const newHowl = new Howl({
        src: [currentTrack.audioSrc],
        html5: true,
        volume: volume / 100,
        mute: isMuted,
        loop: loopMode === 'one',
        onload: () => {
            console.log(`%c[Howler Event] onload: ${currentTrack.title}`, 'color: blue');
            setDuration(newHowl.duration() || 0);
            setLoading(false);
            // IMPORTANT: Defer play call until after setupVisualization if possible
            // However, Howler might require play() to create the node we need to connect.
            // Let's try setting up viz *before* explicit play if store wants play.
             if (usePlayerStore.getState().isPlaying) {
                 console.log("[Howler onload] Store wants play. Setting up viz...");
                 if (setupVisualization()) { // Setup viz first
                     console.log("[Howler onload] Viz setup OK. Calling play()");
                     newHowl.play(); // Now call play
                 } else {
                      console.error("[Howler onload] Viz setup FAILED. Playback might not have viz.");
                      newHowl.play(); // Play anyway without viz
                 }
            } else {
                 // If not playing, still attempt to set up analyser for potential future play
                 console.log("[Howler onload] Track loaded but not playing. Setting up viz for future use...");
                 setupVisualization();
            }
        },
        onplay: () => {
            console.log(`%c[Howler Event] onplay: ${currentTrack?.title}`, 'color: green');
            setPlayState(true); // Update store state
            updateCurrentTime(); // Start time updates
            // Ensure visualization starts drawing
            if (analyserRef.current && !vizAnimationFrameRef.current) {
                console.log('[Viz] Starting draw loop from onplay');
                drawVisualization();
            } else if (!analyserRef.current) {
                 console.warn("[Viz] onplay: Analyser not ready, attempting setup again.");
                 if(setupVisualization()) {
                      drawVisualization();
                 }
            }

            // --- Play Count Logic --- 
            hasCountedPlayRef.current = false; // Reset flag for this play session
            if (playCountIntervalRef.current) clearInterval(playCountIntervalRef.current); // Clear previous interval just in case

            const trackId = currentTrack.id; // Get track ID
            if (!trackId) return; // Should not happen, but guard clause

            playCountIntervalRef.current = setInterval(() => {
                if (howlRef.current && !hasCountedPlayRef.current) {
                    const currentTime = howlRef.current.seek() as number;
                    if (currentTime >= 15) {
                        hasCountedPlayRef.current = true; // Mark as counted
                        if (playCountIntervalRef.current) clearInterval(playCountIntervalRef.current); // Stop checking
                        playCountIntervalRef.current = null;
                        
                        console.log(`[Play Count] Reached 15s threshold for track: ${trackId}. Incrementing...`);
                        incrementPlayCount(trackId)
                            .then(result => {
                                if (!result.success) {
                                    console.error(`[Play Count] Failed to increment for track ${trackId}:`, result.error);
                                }
                            })
                            .catch(err => {
                                console.error(`[Play Count] Error calling incrementPlayCount for track ${trackId}:`, err);
                            });
                    }
                }
            }, 1000); // Check every second
            // --- End Play Count Logic --- 
        },
        onpause: () => {
            console.log(`%c[Howler Event] onpause triggered.`, 'color: orange');
            setPlayState(false);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
            // Stop visualization drawing loop
            if (vizAnimationFrameRef.current) cancelAnimationFrame(vizAnimationFrameRef.current);
            vizAnimationFrameRef.current = null;
            if (playCountIntervalRef.current) { // Clear play count interval on pause
                clearInterval(playCountIntervalRef.current);
                playCountIntervalRef.current = null;
            }
        },
        onend: () => {
            console.log(`%c[Howler Event] onend: ${currentTrack?.title}`, 'color: grey');
            setPlayState(false);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
            // Stop visualization drawing loop & cleanup
            cleanupVisualization();
            if (loopMode !== 'one') {
                setCurrentTime(0);
                playNext(); // This will trigger a new load cycle
            }
             // If loopMode === 'one', howler handles it, onplay will restart viz
            if (playCountIntervalRef.current) { // Clear play count interval on end
                clearInterval(playCountIntervalRef.current);
                playCountIntervalRef.current = null;
            }
        },
        onseek: () => {
            // Update current time immediately on seek for better responsiveness
             const seekTime = howlRef.current?.seek() as number;
             if (seekTime !== undefined) setCurrentTime(seekTime);
            console.log('[Howler Event] onseek');
        },
        onloaderror: (id, err) => {
            const msg = `Load Error: ${err}`; setError(msg); setLoading(false); toast.error("Track Load Failed", { description: String(err) }); cleanupHowl();
        },
        onplayerror: (id, err) => {
             const msg = `Playback Error: ${err}`; setError(msg); setLoading(false); setPlayState(false); toast.error("Playback Failed", { description: String(err) }); cleanupHowl();
        },
      });
      howlRef.current = newHowl;
    }

    // Cleanup function for the effect
    return () => {
        console.log('[Effect Cleanup] Cleaning up Howl and Viz due to track/deps change.');
        cleanupHowl();
    };
    // Dependencies: Explicitly depend on things that require a *new* Howl instance
  }, [currentTrack?.id, currentTrack?.audioSrc, currentTrack?.title, volume, isMuted, setError, // Added setError back
      cleanupHowl, setupVisualization, drawVisualization, cleanupVisualization, 
      setLoading, setPlayState, updateCurrentTime, 
      loopMode, playNext, 
  ]);

  // --- Sync Store Play State -> Howler ---
  useEffect(() => {
    const howl = howlRef.current;
    if (!howl || howl.state() !== 'loaded') return;

    const howlIsPlaying = howl.playing();

    if (isPlaying && !howlIsPlaying) {
      console.log('[Sync Effect] Action: Calling howl.play()');
      howl.play(); // This will trigger onplay -> drawVisualization
    } else if (!isPlaying && howlIsPlaying) {
      console.log('[Sync Effect] Action: Calling howl.pause()');
      howl.pause(); // This will trigger onpause -> stop drawVisualization
    }
  }, [isPlaying]); // Keep this dependency

  // --- Sync Volume/Mute -> Howler ---
  useEffect(() => {
    const howl = howlRef.current;
    if (howl) {
      howl.mute(isMuted);
      howl.volume(volume / 100);
    }
  }, [volume, isMuted]);

  // --- Sync Loop Mode -> Howler ---
  useEffect(() => {
    if (!howlRef.current) return;
    howlRef.current.loop(loopMode === 'one');
  }, [loopMode]);

  // --- Error Toast Effect --- (Remains the same)
  useEffect(() => { if (error) { /* toast */ } }, [error, setError]);

  // --- UI Event Handlers --- (Simplified, point to store actions mostly)
  const handlePlayPause = useCallback(() => togglePlay(), [togglePlay]);
  const handleSeek = useCallback((time: number) => {
      if (howlRef.current) {
          howlRef.current.seek(time);
          // Optimistically set current time for smoother UI
          setCurrentTime(time);
           // Restart time update loop if playing, otherwise it remains stopped
          if (usePlayerStore.getState().isPlaying) {
              updateCurrentTime();
          }
      }
  }, [updateCurrentTime]);
  const handleVolumeChange = useCallback((newVolume: number) => setVolume(newVolume), [setVolume]);
  const handleMuteToggle = useCallback(() => toggleMute(), [toggleMute]);
  const handleLoopToggle = useCallback(() => toggleLoop(), [toggleLoop]);
  const handleShuffleToggle = useCallback(() => toggleShuffle(), [toggleShuffle]);
  const handleNext = useCallback(() => playNext(), [playNext]);
  const handlePrevious = useCallback(() => playPrevious(), [playPrevious]);

  // --- Component Render ---
  if (!currentTrack && !isLoading) {
    // Optionally render a placeholder or return null
    return null;
  }

  // Calculate next and previous track titles for tooltips (simplified example)
  const nextTrackTitle = queue.length > 0 && currentTrackIndex !== null && currentTrackIndex < queue.length - 1 ? queue[currentTrackIndex + 1].title : "None";
  const prevTrackTitle = queue.length > 0 && currentTrackIndex !== null && currentTrackIndex > 0 ? queue[currentTrackIndex - 1].title : "None";

  return (
    <div 
      className={cn(
        "audio-player-container fixed bottom-0 left-0 right-0 z-[100]", // z-index was 60, spec implies high importance, using 100. Header is 40.
        "transition-transform duration-300 ease-in-out",
        isPlayerVisible ? "translate-y-0" : "translate-y-full",
        "bg-neutral-900/80 backdrop-blur-md border-t border-neutral-700/50 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]", // Updated styles from spec
        "h-20 flex items-center justify-between px-3 sm:px-4 text-neutral-200"
      )}
      aria-hidden={!isPlayerVisible}
    >
      <div className="max-w-screen-xl mx-auto grid grid-cols-[auto_1fr_auto] sm:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
        {/* Left Section: Track Info & Album Art (conditionally shown on larger screens) */}
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
            onSeek={(time) => {
              if (howlRef.current) {
                howlRef.current.seek(time);
                setCurrentTime(time); // Optimistically update UI
              }
            }}
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
                 onRemoveTrack={removeFromQueue} // Pass the actual remove function
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