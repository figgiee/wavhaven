'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from "@/components/ui/slider"; // Assuming Slider is added via Shadcn
import { Play, Pause, Volume2, VolumeX, Rewind, FastForward } from 'lucide-react';
import { cn, formatTime } from '@/lib/utils'; // Assuming formatTime util exists
import { usePostHog } from 'posthog-js/react'; // Import PostHog hook

interface AudioPlayerProps {
  audioUrl: string;
  trackId: string; // Add trackId for event tracking
  trackTitle?: string; // Optional title for context/accessibility
  className?: string;
}

export default function AudioPlayer({ audioUrl, trackId, trackTitle = "Track Preview", className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1); // Volume between 0 and 1
  const [isMuted, setIsMuted] = useState(false);
  const posthog = usePostHog(); // Get PostHog instance
  const [hasPlayed, setHasPlayed] = useState(false); // Track if played at least once

  // --- Play/Pause ---
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => console.error("Error playing audio:", error));
      // We only track the first play event per component instance
      if (!hasPlayed && posthog) {
        posthog.capture('track_preview_played', {
            trackId: trackId,
            trackTitle: trackTitle, // Include title for context
            audioUrl: audioUrl, // Include URL for context
        });
        setHasPlayed(true); // Mark as played
      }
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, hasPlayed, posthog, trackId, trackTitle, audioUrl]);

  // --- Time Update ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0); // Reset time when finished
      setHasPlayed(false); // Allow re-tracking if played again after finishing
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);


    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);


    // Set initial duration if metadata already loaded
    if (audio.readyState >= 1) {
        handleLoadedMetadata();
    }


    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // --- Seeking ---
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSeekRelative = (delta: number) => {
    if (!audioRef.current) return;
     let newTime = audioRef.current.currentTime + delta;
     newTime = Math.max(0, Math.min(duration, newTime)); // Clamp within bounds
     audioRef.current.currentTime = newTime;
     setCurrentTime(newTime);
  };


  // --- Volume Control ---
  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    const newVolume = value[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0); // Mute if volume is 0
  };

  const toggleMute = () => {
     if (!audioRef.current) return;
     const newMuted = !isMuted;
     audioRef.current.muted = newMuted;
     setIsMuted(newMuted);
     // If unmuting and volume was 0, set a default volume
     if (!newMuted && volume === 0) {
       handleVolumeChange([0.5]); // Set to 50% volume
     }
   };


  return (
    <div className={cn("flex flex-col items-center gap-2 p-3 bg-muted/50 rounded-lg border w-full max-w-md mx-auto", className)}>
       <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
       {/* <p className="text-sm font-medium truncate w-full text-center">{trackTitle}</p> */}

       {/* Time Display & Seek Bar */}
      <div className="flex items-center gap-2 w-full">
        <span className="text-xs font-mono w-10 text-right">{formatTime(currentTime)}</span>
        <Slider
          value={[currentTime]}
          max={duration || 0}
          step={1}
          onValueChange={handleSeek}
          className="flex-grow cursor-pointer"
          aria-label="Seek audio track"
        />
        <span className="text-xs font-mono w-10 text-left">{formatTime(duration)}</span>
      </div>


      {/* Controls */}
      <div className="flex items-center justify-center gap-3 w-full">
         <Button variant="ghost" size="icon" onClick={() => handleSeekRelative(-10)} title="Rewind 10s">
           <Rewind className="w-5 h-5" />
         </Button>
        <Button variant="outline" size="icon" onClick={togglePlayPause} className="rounded-full w-12 h-12">
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
        </Button>
         <Button variant="ghost" size="icon" onClick={() => handleSeekRelative(10)} title="Forward 10s">
           <FastForward className="w-5 h-5" />
         </Button>

        {/* Volume Control */}
         <div className="flex items-center gap-1 ml-auto">
           <Button variant="ghost" size="icon" onClick={toggleMute}>
             {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
           </Button>
           <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.05}
            onValueChange={handleVolumeChange}
            className="w-20 cursor-pointer"
            aria-label="Volume control"
          />
         </div>
      </div>


    </div>
  );
} 