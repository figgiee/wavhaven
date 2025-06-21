'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// Define types for the hook's return values
type EnergyLevel = 'low' | 'medium' | 'high';

interface AdvancedAudioAnalysisResult {
  bpm: number | null;
  key: string | null;
  confidence: number;
  genres: string[];
  genreConfidences: Record<string, number>;
  moods: string[];
  moodConfidences: Record<string, number>;
  energyLevel: EnergyLevel | null;
  danceability: number | null;
  loudness: number | null;
  source: 'webAudio' | 'filename';
}

interface UseAdvancedAudioAnalysisReturn {
  analyzeAudio: (file: File) => Promise<AdvancedAudioAnalysisResult>;
  isAnalyzing: boolean;
  error: Error | null;
  essentiaLoaded: boolean; // Keep for backward compatibility but always false
}

/**
 * A hook that provides advanced audio analysis functionality using Web Audio API.
 * It can detect BPM, musical key, genres, moods, energy level, and danceability.
 */
export function useAdvancedAudioAnalysis(): UseAdvancedAudioAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Define genre and mood mappings
  const genreMap = {
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

  const moodMap = {
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  /**
   * Analyze audio using Web Audio API
   */
  const analyzeWithWebAudio = async (arrayBuffer: ArrayBuffer): Promise<AdvancedAudioAnalysisResult> => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const audioCtx = audioContextRef.current;
    const audioData = await audioCtx.decodeAudioData(arrayBuffer);
    
    // Convert to mono signal for analysis
    const monoSignal = getMono(audioData);
    const sampleRate = audioData.sampleRate;
    
    // Find peaks in signal for BPM detection
    const peaks = findPeaks(monoSignal, sampleRate);
    const intervals = identifyIntervals(peaks);
    const bpm = calculateBPM(intervals, sampleRate);
    
    // Key detection
    const key = await detectKey(audioData);
    
    // Spectral analysis for energy and other features
    const energy = calculateEnergy(monoSignal);
    
    // Determine energy level
    let energyLevel: EnergyLevel = 'medium';
    if (energy < 0.01) energyLevel = 'low';
    else if (energy > 0.1) energyLevel = 'high';
    
    // Calculate danceability based on rhythm regularity and BPM
    const isDanceableBpm = bpm > 90 && bpm < 130;
    const danceability = isDanceableBpm ? 0.6 + (energy * 0.3) : 0.3 + (energy * 0.2);
    
    // Calculate loudness
    const rms = calculateRMS(monoSignal);
    const loudness = Math.min(100, rms * 200);  // Scale to 0-100

    // Simple genre classification based on energy, BPM
    const genreConfidences: Record<string, number> = {
      'edm': 0,
      'hiphop': 0,
      'pop': 0,
      'rock': 0,
      'jazz': 0,
      'classical': 0,
      'ambient': 0,
      'folk': 0
    };
    
    // Basic heuristic genre classification
    if (bpm > 120 && energy > 0.08) {
      genreConfidences.edm = 0.8;
      genreConfidences.pop = 0.4;
    } else if (bpm > 85 && bpm < 105) {
      genreConfidences.hiphop = 0.7;
      genreConfidences.pop = 0.5;
    } else if (bpm > 100 && bpm < 160 && energy > 0.05) {
      genreConfidences.rock = 0.6;
      genreConfidences.pop = 0.3;
    } else if (bpm < 100 && energy < 0.03) {
      genreConfidences.ambient = 0.7;
      genreConfidences.classical = 0.4;
    } else if (bpm > 110 && bpm < 140 && energy < 0.04) {
      genreConfidences.jazz = 0.6;
      genreConfidences.classical = 0.3;
    } else if (energy < 0.015) {
      genreConfidences.folk = 0.7;
      genreConfidences.ambient = 0.4;
    } else {
      genreConfidences.pop = 0.5;
    }
    
    // Simple mood classification heuristics
    const moodConfidences: Record<string, number> = {
      'aggressive': 0,
      'calm': 0,
      'cheerful': 0,
      'dark': 0,
      'energetic': 0,
      'melancholic': 0
    };
    
    if (energy > 0.09 && bpm > 140) {
      moodConfidences.aggressive = 0.8;
      moodConfidences.energetic = 0.7;
    } else if (energy < 0.02 && bpm < 90) {
      moodConfidences.calm = 0.8;
      moodConfidences.melancholic = 0.4;
    } else if (bpm > 100 && bpm < 130 && energy > 0.05) {
      moodConfidences.cheerful = 0.7;
      moodConfidences.energetic = 0.6;
    } else if (energy < 0.03 && key.includes('m')) {  // Minor key
      moodConfidences.dark = 0.7;
      moodConfidences.melancholic = 0.6;
    } else if (bpm > 120) {
      moodConfidences.energetic = 0.7;
    } else {
      moodConfidences.cheerful = 0.4;
    }
    
    // Filter genres and moods by confidence threshold
    const genres = Object.entries(genreConfidences)
      .filter(([_, conf]) => conf > 0.5)
      .map(([genre, _]) => genre);
      
    const moods = Object.entries(moodConfidences)
      .filter(([_, conf]) => conf > 0.5)
      .map(([mood, _]) => mood);
    
    return {
      bpm,
      key,
      confidence: 0.7,  // Web Audio API confidence
      genres,
      genreConfidences,
      moods,
      moodConfidences,
      energyLevel,
      danceability,
      loudness,
      source: 'webAudio'
    };
  };

  /**
   * Extract metadata from filename
   */
  const extractMetadataFromFilename = (filename: string): { bpm: string | null; key: string | null } => {
    let bpm = null;
    let key = null;
    
    // BPM detection in format 120BPM or BPM120
    const bpmRegex = /\b(\d{2,3})\s*(?:bpm|BPM)|(?:bpm|BPM)\s*(\d{2,3})\b/i;
    const bpmMatch = filename.match(bpmRegex);
    
    if (bpmMatch) {
      bpm = bpmMatch[1] || bpmMatch[2]; // Get the captured BPM number
    }
    
    // Key detection (e.g., "Amin", "C#", "Gmaj")
    const keyRegex = /\b([A-G][#b]?)\s*(?:m|min|minor|maj|major)?\b/i;
    const keyMatch = filename.match(keyRegex);
    
    if (keyMatch) {
      key = keyMatch[0].trim();
    }
    
    return { bpm, key };
  };

  /**
   * Key detection using Web Audio API frequency analysis
   */
  const detectKey = async (audioBuffer: AudioBuffer): Promise<string> => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const ctx = audioContextRef.current;
    const analyzer = ctx.createAnalyser();
    analyzer.fftSize = 4096; // More detail for key detection
    
    // Create a buffer source and connect to analyzer
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyzer);
    
    // Setup frequency analysis
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyzer.getByteFrequencyData(dataArray);
    
    // Scale used to map frequencies to musical notes
    const NOTE_FREQUENCIES: Record<string, number> = {
      'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
      'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
      'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
    };
    
    // Accumulate average energy in each frequency range for notes
    const noteEnergy: Record<string, number> = {};
    
    // Initialize note energy counters
    Object.keys(NOTE_FREQUENCIES).forEach(note => {
      noteEnergy[note] = 0;
    });
    
    // Analyze multiple chunks to get better results
    const chunkCount = 10; // Number of chunks to analyze
    
    // Start buffer playback (needed for analysis)
    source.start(0);
    
    // Wait briefly for analysis to begin
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Collect frequency data from multiple positions in the audio
    for (let chunk = 0; chunk < chunkCount; chunk++) {
      // Get frequency data
      analyzer.getByteFrequencyData(dataArray);
      
      // Process frequency data to find dominant note
      for (let i = 0; i < bufferLength; i++) {
        const frequency = i * ctx.sampleRate / analyzer.fftSize;
        const magnitude = dataArray[i];
        
        // Find the closest note to this frequency
        let closestNote = '';
        let minDistance = Infinity;
        
        Object.entries(NOTE_FREQUENCIES).forEach(([note, noteFreq]) => {
          // Consider all octaves (multiply/divide noteFreq)
          for (let octave = -2; octave <= 2; octave++) {
            const adjustedFreq = noteFreq * Math.pow(2, octave);
            const distance = Math.abs(frequency - adjustedFreq);
            
            if (distance < minDistance) {
              minDistance = distance;
              closestNote = note;
            }
          }
        });
        
        // Add energy value to corresponding note
        if (closestNote && magnitude > 0) {
          noteEnergy[closestNote] += magnitude;
        }
      }
      
      // Wait a short time between analyses
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Stop source when analysis is complete
    source.stop();
    
    // Get the most dominant note
    let highestNote = '';
    let highestEnergy = 0;
    
    Object.entries(noteEnergy).forEach(([note, energy]) => {
      if (energy > highestEnergy) {
        highestEnergy = energy;
        highestNote = note;
      }
    });
    
    // Check whether it's major or minor by checking relative energy
    // of the major third (4 semitones) vs minor third (3 semitones)
    const notes = Object.keys(NOTE_FREQUENCIES);
    const rootIndex = notes.indexOf(highestNote);
    
    if (rootIndex === -1) {
      return 'C'; // Default if something went wrong
    }
    
    // Get major and minor third relative to root note
    const majorThirdIndex = (rootIndex + 4) % 12;
    const minorThirdIndex = (rootIndex + 3) % 12;
    
    const majorThird = notes[majorThirdIndex];
    const minorThird = notes[minorThirdIndex];
    
    // Compare energy in major vs minor third interval
    const isMajor = noteEnergy[majorThird] > noteEnergy[minorThird];
    
    return highestNote + (isMajor ? '' : 'm');
  };

  /**
   * Main function to analyze an audio file
   */
  const analyzeAudio = useCallback(async (file: File): Promise<AdvancedAudioAnalysisResult> => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // First, try to extract info from the filename
      const { bpm: filenameBpm, key: filenameKey } = extractMetadataFromFilename(file.name);
      
      // If both BPM and key are in filename, return with high confidence
      if (filenameBpm && filenameKey) {
        // Create default values for other properties
        const energy = 0.05; // Medium energy default
        const energyLevel: EnergyLevel = 'medium';
        const bpm = parseInt(filenameBpm);
        
        // Basic genre guessing based on BPM
        const genreConfidences: Record<string, number> = {};
        if (bpm > 120) {
          genreConfidences.edm = 0.6;
          genreConfidences.pop = 0.4;
        } else if (bpm > 85 && bpm < 105) {
          genreConfidences.hiphop = 0.6;
          genreConfidences.pop = 0.4;
        } else {
          genreConfidences.pop = 0.5;
        }
        
        // Basic mood guessing based on key (minor/major)
        const moodConfidences: Record<string, number> = {};
        if (filenameKey.includes('m')) {
          moodConfidences.melancholic = 0.6;
          moodConfidences.dark = 0.4;
        } else {
          moodConfidences.cheerful = 0.6;
          moodConfidences.energetic = 0.4;
        }
        
        // Get top genres and moods
        const genres = Object.entries(genreConfidences)
          .filter(([_, conf]) => conf > 0.5)
          .map(([genre, _]) => genre);
          
        const moods = Object.entries(moodConfidences)
          .filter(([_, conf]) => conf > 0.5)
          .map(([mood, _]) => mood);
          
        // Danceability based on BPM
        const danceability = bpm >= 90 && bpm <= 130 ? 0.7 : 0.4;
        
        return {
          bpm,
          key: filenameKey,
          confidence: 0.9, // High confidence for filename extraction
          genres,
          genreConfidences,
          moods,
          moodConfidences,
          energyLevel,
          danceability,
          loudness: 50, // Default mid-loudness
          source: 'filename'
        };
      }
      
      // Create array buffer from file
      const arrayBuffer = await file.arrayBuffer();
      
      // Analyze with Web Audio API
      const analysisResult = await analyzeWithWebAudio(arrayBuffer);
      
      // Combine results, prioritizing filename metadata if available
      if (filenameBpm) {
        analysisResult.bpm = parseInt(filenameBpm);
      }
      
      if (filenameKey) {
        analysisResult.key = filenameKey;
      }
      
      if (filenameBpm || filenameKey) {
        analysisResult.confidence = Math.max(analysisResult.confidence, 0.8);
      }
      
      return analysisResult;
    } catch (err) {
      console.error('Audio analysis error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(new Error(`Failed to analyze audio: ${errorMessage}`));
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    analyzeAudio,
    isAnalyzing,
    error,
    essentiaLoaded: false // Always false since we're not using essentia
  };
}

/**
 * Convert stereo to mono by averaging channels
 */
function getMono(audioBuffer: AudioBuffer): Float32Array {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const monoData = new Float32Array(length);
  
  // If mono, just return the channel data
  if (numChannels === 1) {
    return audioBuffer.getChannelData(0);
  }
  
  // If stereo or more, average all channels
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let channel = 0; channel < numChannels; channel++) {
      sum += audioBuffer.getChannelData(channel)[i];
    }
    monoData[i] = sum / numChannels;
  }
  
  return monoData;
}

/**
 * Find peaks in audio data (for beat detection)
 */
function findPeaks(data: Float32Array, sampleRate: number): number[] {
  const peaks: number[] = [];
  const threshold = 0.15;
  const bufferSize = 1024;
  
  for (let i = 0; i < data.length; i += bufferSize) {
    let max = 0;
    const end = Math.min(i + bufferSize, data.length);
    
    for (let j = i; j < end; j++) {
      const value = Math.abs(data[j]);
      if (value > max) max = value;
    }
    
    if (max > threshold) {
      peaks.push(i / sampleRate);
    }
  }
  
  return peaks;
}

/**
 * Calculate intervals between peaks
 */
function identifyIntervals(peaks: number[]): number[] {
  const intervals: number[] = [];
  
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }
  
  return intervals;
}

/**
 * Calculate BPM from beat intervals
 */
function calculateBPM(intervals: number[], sampleRate: number): number {
  if (intervals.length === 0) return 120; // Default
  
  // Group similar intervals
  const groups: Record<string, number> = {};
  
  intervals.forEach(interval => {
    if (interval < 0.1) return; // Too short
    
    const bpm = 60 / interval;
    if (bpm < 60 || bpm > 200) return; // Unreasonable value
    
    const roundedBpm = Math.round(bpm);
    groups[roundedBpm] = (groups[roundedBpm] || 0) + 1;
  });
  
  // Find most common BPM
  let maxCount = 0;
  let detectedBpm = 120; // Default
  
  Object.entries(groups).forEach(([bpm, count]) => {
    if (count > maxCount) {
      maxCount = count;
      detectedBpm = parseInt(bpm);
    }
  });
  
  return detectedBpm;
}

/**
 * Calculate energy of signal
 */
function calculateEnergy(data: Float32Array): number {
  let sum = 0;
  
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  
  return sum / data.length;
}

/**
 * Calculate RMS (root mean square) for loudness
 */
function calculateRMS(data: Float32Array): number {
  let sum = 0;
  
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  
  return Math.sqrt(sum / data.length);
} 