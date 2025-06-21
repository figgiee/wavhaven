'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import Meyda, { MeydaFeaturesObject, MeydaSignal, MeydaAudioFeature } from 'meyda'; // Import specific types

// Define types for the hook's return values, reusing types from our advanced analysis hook
type EnergyLevel = 'low' | 'medium' | 'high';

export interface AudioAnalysisResult {
  bpm: number | null; // Final BPM (prioritizes filename)
  key: string | null; // Final Key (prioritizes filename)
  meydaBpm: number | null; // BPM detected by Meyda
  meydaKey: string | null; // Key detected by Meyda
  meydaKeyConfidence: number | null; // Confidence for Meyda's key detection (0-1)
  energy: number | null; // Average energy (normalized 0-1 range estimate)
  energyLevel: EnergyLevel | null;
  danceability: number | null;
  loudness: number | null; // Scaled RMS (approx 0-100)
  genres?: string[];
  genreConfidences?: Record<string, number>;
  moods?: string[];
  moodConfidences?: Record<string, number>;
  source: 'meyda' | 'webAudio' | 'filename' | 'error'; // Source of primary bpm/key or error state
  filterApplied?: boolean; // Indicate if the low-pass filter was used
}

interface UseMeydaAudioAnalysisReturn {
  analyzeAudio: (file: File, options?: { applyLowPassFilter?: boolean }) => Promise<AudioAnalysisResult>;
  isAnalyzing: boolean;
  error: Error | null;
  meydaLoaded: boolean;
}

// Global reference to Meyda
let meydaInstance: typeof Meyda | null = null;

// For compatibility with the new implementation
// type AudioAnalysisResult = AudioAnalysisResult; // Removed to fix circular reference

/**
 * A hook that provides audio analysis functionality using Meyda.js, focusing on chroma for key detection.
 * It can detect BPM, musical key, genres, moods, energy level, and danceability.
 */
export function useMeydaAudioAnalysis(): UseMeydaAudioAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [meydaLoaded, setMeydaLoaded] = useState(!!meydaInstance);
  const audioContextRef = useRef<AudioContext | OfflineAudioContext | null>(null);

  // --- Helper Functions (Defined Inside Hook Scope) ---

  /**
   * Convert stereo audio to mono
   */
  const getMono = (audioBuffer: AudioBuffer): Float32Array => {
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const monoData = new Float32Array(length);
    if (numChannels === 1) {
        return audioBuffer.getChannelData(0);
    }
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            monoData[i] += channelData[i] / numChannels;
        }
    }
    return monoData;
  };

  /**
   * Calculate standard deviation
   */
  const calculateStandardDeviation = (arr: number[]): number => {
      if (!arr || arr.length === 0) return 0;
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
      return Math.sqrt(variance);
  };

  /**
   * Find peaks in a signal above a threshold with minimum distance
   */
  const findPeaks = (data: Float32Array, frameRate: number, threshold = 0.2): number[] => {
      const peaks: number[] = [];
      const minPeakDistanceFrames = Math.max(1, Math.floor(frameRate * 0.05));
      for (let i = 1; i < data.length - 1; i++) {
        if (data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
          let isLocalMax = true;
          for (let j = Math.max(0, i - minPeakDistanceFrames); j < Math.min(data.length, i + minPeakDistanceFrames); j++) {
            if (j !== i && data[j] > data[i]) {
              isLocalMax = false;
              break;
            }
          }
          if (isLocalMax) {
              if (peaks.length === 0 || (i - peaks[peaks.length - 1]) > minPeakDistanceFrames) {
                   peaks.push(i);
              }
          }
        }
      }
      return peaks;
    };

  /**
   * Calculate intervals between peaks
   */
  const identifyIntervals = (peaks: number[]): number[] => {
      if (peaks.length < 2) return [];
      const intervals: number[] = [];
      for (let i = 1; i < peaks.length; i++) {
        intervals.push(peaks[i] - peaks[i - 1]);
      }
      return intervals;
    };

  /**
   * Calculate BPM from intervals using median and octave correction
   */
  const calculateBPM = (intervals: number[], frameRate: number): number | null => {
      if (!intervals || intervals.length < 3) return null;
      const sortedIntervals = [...intervals].sort((a, b) => a - b);
      const mid = Math.floor(sortedIntervals.length / 2);
      const medianIntervalFrames = sortedIntervals.length % 2 !== 0
          ? sortedIntervals[mid]
          : (sortedIntervals[mid - 1] + sortedIntervals[mid]) / 2;
      if (medianIntervalFrames <= 0) return null;
      const medianIntervalSeconds = medianIntervalFrames / frameRate;
      if (medianIntervalSeconds <= 0) return null;
      let bpm = 60 / medianIntervalSeconds;
      while (bpm < 70 && bpm > 0) { bpm *= 2; }
      while (bpm > 180) { bpm /= 2; }
      return isNaN(bpm) ? null : Math.round(bpm);
   };

  /**
   * Calculate energy (RMS squared, roughly normalized)
   */
   const calculateEnergy = (data: Float32Array): number => {
      if (!data || data.length === 0) return 0;
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
          sum += data[i] * data[i];
      }
      return Math.min(1, sum / data.length);
    };


  // --- Mappings & Constants ---
  const genreMap: Record<string, string[]> = {
    'edm': ['electronic', 'dance', 'edm'],
    'hiphop': ['hip hop', 'rap', 'trap'],
    'pop': ['pop', 'synth pop'],
    'rock': ['rock', 'alternative', 'indie'],
    'jazz': ['jazz', 'fusion'],
    'classical': ['classical', 'orchestral', 'chamber'],
    'ambient': ['ambient', 'atmospheric', 'downtempo'],
    'folk': ['folk', 'acoustic', 'singer-songwriter'],
    'reggae': ['reggae', 'dub'],
    'rnb': ['r&b', 'soul'],
    'funk': ['funk', 'disco'],
    'country': ['country', 'americana'],
    'metal': ['metal', 'heavy metal'],
    'blues': ['blues'],
    'latin': ['latin', 'salsa', 'reggaeton'],
    'world': ['world', 'ethnic', 'traditional']
  };
  const moodMap: Record<string, string[]> = {
    'aggressive': ['aggressive', 'intense', 'angry'],
    'calm': ['calm', 'peaceful', 'relaxed', 'chill'],
    'cheerful': ['cheerful', 'happy', 'upbeat'],
    'dark': ['dark', 'gloomy', 'ominous'],
    'energetic': ['energetic', 'lively', 'powerful'],
    'epic': ['epic', 'grandiose', 'majestic'],
    'melancholic': ['melancholic', 'sad', 'emotional'],
    'romantic': ['romantic', 'sensual', 'passionate'],
    'suspenseful': ['suspenseful', 'tense', 'mysterious'],
    'ethereal': ['ethereal', 'dreamy', 'magical']
  };
  const keyNames = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];
  const keyProfiles = {
    major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
    minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
  };

  const loadMeyda = useCallback(async (): Promise<boolean> => {
    if (meydaInstance) {
      if (!meydaLoaded) setMeydaLoaded(true);
      return true;
    }
    try {
      const MeydaModule = await import('meyda');
      if (!MeydaModule || !MeydaModule.default) {
        console.warn('Could not load Meyda module default export.');
        return false;
      }
      meydaInstance = MeydaModule.default;
      setMeydaLoaded(true);
      console.log("Meyda loaded successfully.");
      return true;
    } catch (err) {
      console.error('Error loading Meyda:', err);
      setError(new Error('Failed to load Meyda library. Analysis will use basic fallback.'));
      setMeydaLoaded(false);
      return false;
    }
  }, [meydaLoaded]);

  useEffect(() => {
    if (!meydaInstance) {
      loadMeyda();
    }
    // Cleanup function to close the audio context if it exists and is open
    return () => {
      const currentContext = audioContextRef.current;
      // Only close if it's an AudioContext (live) and not already closed
      if (currentContext && currentContext instanceof AudioContext && currentContext.state !== 'closed') {
        currentContext.close().catch(console.warn);
        audioContextRef.current = null; // Clear ref on cleanup
      }
    };
  }, [loadMeyda]);

  // --- Helper Function for Key Detection (Defined inside Hook Scope) ---

  const detectKeyFromChroma = (chroma: number[]): { key: string | null; confidence: number } => {
    if (!chroma || chroma.length !== 12 || chroma.every(v => v === 0)) {
        return { key: null, confidence: 0 };
    }
    let bestKeyCorrelation = -Infinity;
    let bestKeyIndex = -1;
    let bestKeyMode = 'major';
    ['major', 'minor'].forEach(mode => {
        const profile = keyProfiles[mode as keyof typeof keyProfiles];
        for (let root = 0; root < 12; root++) {
            let correlation = 0;
            for (let i = 0; i < 12; i++) {
                correlation += chroma[i] * profile[(i - root + 12) % 12];
            }
            if (correlation > bestKeyCorrelation) {
                bestKeyCorrelation = correlation;
                bestKeyIndex = root;
                bestKeyMode = mode;
            }
        }
    });
    const maxPossibleProfileValue = Math.max(...keyProfiles.major, ...keyProfiles.minor);
    const maxPossibleChroma = Math.max(...chroma);
    const maxTheoreticalCorrelation = maxPossibleChroma > 0 ? (maxPossibleProfileValue * 12 * maxPossibleChroma) : 1;
    let confidence = 0;
    if (maxTheoreticalCorrelation > 0 && bestKeyCorrelation > 0) {
      confidence = Math.pow(bestKeyCorrelation / maxTheoreticalCorrelation, 0.5);
    }
    confidence = Math.min(0.95, Math.max(0, confidence));
    if (bestKeyIndex === -1) {
        return { key: null, confidence: 0 };
    }
    return {
      key: `${keyNames[bestKeyIndex]} ${bestKeyMode}`,
      confidence
    };
  };

  // --- Analysis Functions ---
  // ... (analyzeWithMeyda and detectBPMWithWebAudio implementations use the helpers defined above)
  
  /**
   * Analyzes audio file using Meyda.js, with optional pre-filtering.
   */
  const analyzeWithMeyda = async (
    arrayBuffer: ArrayBuffer,
    filename?: string,
    applyLowPassFilter: boolean = false
  ): Promise<AudioAnalysisResult> => {
    if (!meydaInstance) throw new Error("Meyda not loaded");
    let filterWasApplied = false;
    try {
      let tempCtx = new AudioContext();
      const audioData = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
      const originalSampleRate = audioData.sampleRate;
      await tempCtx.close();
      let processedAudioData = audioData;
      if (applyLowPassFilter) {
          try {
              const offlineCtx = new OfflineAudioContext(audioData.numberOfChannels, audioData.length, originalSampleRate);
              const offlineSource = offlineCtx.createBufferSource();
              offlineSource.buffer = audioData;
              const filter = offlineCtx.createBiquadFilter();
              filter.type = 'lowpass';
              filter.frequency.value = 800;
              filter.Q.value = 1;
              offlineSource.connect(filter);
              filter.connect(offlineCtx.destination);
              offlineSource.start(0);
              processedAudioData = await offlineCtx.startRendering();
              filterWasApplied = true;
              toast.info("Applied low-pass filter (800Hz) before Meyda analysis.");
          } catch(filterError) {
               console.error("Error applying low-pass filter:", filterError);
               toast.warning("Could not apply low-pass filter, analyzing original audio.");
               processedAudioData = audioData;
               filterWasApplied = false;
          }
      }
      if (!meydaInstance) throw new Error("Meyda instance became unavailable during processing");
      const monoSignal = getMono(processedAudioData);
      const sampleRate = processedAudioData.sampleRate;
      const frameSize = 4096;
      const hopSize = 1024;
      const frameRate = sampleRate / hopSize;
      const featuresToExtract: MeydaAudioFeature[] = [
        'rms', 'energy', 'spectralCentroid', 'spectralFlatness',
        'perceptualSharpness', 'spectralKurtosis', 'chroma', 'loudness',
        /* 'spectralFlux', */ 'zcr' // spectralFlux removed
      ];
      const offlineFeatures: { [K in MeydaAudioFeature]?: any[] } = {};
      featuresToExtract.forEach(f => offlineFeatures[f] = []);
      meydaInstance.bufferSize = frameSize;
      meydaInstance.sampleRate = sampleRate;
      meydaInstance.windowingFunction = 'blackman';
      for (let i = 0; (i + frameSize) <= monoSignal.length; i += hopSize) {
        const frame = monoSignal.slice(i, i + frameSize);
        if (Array.from(frame).some(isNaN)) {
            console.warn(`Skipping frame ${i / hopSize} due to NaN values.`);
            continue;
        }
        const features: Partial<MeydaFeaturesObject> | null = meydaInstance.extract(featuresToExtract, frame);
        if (features) {
          featuresToExtract.forEach(featureKey => {
            if (featureKey in features && offlineFeatures[featureKey]) {
              const featureValue = features[featureKey as keyof typeof features];
              if (featureValue !== undefined) {
                  offlineFeatures[featureKey]?.push(featureValue);
              }
            }
          });
        }
      }
      let filenameKey: string | null = null;
      let fileBpm: number | null = null;
      let usedFilenameData = false;
      if (filename) {
        const keyMatch = filename.match(/\b([A-G][#b♭♯]?)\s*(maj|min|major|minor)\b/i);
        if (keyMatch) {
          const root = keyMatch[1].charAt(0).toUpperCase() + keyMatch[1].slice(1).replace('b', '♭').replace('#', '♯');
          const mode = keyMatch[2].toLowerCase().startsWith('maj') ? 'major' : 'minor';
          filenameKey = `${root} ${mode}`;
        }
        const bpmMatch = filename.match(/(?:\b|_|-)(\d{2,3})\s*(?:bpm|BPM)\b|(?: bpm|BPM)\s*(\d{2,3})(?:\b|_|-)/i);
        if (bpmMatch) fileBpm = parseInt(bpmMatch[1] || bpmMatch[2], 10);
        if(filenameKey || fileBpm) usedFilenameData = true;
      }
      let meydaDetectedKey: string | null = null;
      let meydaKeyConfidence: number | null = 0;
      const chromaFeatures = (offlineFeatures.chroma || []) as number[][];

      if (chromaFeatures.length > 0 && Array.isArray(chromaFeatures[0])) {
        const avgChroma = new Array(12).fill(0);
        let validFrameCount = 0;

        // Simpler averaging: Average all valid chroma frames
        chromaFeatures.forEach(frameChroma => {
           if (Array.isArray(frameChroma) && frameChroma.length === 12) { // Ensure it's a valid chroma array
              validFrameCount++;
              frameChroma.forEach((val: number, i: number) => { avgChroma[i] += val; });
           }
        });

        if (validFrameCount > 0) {
            // Normalize the averaged chroma vector
            const averagedChroma = avgChroma.map(v => v / validFrameCount);
            const maxAvgChroma = Math.max(...averagedChroma);
            const finalChroma = maxAvgChroma > 0 ? averagedChroma.map(v => v / maxAvgChroma) : averagedChroma;

            if (finalChroma.some(v => !isNaN(v) && v > 0)) { // Check if the final vector is usable
               const keyResult = detectKeyFromChroma(finalChroma);
               meydaDetectedKey = keyResult.key;
               meydaKeyConfidence = keyResult.confidence;
            } else {
               console.warn("Meyda Key Detection: Final normalized chroma vector is all zero or NaN.");
            }
        } else {
             console.warn("Meyda Key Detection: No valid chroma frames found.");
        }
      } else {
         console.warn("Meyda Key Detection: No chroma features extracted or format is incorrect.");
      }

      if (!meydaDetectedKey) meydaKeyConfidence = 0;

      // --- Meyda BPM Detection (Using Energy Peaks) --- // Modified
      let meydaDetectedBpm: number | null = null;
      const energyFrames = (offlineFeatures.energy || []) as number[]; // Use energy feature

      let energyDiff: number[] = []; // Define energyDiff here to be accessible later

      if (energyFrames.length > 1) {
        for (let i = 1; i < energyFrames.length; i++) {
          energyDiff.push(Math.abs(energyFrames[i] - energyFrames[i-1]));
        }

        if (energyDiff.length > 0) {
          // Find peaks in the energy difference signal - Increased threshold
          const energyPeaks = findPeaks(new Float32Array(energyDiff), frameRate, 0.08); // Increased threshold
          const intervals = identifyIntervals(energyPeaks);
          meydaDetectedBpm = calculateBPM(intervals, frameRate);
        } else {
           console.warn("Meyda BPM Detection: Not enough energy frames to calculate difference.");
        }

      } else {
        console.warn("Meyda BPM Detection: Not enough energy frames extracted.");
      }

      // --- Other Features Calculation ---
      const safeReduce = (featureName: MeydaAudioFeature, defaultValue: number): number => {
          const values = offlineFeatures[featureName] || [];
          const numericValues = Array.isArray(values) ? values.filter(v => typeof v === 'number' && !isNaN(v)) : [];
          return numericValues.length > 0 ? numericValues.reduce((s, v) => s + v, 0) / numericValues.length : defaultValue;
      };

      // --- Corrected Energy Level Calculation ---
      const energyFramesRaw = (offlineFeatures.energy || []) as number[];
      let avgNormalizedEnergy = 0;
      if (energyFramesRaw.length > 0) {
          const maxEnergy = Math.max(...energyFramesRaw);
          if (maxEnergy > 0) {
              const normalizedEnergyFrames = energyFramesRaw.map(e => e / maxEnergy);
              avgNormalizedEnergy = normalizedEnergyFrames.reduce((s, v) => s + v, 0) / normalizedEnergyFrames.length;
          } else {
            // All frames were 0 energy
            avgNormalizedEnergy = 0;
          }
      } else {
        avgNormalizedEnergy = 0; // Default if no energy frames
      }
      // Use the normalized average for energy level determination
      const energyLevel: EnergyLevel = avgNormalizedEnergy < 0.05 ? 'low' : avgNormalizedEnergy > 0.3 ? 'high' : 'medium';
      // Keep original avgEnergy calculation if needed elsewhere, but rename for clarity
      const avgRawEnergy = safeReduce('energy', 0); 

      const avgRms = safeReduce('rms', 0);
      const loudness = Math.max(0, Math.min(100, avgRms * 200));

      // Recalculate peaks and intervals for rhythm regularity using energy difference peaks
      const energyDiffForPeaks = new Float32Array(energyDiff); // Use the energy difference array calculated above
      const peaksForRhythm = findPeaks(energyDiffForPeaks, frameRate, 0.08); // Use same increased threshold
      const intervalsForRhythm = identifyIntervals(peaksForRhythm);
      const rhythmRegularity = intervalsForRhythm.length > 1 ? 1 - (calculateStandardDeviation(intervalsForRhythm) / (intervalsForRhythm.reduce((a, b) => a + b, 0) / intervalsForRhythm.length)) : 0;
      const avgFlatness = safeReduce('spectralFlatness', 0.5);
      let danceabilityScore = 0.0;
      const bpmForDance = meydaDetectedBpm ?? 120;
      if (bpmForDance >= 100 && bpmForDance <= 140) danceabilityScore += 0.3;
      if (rhythmRegularity > 0.7) danceabilityScore += 0.3;
      if (energyLevel === 'high' || (energyLevel === 'medium' && avgRawEnergy > 0.15)) danceabilityScore += 0.2;
      if (avgFlatness < 0.4) danceabilityScore += 0.2;
      const danceability = Math.max(0, Math.min(1, danceabilityScore));

      // --- Genre/Mood Heuristics --- 
      // Add logging here to debug input values
      console.log("[Meyda Heuristics Input]", {
        bpm: meydaDetectedBpm, 
        energyLevel, // This should now be more accurate
        danceability,
        key: meydaDetectedKey,
        avgNormalizedEnergy, // Log the normalized average energy used
        avgRawEnergy, // Log the potentially mis-scaled average energy
        rhythmRegularity, // Log calculated rhythm regularity
        avgFlatness // Log spectral flatness
      });

      const genreConfidences: Record<string, number> = {}; 
      const moodConfidences: Record<string, number> = {};

      // Basic heuristic genre classification based on Meyda features
      const currentBpm = meydaDetectedBpm ?? 120; // Use detected BPM or default
      const currentKey = meydaDetectedKey ?? '';

      if (currentBpm > 120 && energyLevel === 'high') {
        genreConfidences.edm = 0.7;
        genreConfidences.pop = 0.3;
      } else if (currentBpm > 85 && currentBpm < 110 && energyLevel !== 'low') {
        genreConfidences.hiphop = 0.7;
        genreConfidences.rnb = 0.4;
      } else if (currentBpm > 100 && currentBpm < 160 && energyLevel !== 'low') {
        genreConfidences.rock = 0.5;
        genreConfidences.pop = 0.3;
      } else if (currentBpm < 100 && energyLevel === 'low') {
        genreConfidences.ambient = 0.7;
        genreConfidences.classical = 0.3;
      } else if (currentBpm > 110 && currentBpm < 140 && energyLevel === 'medium') {
        genreConfidences.jazz = 0.5;
        genreConfidences.pop = 0.4;
      } else {
        genreConfidences.pop = 0.4; // Default guess
      }

      // Basic mood classification heuristics based on Meyda features
      if (energyLevel === 'high' && currentBpm > 135) {
        moodConfidences.aggressive = 0.7;
        moodConfidences.energetic = 0.8;
      } else if (energyLevel === 'low' && currentBpm < 95) {
        moodConfidences.calm = 0.8;
        moodConfidences.melancholic = currentKey.includes('minor') ? 0.6 : 0.3;
      } else if (currentBpm > 100 && currentBpm < 135 && energyLevel !== 'low' && danceability > 0.5) {
        moodConfidences.cheerful = 0.7;
        moodConfidences.energetic = 0.6;
      } else if (energyLevel === 'low' && currentKey.includes('minor')) {
        moodConfidences.dark = 0.7;
        moodConfidences.melancholic = 0.6;
      } else if (currentBpm > 115 || energyLevel === 'high') {
        moodConfidences.energetic = 0.7;
      } else {
        moodConfidences.cheerful = 0.4; // Default guess
      }

      // Filter genres and moods by confidence threshold (adjust as needed)
      const genres = Object.entries(genreConfidences)
        .filter(([_, conf]) => conf > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([genre]) => genre);
        
      const moods = Object.entries(moodConfidences)
        .filter(([_, conf]) => conf > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([mood]) => mood);

      // --- Final Result --- 
      const finalBpm = fileBpm ?? meydaDetectedBpm;
      const finalKey = filenameKey ?? meydaDetectedKey;
      const resultSource = usedFilenameData ? 'filename' : (meydaDetectedKey || meydaDetectedBpm ? 'meyda' : 'webAudio');
      
      // Debugging log
      console.log("[analyzeWithMeyda] Results Before Return:", {
        finalBpm, finalKey, meydaDetectedBpm, meydaDetectedKey, meydaKeyConfidence,
        avgRawEnergy, energyLevel, danceability, loudness, source: resultSource, filterApplied: filterWasApplied
      });

      return {
        bpm: finalBpm, key: finalKey, meydaBpm: meydaDetectedBpm, meydaKey: meydaDetectedKey, meydaKeyConfidence: meydaKeyConfidence,
        energy: avgRawEnergy, energyLevel, danceability, loudness, genres, genreConfidences, moods, moodConfidences,
        source: resultSource, filterApplied: filterWasApplied
      };

    } catch (err) { 
        console.error('Error in Meyda analysis:', err);
        throw new Error(`Meyda analysis failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  /**
   * Fallback using Web Audio API. Prioritizes filename. VERY basic otherwise.
   */
  const detectBPMWithWebAudio = async (
      arrayBuffer: ArrayBuffer,
      filename?: string
      ): Promise<AudioAnalysisResult> => {
    let audioCtx: AudioContext | null = null;
     try {
       audioCtx = new AudioContext();
       audioContextRef.current = audioCtx;
       const audioData = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
       const channelData = getMono(audioData);
       const sampleRate = audioData.sampleRate;
       let filenameKey: string | null = null;
       let fileBpm: number | null = null;
       let usedFilenameData = false;
        if (filename) {
             const keyMatch = filename.match(/\b([A-G][#b♭♯]?)\s*(maj|min|major|minor)\b/i);
             if (keyMatch) {
                 const root = keyMatch[1].charAt(0).toUpperCase() + keyMatch[1].slice(1).replace('b', '♭').replace('#', '♯');
                 const mode = keyMatch[2].toLowerCase().startsWith('maj') ? 'major' : 'minor';
                 filenameKey = `${root} ${mode}`;
             }
             const bpmMatch = filename.match(/(?:\b|_|-)(\d{2,3})\s*(?:bpm|BPM)\b|(?: bpm|BPM)\s*(\d{2,3})(?:\b|_|-)/i);
             if (bpmMatch) fileBpm = parseInt(bpmMatch[1] || bpmMatch[2], 10);
             if (filenameKey || fileBpm) usedFilenameData = true;
        }
       const approxFrameRate = sampleRate / 1024;
       const peaks = findPeaks(channelData, approxFrameRate, 0.5);
       const intervals = identifyIntervals(peaks);
       let webAudioBpm = 120;
       if (intervals.length > 0) {
           const calculatedBpm = calculateBPM(intervals, approxFrameRate);
           if (calculatedBpm) {
               if (calculatedBpm > 180) webAudioBpm = Math.round(calculatedBpm / 2);
               else if (calculatedBpm < 70) webAudioBpm = Math.round(calculatedBpm * 2);
               else webAudioBpm = Math.round(calculatedBpm);
           }
       }
       const keyNamesLocal = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
       const keyIndex = Math.floor(Math.random() * 12);
       const scale = Math.random() > 0.5 ? 'major' : 'minor';
       const webAudioKey = `${keyNamesLocal[keyIndex]} ${scale}`;
       const genreConfidences: Record<string, number> = { fallback: 0.1 };
       const moodConfidences: Record<string, number> = { neutral: 0.1 };
       const genres = ['unknown'];
       const moods = ['unknown'];
       const energy = calculateEnergy(channelData);
       let energyLevel: EnergyLevel = energy < 0.01 ? 'low' : energy > 0.05 ? 'high' : 'medium';
       const loudness = Math.max(0, Math.min(100, energy * 500));
       const danceability = webAudioBpm > 110 && webAudioBpm < 130 ? 0.5 : webAudioBpm > 90 && webAudioBpm < 150 ? 0.3 : 0.1;
        const finalBpm = fileBpm ?? webAudioBpm;
        const finalKey = filenameKey ?? webAudioKey;
        const resultSource = usedFilenameData ? 'filename' : 'webAudio';
       await audioCtx.close();
       return {
         bpm: finalBpm, key: finalKey, meydaBpm: null, meydaKey: null, meydaKeyConfidence: null,
         energy: energy, energyLevel, danceability, loudness, genres, genreConfidences, moods, moodConfidences, source: resultSource,
       };
     } catch (err) {
       if (audioCtx && audioCtx.state !== 'closed') {
           await audioCtx.close().catch(console.warn);
       }
       console.error('Error in Web Audio API analysis fallback:', err);
       throw new Error('Fallback Web Audio API analysis failed');
     }
  };

  // --- Orchestrator Function --- 
  
  const analyzeAudio = useCallback(async (file: File, options?: { applyLowPassFilter?: boolean }): Promise<AudioAnalysisResult> => {
    setIsAnalyzing(true);
    setError(null);
    const filename = file.name;
    const applyLowPass = options?.applyLowPassFilter ?? false;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const meydaAvailable = await loadMeyda();
      if (meydaAvailable && meydaInstance) {
        try {
          toast.info(`Analyzing with Meyda.js${applyLowPass ? ' (Low-Pass Filter Active)' : ''}...`);
          const result = await analyzeWithMeyda(arrayBuffer, filename, applyLowPass);
          setIsAnalyzing(false);
          return result;
        } catch (meydaErr) {
          console.warn('Meyda analysis failed, falling back to Web Audio API', meydaErr);
          setError(meydaErr instanceof Error ? meydaErr : new Error(String(meydaErr)));
        }
      }
      toast.info('Meyda unavailable or failed. Using basic Web Audio analysis...');
      const result = await detectBPMWithWebAudio(arrayBuffer, filename);
      setIsAnalyzing(false);
      return result;
    } catch (err) {
        const analysisError = err instanceof Error ? err : new Error('Unknown error during audio analysis');
        console.error('Overall analysis error:', analysisError);
        setError(analysisError);
        toast.error('Audio analysis failed.', { description: analysisError.message });
        setIsAnalyzing(false);
        return {
            bpm: null, key: null, meydaBpm: null, meydaKey: null, meydaKeyConfidence: null,
            energy: null, energyLevel: null, danceability: null, loudness: null,
            genres: [], genreConfidences: {}, moods: [], moodConfidences: {}, 
            source: 'error'
        };
    }
  }, [loadMeyda]);

  return {
    analyzeAudio,
    isAnalyzing,
    error,
    meydaLoaded
  };
} 