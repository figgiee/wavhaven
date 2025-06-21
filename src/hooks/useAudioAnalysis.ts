import { useState, useRef, useCallback } from 'react';

// Define the types for our hook return values
interface AudioAnalysisResult {
  bpm: number | null;
  key: string | null;
  confidence: number; // 0-1 value indicating confidence in the result
}

interface UseAudioAnalysisReturn {
  analyzeAudio: (file: File) => Promise<AudioAnalysisResult>;
  isAnalyzing: boolean;
  error: Error | null;
}

/**
 * A hook that provides audio analysis functionality for detecting BPM and musical key
 * using Web Audio API
 */
export function useAudioAnalysis(): UseAudioAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  /**
   * Fallback BPM detection using Web Audio API
   */
  const detectBPM = useCallback(async (audioBuffer: AudioBuffer): Promise<number> => {
    // Get the audio data from the first channel
    const audioData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Parameters for BPM detection
    const bufferSize = 2048;
    const peaks: number[] = [];
    const threshold = 0.1; // Adjust based on testing
    
    // Work with a 30-second chunk if available (or full buffer if shorter)
    const maxLength = Math.min(audioData.length, 30 * sampleRate);
    
    // Process audio in chunks and find peaks
    for (let i = 0; i < maxLength; i += bufferSize) {
      let chunkEnd = Math.min(i + bufferSize, maxLength);
      let chunk = audioData.slice(i, chunkEnd);
      
      // Calculate energy level in this chunk
      let energy = 0;
      for (let j = 0; j < chunk.length; j++) {
        energy += Math.abs(chunk[j]);
      }
      energy /= chunk.length; // Average energy
      
      // If energy is above threshold, mark it as a peak
      if (energy > threshold) {
        peaks.push(i / sampleRate); // Convert sample position to seconds
      }
    }
    
    // Calculate intervals between peaks
    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }
    
    // Group similar intervals and count them
    const groups: Record<string, number> = {};
    
    intervals.forEach(interval => {
      // Ignore intervals that are too short (likely not beats)
      if (interval < 0.1) return;
      
      // Calculate potential BPM
      const bpm = 60 / interval;
      
      // Ignore unreasonable BPM values
      if (bpm < 60 || bpm > 200) return;
      
      // Round to nearest integer BPM
      const roundedBpm = Math.round(bpm);
      
      // Add to the respective group
      groups[roundedBpm] = (groups[roundedBpm] || 0) + 1;
    });
    
    // Find the BPM with the most occurrences
    let maxCount = 0;
    let detectedBpm = 120; // Default fallback
    
    Object.keys(groups).forEach(bpm => {
      const count = groups[bpm];
      if (count > maxCount) {
        maxCount = count;
        detectedBpm = parseInt(bpm);
      }
    });
    
    return detectedBpm;
  }, []);

  /**
   * Key detection using Web Audio API frequency analysis
   */
  const detectKey = useCallback(async (audioBuffer: AudioBuffer): Promise<string> => {
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
    
    // Determine major or minor based on relative energies
    // (Very simplified - just checking third intervals)
    let totalEnergy = Object.values(noteEnergy).reduce((sum, val) => sum + val, 0);
    let highestNote = '';
    let highestEnergy = 0;
    
    // Get the most dominant note
    Object.entries(noteEnergy).forEach(([note, energy]) => {
      if (energy > highestEnergy) {
        highestEnergy = energy;
        highestNote = note;
      }
    });
    
    // Check whether it's major or minor by checking relative energy
    // of the major third (4 semitones) vs minor third (3 semitones)
    // Simplified approach - more sophisticated analysis would involve 
    // analyzing chord patterns and transitions
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
  }, []);

  /**
   * Extract metadata from filename if available
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
   * Main function to analyze an audio file
   */
  const analyzeAudio = useCallback(async (file: File): Promise<AudioAnalysisResult> => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // First, try to extract info from the filename
      const { bpm: filenameBpm, key: filenameKey } = extractMetadataFromFilename(file.name);
      
      // If both BPM and key are in filename, return with high confidence
      if (filenameBpm && filenameKey) {
        return {
          bpm: parseInt(filenameBpm),
          key: filenameKey,
          confidence: 0.9 // High confidence for filename extraction
        };
      }
      
      // Create array buffer from file
      const arrayBuffer = await file.arrayBuffer();
      
      // Create audio context and decode audio data
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Analyze with Web Audio API
      const detectedBpm = await detectBPM(audioBuffer);
      const detectedKey = await detectKey(audioBuffer);
      
      // Combine results, prioritizing filename metadata if available
      return {
        bpm: filenameBpm ? parseInt(filenameBpm) : detectedBpm,
        key: filenameKey || detectedKey,
        confidence: 0.7 // Medium confidence for Web Audio API analysis
      };
    } catch (err) {
      console.error('Audio analysis error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(new Error(`Failed to analyze audio: ${errorMessage}`));
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, [detectBPM, detectKey]);

  return {
    analyzeAudio,
    isAnalyzing,
    error
  };
} 