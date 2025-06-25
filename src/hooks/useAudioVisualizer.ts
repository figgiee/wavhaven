import { useRef, useCallback, useEffect } from 'react';
import { Howl, Howler } from 'howler';
import { usePlayerStore } from '@/stores/use-player-store';

// Define constants for visualization
const FFT_SIZE = 256;
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const BAR_COLOR = '#00E0FF'; // cyan-glow hex

interface UseAudioVisualizerReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  setupVisualization: () => boolean;
  cleanupVisualization: () => void;
}

export function useAudioVisualizer(howlRef: React.RefObject<Howl | null>): UseAudioVisualizerReturn {
  const { isPlaying } = usePlayerStore();
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vizAnimationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const audioSourceNodeRef = useRef<AudioNode | null>(null);

  // --- Visualization Setup ---
  const setupVisualization = useCallback(() => {
    if (!howlRef.current || !Howler.ctx || analyserRef.current) {
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
      // Note: This accesses Howler's internal masterGain property
      const sourceNode: AudioNode = (Howler as { masterGain?: AudioNode }).masterGain;
      if (!sourceNode) {
        console.error("[Viz] Could not get Howler's master gain node.");
        analyserRef.current = null;
        dataArrayRef.current = null;
        return false;
      }
      
      console.log("[Viz] Setting up connection: Howler Master Gain -> Analyser");
      sourceNode.connect(analyser);
      audioSourceNodeRef.current = sourceNode;

      console.log('[Viz] Analyser setup complete.');
      return true;

    } catch (e) {
      console.error('[Viz] Error setting up AnalyserNode:', e);
      analyserRef.current = null;
      dataArrayRef.current = null;
      audioSourceNodeRef.current = null;
      return false;
    }
  }, [howlRef]);

  // --- Visualization Drawing Loop ---
  const drawVisualization = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current || !isPlaying) {
      if (vizAnimationFrameRef.current) {
        cancelAnimationFrame(vizAnimationFrameRef.current);
        vizAnimationFrameRef.current = null;
      }
      return;
    }

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bufferLength = analyser.frequencyBinCount;
    const barCount = Math.floor(canvas.width / (BAR_WIDTH + BAR_GAP));
    const step = Math.floor(bufferLength / barCount);

    let barX = 0;
    for (let i = 0; i < barCount; i++) {
      let barHeightSum = 0;
      // Average frequency data for the bar
      for (let j = 0; j < step; j++) {
        barHeightSum += dataArray[i * step + j];
      }
      const barHeightAverage = barHeightSum / step;
      const barHeightScaled = (barHeightAverage / 255) * canvas.height * 0.8;

      ctx.fillStyle = BAR_COLOR;
      // Draw bar centered vertically
      ctx.fillRect(barX, (canvas.height - barHeightScaled) / 2, BAR_WIDTH, Math.max(1, barHeightScaled));
      
      barX += BAR_WIDTH + BAR_GAP;
    }

    vizAnimationFrameRef.current = requestAnimationFrame(drawVisualization);
  }, [isPlaying]);

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
    audioSourceNodeRef.current = null;

    // Clear the canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  // --- Start Visualization Effect ---
  useEffect(() => {
    if (isPlaying && analyserRef.current && !vizAnimationFrameRef.current) {
      console.log('[Viz] Starting draw loop from useEffect');
      drawVisualization();
    } else if (!isPlaying && vizAnimationFrameRef.current) {
      console.log('[Viz] Stopping draw loop from useEffect');
      cancelAnimationFrame(vizAnimationFrameRef.current);
      vizAnimationFrameRef.current = null;
    }
  }, [isPlaying, drawVisualization]);

  return {
    canvasRef,
    setupVisualization,
    cleanupVisualization,
  };
} 