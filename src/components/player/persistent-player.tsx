'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Howl } from 'howler';
import { 
    Play, 
    Pause, 
    SkipBack, 
    SkipForward, 
    Volume2, 
    Volume1, 
    VolumeX, 
    Repeat, 
    Repeat1, 
    Shuffle, 
    Loader2 
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePlayerStore } from '@/stores/use-player-store'; // Import the Zustand store

// TODO: Define Track type properly (maybe import from shared types)
interface Track {
    id: string | number;
    title: string;
    artist: string;
    audioSrc: string;
    coverImage?: string;
    url?: string;
}

// Helper function
function formatTime(secs: number): string {
    if (isNaN(secs)) return '0:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    const returnedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${minutes}:${returnedSeconds}`;
}

export function PersistentPlayer() {
    // Get state and actions from Zustand store
    const {
        currentTrack,
        isPlaying,
        volume,
        isMuted,
        loopMode,
        isShuffled,
        isLoading,
        error,
        playTrack, // Although we mainly react to currentTrack changes
        setPlayState,
        setVolume,
        toggleMute,
        toggleLoop,
        toggleShuffle,
        setLoading,
        setError,
    } = usePlayerStore();

    // Local state for things directly tied to the Howl instance / DOM
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const howlRef = useRef<Howl | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);

    // --- Visualization Setup and Control (Moved Before UseEffect) ---
    const stopDrawingVisualization = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, []);

    const drawVisualizer = useCallback(() => {
        // Use global isPlaying state
        if (!isPlaying || !analyserRef.current || !canvasRef.current || !dataArrayRef.current) {
            stopDrawingVisualization();
            return;
        }

        animationFrameRef.current = requestAnimationFrame(drawVisualizer);

        const analyser = analyserRef.current;
        const canvas = canvasRef.current;
        const dataArray = dataArrayRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        analyser.getByteFrequencyData(dataArray);

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
         if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
             canvas.width = rect.width * dpr;
             canvas.height = rect.height * dpr;
             ctx.scale(dpr, dpr);
         }
         const WIDTH = canvas.width / dpr;
         const HEIGHT = canvas.height / dpr;

         ctx.clearRect(0, 0, WIDTH, HEIGHT);

         const barWidth = (WIDTH / bufferLength) * 1.5;
         const barGap = 1;
         let x = 0;

         const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
         gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
         gradient.addColorStop(1, 'rgba(168, 85, 247, 0.6)');
         ctx.fillStyle = gradient;

         for (let i = 0; i < bufferLength; i++) {
             const barHeight = (dataArray[i] / 255) * HEIGHT * 0.8;
             ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
             x += barWidth + barGap;
         }
    }, [isPlaying, stopDrawingVisualization]); // Depend on global isPlaying

     const startDrawingVisualization = useCallback(() => {
         if (!animationFrameRef.current) {
             drawVisualizer();
         }
     }, [drawVisualizer]);

    const setupVisualization = useCallback(() => {
        if (!canvasRef.current || !Howler.ctx || !Howler.masterGain) {
            console.warn('Canvas, AudioContext or MasterGain not ready for visualization setup.');
            return false;
        }
        try {
            if (!analyserRef.current) {
                analyserRef.current = Howler.ctx.createAnalyser();
                analyserRef.current.fftSize = 256;
                dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
                 console.log('Analyzer created');
            }
            Howler.masterGain.disconnect();
             Howler.masterGain.connect(analyserRef.current);
             analyserRef.current.connect(Howler.ctx.destination);
             console.log('Visualization nodes connected');
            return true;
        } catch (err) {
            console.error('Error setting up visualization:', err);
             try { Howler.masterGain.connect(Howler.ctx.destination); } catch {} // Attempt reconnection
            return false;
        }
    }, []); // No dependencies, safe to define early

    const cleanupVisualization = useCallback(() => {
        stopDrawingVisualization();
        if (analyserRef.current && Howler.ctx && Howler.masterGain) {
            try {
                analyserRef.current.disconnect();
                Howler.masterGain.disconnect(analyserRef.current); // Ensure specific disconnection
                Howler.masterGain.connect(Howler.ctx.destination); // Reconnect master gain directly
                 console.log("Visualization nodes disconnected and masterGain reconnected.");
                 analyserRef.current = null; // Clean up analyser ref
                 dataArrayRef.current = null; // Clean up data array ref
            } catch (err) {
                console.error("Error cleaning up visualization nodes:", err);
                // Attempt to restore default connection anyway
                try { Howler.masterGain.connect(Howler.ctx.destination); } catch {} 
            }
        } else {
            // If analyser wasn't even setup, ensure default connection
             try { Howler.masterGain?.connect(Howler.ctx.destination); } catch {} 
        }
    }, [stopDrawingVisualization]); // Depends only on stopDrawingVisualization

    // --- Howler Instance Management --- 

    // Function to cleanup Howler instance
    const cleanupHowl = useCallback(() => {
        if (timeUpdateIntervalRef.current) {
            clearInterval(timeUpdateIntervalRef.current);
            timeUpdateIntervalRef.current = null;
        }
        if (howlRef.current) {
            howlRef.current.unload();
            howlRef.current = null;
             console.log("Howler instance unloaded.");
        }
    }, []);

    // Effect to initialize/cleanup Howler instance when the track changes
    useEffect(() => {
        setError(null); // Reset error on track change

        if (currentTrack) {
            cleanupHowl(); // Cleanup previous instance if any
            cleanupVisualization(); // Cleanup visualizer
            setCurrentTime(0); // Reset time for new track
            setDuration(0); // Reset duration
            setLoading(true); // Set loading true

            const newHowl = new Howl({
                src: [currentTrack.audioSrc],
                html5: true, // Important for streaming/large files
                autoplay: isPlaying, // Use global state for initial play
                volume: isMuted ? 0 : volume / 100, // Use global state for initial volume
                loop: loopMode === 'one', // Set initial loop based on global state
                onload: () => {
                    setDuration(newHowl.duration());
                    setLoading(false);
                    if (!setupVisualization()) {
                         console.error("Failed to setup visualization on load.");
                     }
                    if (newHowl.playing()) {
                        setPlayState(true);
                        startDrawingVisualization(); 
                        if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
                        timeUpdateIntervalRef.current = setInterval(() => {
                             const time = newHowl.seek() || 0;
                             setCurrentTime(time);
                         }, 100); 
                    }
                },
                onloaderror: (id, err) => {
                    console.error('Howler load error:', err);
                    setError(`Failed to load audio: ${err}`);
                    setLoading(false);
                    cleanupHowl();
                    cleanupVisualization();
                },
                onplayerror: (id, err) => {
                    console.error('Howler play error:', err);
                    setError(`Playback error: ${err}`);
                    setLoading(false);
                    setPlayState(false);
                    stopDrawingVisualization();
                    cleanupHowl();
                    cleanupVisualization();
                },
                onplay: () => {
                    // Ensure global state reflects playing
                    if (!isPlaying) setPlayState(true);
                    setLoading(false); // Ensure loading is false
                     if (duration === 0 && howlRef.current) { // Get duration if missed onload
                         setDuration(howlRef.current.duration());
                     }
                     if (!setupVisualization()) { 
                         console.warn("Could not setup visualization on play.");
                     }
                     startDrawingVisualization(); 
                     if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
                     timeUpdateIntervalRef.current = setInterval(() => {
                         const time = howlRef.current?.seek() || 0;
                         setCurrentTime(time);
                     }, 100); 
                },
                onpause: () => {
                    setPlayState(false); // Update global state
                    stopDrawingVisualization();
                    if (timeUpdateIntervalRef.current) {
                         clearInterval(timeUpdateIntervalRef.current);
                     }
                },
                onseek: (id) => {
                     const time = howlRef.current?.seek() || 0;
                     setCurrentTime(time);
                 },
                onvolume: () => {
                     // Reflect Howler's internal volume/mute state back to store if needed?
                     // Usually, our UI -> store -> effect -> Howler is the flow.
                 },
                onend: () => {
                    if (timeUpdateIntervalRef.current) {
                         clearInterval(timeUpdateIntervalRef.current);
                     }
                     if (loopMode !== 'one') { // Howler handles loop 'one' internally
                        setPlayState(false);
                         setCurrentTime(0);
                         if (loopMode === 'all') {
                             // TODO: Get next track from playlist and call playTrack()
                             console.log('Play next track (playlist loop)');
                         }
                     }
                     stopDrawingVisualization();
                },
            });
            howlRef.current = newHowl;

        } else {
            // If currentTrack becomes null, cleanup
            cleanupHowl();
            cleanupVisualization();
        }

        // Global cleanup on component unmount or when track changes
        return () => {
             cleanupHowl();
             cleanupVisualization();
         };
        // Dependencies: React to changes in the globally selected track
    }, [currentTrack, isPlaying, isMuted, volume, loopMode, setPlayState, setLoading, setError, cleanupHowl, cleanupVisualization, setupVisualization, startDrawingVisualization, stopDrawingVisualization]); 


    // --- Reacting to Global State Changes --- 

    // Effect to toggle Howler play/pause based on global isPlaying state
    useEffect(() => {
        if (!howlRef.current) return;
        if (isPlaying) {
            if (!howlRef.current.playing()) {
                 howlRef.current.play();
            }
        } else {
            if (howlRef.current.playing()) {
                 howlRef.current.pause();
             }
        }
    }, [isPlaying]);

    // Effect to update Howler volume based on global state
    useEffect(() => {
        if (howlRef.current) {
            howlRef.current.volume(isMuted ? 0 : volume / 100);
        }
        // Persisting volume is handled by the store's middleware
    }, [volume, isMuted]);

    // Effect to update Howler loop state based on global state
    useEffect(() => {
        if (howlRef.current) {
            howlRef.current.loop(loopMode === 'one');
        }
    }, [loopMode]);


    // --- UI Event Handlers --- 

    // Volume slider change handler - updates the store
    const handleVolumeChange = (value: number[]) => {
        setVolume(value[0]); // Call store action
    };
    // Mute toggle calls store action directly

    // Seek slider change handler - updates Howler and local time state
    const handleSeek = (value: number[]) => {
        const newTime = value[0];
        if (howlRef.current) {
            howlRef.current.seek(newTime);
        }
        setCurrentTime(newTime); // Update local state immediately for responsive slider
    };
    // Play/Pause, Loop, Shuffle buttons call store actions directly

    // --- Render Logic --- 

    // Conditional rendering for player visibility
    if (!currentTrack) {
        return null; // Don't render anything if no track is loaded
    }

    // Determine volume icon
    const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

    return (
        <div className="player-container fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black via-black/95 to-black/80 backdrop-blur-lg border-t border-white/10 shadow-lg text-white">
            {/* Visualization Canvas (Hidden on smaller screens) */}
            <canvas 
                ref={canvasRef} 
                className="w-full h-6 md:h-10 opacity-60 hidden md:block" 
                aria-hidden="true" 
            />
            
            {/* Main Player Content Area */}
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20 md:h-24">
                    
                    {/* --- Left Section: Track Info --- */}
                    <div className="flex items-center gap-3 w-1/3 md:w-1/4 overflow-hidden">
                        <Image 
                            src={currentTrack.coverImage || 'https://via.placeholder.com/100x100/1f2937/818cf8?text=W'}
                            alt={`${currentTrack.title} cover`}
                            width={48} // Smaller size for player
                            height={48}
                            className="rounded object-cover w-10 h-10 sm:w-12 sm:h-12"
                        />
                        <div className="flex flex-col min-w-0">
                            <Link 
                                href={currentTrack.url || '#'} 
                                className="text-sm font-medium truncate hover:text-indigo-300 transition-colors">
                                {currentTrack.title}
                            </Link>
                            <span className="text-xs text-gray-400 truncate">{currentTrack.artist}</span>
                        </div>
                    </div>

                    {/* --- Center Section: Controls & Seek --- */}
                    <div className="flex flex-col items-center justify-center flex-1 gap-2 px-4">
                        {/* Error Display */} 
                        {error && (
                            <div className="text-center text-xs text-red-400 bg-red-900/30 px-3 py-1 rounded">
                                <p>Error: {error}</p>
                            </div>
                        )}

                        {/* Main Controls (Hide if error) */}
                        {!error && (
                            <div className="flex items-center gap-2 sm:gap-4">
                                <Button 
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleShuffle}
                                    className={cn(
                                        "hidden sm:flex text-gray-400 hover:text-white rounded-full w-8 h-8",
                                        isShuffled && "text-indigo-400 hover:text-indigo-300"
                                    )}
                                    aria-label={isShuffled ? "Disable shuffle" : "Enable shuffle"}
                                >
                                    <Shuffle size={18} />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => { /* TODO: Implement Previous Track */ }}
                                    className="hidden sm:flex text-gray-400 hover:text-white rounded-full w-8 h-8"
                                    aria-label="Previous track"
                                    disabled // Disable until implemented
                                >
                                    <SkipBack size={20} />
                                </Button>
                                <Button 
                                    variant="default" 
                                    size="icon" 
                                    onClick={() => usePlayerStore.getState().togglePlay()} 
                                    className="w-10 h-10 bg-white text-black hover:bg-gray-200 rounded-full shadow-md"
                                    aria-label={isPlaying ? "Pause" : "Play"}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : isPlaying ? (
                                        <Pause size={20} className="fill-black" />
                                    ) : (
                                        <Play size={20} className="fill-black ml-0.5" />
                                    )}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => { /* TODO: Implement Next Track */ }}
                                    className="hidden sm:flex text-gray-400 hover:text-white rounded-full w-8 h-8"
                                    aria-label="Next track"
                                    disabled // Disable until implemented
                                >
                                    <SkipForward size={20} />
                                </Button>
                                <Button 
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleLoop}
                                    className={cn(
                                        "hidden sm:flex text-gray-400 hover:text-white rounded-full w-8 h-8",
                                        loopMode !== 'off' && "text-indigo-400 hover:text-indigo-300"
                                    )}
                                    aria-label={`Loop mode: ${loopMode}`}
                                >
                                    {loopMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                                </Button>
                            </div>
                        )}
                        {/* Seek Bar (Hide if error) */}
                        {!error && (
                             <div className="w-full flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-400 font-mono hidden sm:inline">{formatTime(currentTime)}</span>
                                <Slider 
                                    value={[currentTime]}
                                    max={duration || 1} // Ensure max is at least 1 to prevent errors
                                    step={0.1}
                                    onValueChange={(value) => handleSeek(value)} // Update time visually on drag
                                    // onValueCommit={(value) => handleSeekCommit(value)} // Seek Howler on release (optional)
                                    className="flex-1 [&>span:first-child]:h-1 [&>span>span]:bg-indigo-500 [&>span>span]:h-1.5 [&>span>span]:w-1.5 [&>span>span]:border-0 [&>span>span:focus-visible]:ring-0 [&>span>span:focus-visible]:ring-offset-0 [&>span>span:focus-visible]:shadow-[0_0_0_3px_rgba(99,102,241,0.5)]"
                                    aria-label="Seek track"
                                />
                                <span className="text-xs text-gray-400 font-mono hidden sm:inline">{formatTime(duration)}</span>
                             </div>
                        )}
                    </div>

                    {/* --- Right Section: Volume Control --- */}
                    <div className="hidden sm:flex items-center justify-end gap-2 w-1/3 md:w-1/4">
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={toggleMute} 
                            className="text-gray-400 hover:text-white rounded-full w-8 h-8"
                            aria-label={isMuted ? "Unmute" : "Mute"}
                        >
                            <VolumeIcon size={20} />
                         </Button>
                        <Slider 
                            value={[isMuted ? 0 : volume]}
                            max={100}
                            step={1}
                            onValueChange={handleVolumeChange}
                            className="w-24 [&>span:first-child]:h-1 [&>span>span]:bg-white/80 [&>span>span]:h-1.5 [&>span>span]:w-1.5 [&>span>span]:border-0 [&>span>span:focus-visible]:ring-0 [&>span>span:focus-visible]:ring-offset-0 [&>span>span:focus-visible]:shadow-[0_0_0_3px_rgba(255,255,255,0.3)]"
                            aria-label="Volume"
                        />
                    </div>
                    
                    {/* --- Mobile Only - Simplified View Placeholder --- */} 
                    {/* This section could potentially overlay or be handled differently, 
                       but for now, hiding elements on small screens is the primary approach. 
                       The layout above uses responsive classes (hidden sm:flex etc.) 
                       to achieve the simplified view on smaller screens. 
                    */}

                </div>
            </div>
        </div>
    );
} 