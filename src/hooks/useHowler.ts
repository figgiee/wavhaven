import { useState, useRef, useCallback, useEffect } from 'react';
import { Howl, Howler } from 'howler';
import { toast } from 'sonner';
import { usePlayerStore } from '@/stores/use-player-store';
import { PlayerTrack } from '@/types';
import { incrementPlayCount } from '@/server-actions/tracks/trackInteractions';

interface UseHowlerReturn {
  howlRef: React.RefObject<Howl | null>;
  currentTime: number;
  duration: number;
  handleSeek: (time: number) => void;
}

export function useHowler(): UseHowlerReturn {
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    loopMode,
    playNext,
    setPlayState,
    setLoading,
    setError,
  } = usePlayerStore();

  const howlRef = useRef<Howl | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playCountIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCountedPlayRef = useRef<boolean>(false);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // --- Time Update Logic ---
  const updateCurrentTime = useCallback(() => {
    const howl = howlRef.current;
    const storeIsPlaying = usePlayerStore.getState().isPlaying;

    if (howl && howl.state() === 'loaded') {
      const time = howl.seek() as number;
      setCurrentTime(time);

      if (storeIsPlaying) {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
      } else {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // --- Howler Instance Cleanup ---
  const cleanupHowl = useCallback(() => {
    console.log("[Howl] Cleaning up Howl instance.");
    if (playCountIntervalRef.current) {
      clearInterval(playCountIntervalRef.current);
      playCountIntervalRef.current = null;
    }
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
  }, []);

  // --- Setup Play Count Tracking ---
  const setupPlayCountTracking = useCallback((trackId: string) => {
    if (!trackId) return;
    
    hasCountedPlayRef.current = false;
    if (playCountIntervalRef.current) clearInterval(playCountIntervalRef.current);

    playCountIntervalRef.current = setInterval(async () => {
      if (hasCountedPlayRef.current) return;
      
      const howl = howlRef.current;
      if (!howl) return;

      const currentTime = howl.seek() as number;
      const duration = howl.duration() || 0;
      
      // Count as played if user has listened to at least 30 seconds or 50% of track
      const hasPlayedEnough = currentTime >= 30 || (duration > 0 && currentTime / duration >= 0.5);
      
      if (hasPlayedEnough && !hasCountedPlayRef.current) {
        hasCountedPlayRef.current = true;
        try {
          console.log(`[PlayCount] Incrementing play count for track ${trackId}`);
          await incrementPlayCount(trackId);
        } catch (error) {
          console.error('[PlayCount] Failed to increment play count:', error);
        }
      }
    }, 5000); // Check every 5 seconds
  }, []);

  // --- Howler Instance Creation/Update Effect ---
  useEffect(() => {
    // Ensure Howler's context is running
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume().then(() => {
        console.log("AudioContext resumed successfully.");
      }).catch(e => console.error("Error resuming AudioContext:", e));
    }

    cleanupHowl(); // Clean up previous instance first

    if (currentTrack?.audioSrc) {
      setLoading(true);
      setError(null);
      setCurrentTime(0);
      setDuration(0);
      hasCountedPlayRef.current = false;

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
          
          if (usePlayerStore.getState().isPlaying) {
            console.log("[Howler onload] Store wants play. Calling play()");
            newHowl.play();
          }
        },
        onplay: () => {
          console.log(`%c[Howler Event] onplay: ${currentTrack?.title}`, 'color: green');
          setPlayState(true);
          updateCurrentTime();
          
          // Setup play count tracking
          if (currentTrack.id) {
            setupPlayCountTracking(currentTrack.id);
          }
        },
        onpause: () => {
          console.log(`%c[Howler Event] onpause triggered.`, 'color: orange');
          setPlayState(false);
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
          if (playCountIntervalRef.current) {
            clearInterval(playCountIntervalRef.current);
            playCountIntervalRef.current = null;
          }
        },
        onend: () => {
          console.log(`%c[Howler Event] onend: ${currentTrack?.title}`, 'color: grey');
          setPlayState(false);
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
          if (loopMode !== 'one') {
            setCurrentTime(0);
            playNext();
          }
          if (playCountIntervalRef.current) {
            clearInterval(playCountIntervalRef.current);
            playCountIntervalRef.current = null;
          }
        },
        onseek: () => {
          const seekTime = howlRef.current?.seek() as number;
          if (seekTime !== undefined) setCurrentTime(seekTime);
          console.log('[Howler Event] onseek');
        },
        onloaderror: (id, err) => {
          const msg = `Load Error: ${err}`;
          setError(msg);
          setLoading(false);
          toast.error("Track Load Failed", { description: String(err) });
          cleanupHowl();
        },
        onplayerror: (id, err) => {
          const msg = `Playback Error: ${err}`;
          setError(msg);
          setLoading(false);
          setPlayState(false);
          toast.error("Playback Failed", { description: String(err) });
          cleanupHowl();
        },
      });
      howlRef.current = newHowl;
    }

    return () => {
      console.log('[Effect Cleanup] Cleaning up Howl due to track/deps change.');
      cleanupHowl();
    };
  }, [
    currentTrack?.id,
    currentTrack?.audioSrc,
    currentTrack?.title,
    volume,
    isMuted,
    cleanupHowl,
    setLoading,
    setPlayState,
    updateCurrentTime,
    loopMode,
    playNext,
    setError,
    setupPlayCountTracking,
  ]);

  // --- Sync Store Play State -> Howler ---
  useEffect(() => {
    const howl = howlRef.current;
    if (!howl || howl.state() !== 'loaded') return;

    const howlIsPlaying = howl.playing();

    if (isPlaying && !howlIsPlaying) {
      console.log('[Sync Effect] Action: Calling howl.play()');
      howl.play();
    } else if (!isPlaying && howlIsPlaying) {
      console.log('[Sync Effect] Action: Calling howl.pause()');
      howl.pause();
    }
  }, [isPlaying]);

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

  // --- Seek Handler ---
  const handleSeek = useCallback((time: number) => {
    if (howlRef.current) {
      howlRef.current.seek(time);
      setCurrentTime(time);
      if (usePlayerStore.getState().isPlaying) {
        updateCurrentTime();
      }
    }
  }, [updateCurrentTime]);

  return {
    howlRef,
    currentTime,
    duration,
    handleSeek,
  };
} 