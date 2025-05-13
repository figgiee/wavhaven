  keyDetectionChromaSourceType = hpssWorkerOutput ? "Full Mix Chroma (Meyda, HPSS harmonic unavailable)" : "Full Mix Chroma (Meyda, HPSS failed)";
}

// **********************************************************
// ***** CHANGE HERE: REMOVE PER-FRAME NORMALIZATION *****
// **********************************************************
// L2-Normalize all active chroma frames before averaging and correlation.
// const normalizedChromaFrames = activeChromaFrames.map(frame => { // <-- REMOVED THIS BLOCK
//     let sumOfSquares = 0;
//     for (let i = 0; i < frame.length; i++) {
//       sumOfSquares += frame[i] * frame[i];
//     }
//     const norm = Math.sqrt(sumOfSquares);
//     if (norm > 0) {
//       return new Float32Array(frame.map(val => val / norm));
//     }
//     return frame; // Return original frame if norm is 0 (e.g., all zeros or invalid frame)
//   });
// addLogEntry('DEBUG', `Normalized ${normalizedChromaFrames.length} chroma frames for key detection.`); // REMOVED LOG

// Use the raw activeChromaFrames directly
const keyDetectionResult = determineKeyFromChromaFrames(activeChromaFrames); // <-- Pass RAW frames
// **********************************************************
// ***** END CHANGE *****
// **********************************************************

const KEY_CONFIDENCE_THRESHOLD = 0.60; // Set minimum acceptable correlation 

// --- Key Detection --- 
addLogEntry('INFO', 'Starting Key Detection...');

let activeChromaPowerFrames: Float32Array[] = []; // Renamed to reflect raw power
let keyDetectionChromaSourceType = "Full Mix Chroma (Meyda)"; // Default

const hpssHarmonicDataAvailable = hpssWorkerOutput && 
                                hpssWorkerOutput.harmonicOutputSpectrogram && 
                                hpssWorkerOutput.harmonicOutputSpectrogram.length > 0;

if (hpssHarmonicDataAvailable) {
  addLogEntry('INFO', 'HPSS harmonic component available. Calculating chroma power from harmonic spectrogram.');
  keyDetectionChromaSourceType = "Harmonic Component Chroma (HPSS)";
  const harmonicSpectrogram = hpssWorkerOutput!.harmonicOutputSpectrogram;
  for (const harmonicPowerFrame of harmonicSpectrogram) {
    const chromaPowerVector = calculateChromaFromPowerSpectrum(
      harmonicPowerFrame, 
      preprocessedAudioBuffer.sampleRate, 
      MEYDA_BUFFER_SIZE
    );
    activeChromaPowerFrames.push(chromaPowerVector); // Collect raw power sums
  }
  if (activeChromaPowerFrames.length === 0) {
      addLogEntry('WARN', 'Chroma calculation from harmonic spectrogram yielded no frames. Falling back to full mix chroma power.');
      activeChromaPowerFrames = [...collectedChromaFrames]; // Use original Meyda chroma (which WAS normalized, needs reconsideration)
      // TODO: If falling back, collectedChromaFrames might need recalculating without L-Inf norm too?
      // For now, assume HPSS worked or fallback logic needs more work.
      keyDetectionChromaSourceType = "Full Mix Chroma (Meyda, fallback from empty harmonic chroma)";
  } else {
      addLogEntry('SUCCESS', `Successfully calculated ${activeChromaPowerFrames.length} raw chroma power frames from harmonic spectrogram.`);
  }
} else {
  addLogEntry('INFO', 'HPSS harmonic component not available or empty. Using full mix chroma from Meyda.');
  // TODO: Reconsider this fallback - collectedChromaFrames were L-Inf normalized by Meyda's default?
  // We should ideally calculate chroma power from collectedPowerSpectrumFrames here.
  // For now, proceeding with potentially problematic fallback:
  activeChromaPowerFrames = [...collectedChromaFrames]; // Use original Meyda chroma (potentially normalized)
  keyDetectionChromaSourceType = hpssWorkerOutput ? "Full Mix Chroma (Meyda, HPSS harmonic unavailable)" : "Full Mix Chroma (Meyda, HPSS failed)";
}

// Average the raw power frames
let averagedChromaVector = new Array(12).fill(0);
let validFramesCount = 0;
if (activeChromaPowerFrames.length > 0) {
  const vecLength = activeChromaPowerFrames[0].length; // Should be 12
  for (const frame of activeChromaPowerFrames) {
    if (frame && frame.length === vecLength) {
      for (let j = 0; j < vecLength; j++) {
        averagedChromaVector[j] += frame[j];
      }
      validFramesCount++;
    }
  }
  if (validFramesCount > 0) {
    for (let j = 0; j < vecLength; j++) {
      averagedChromaVector[j] /= validFramesCount;
    }
  }
}

if (validFramesCount === 0) {
   addLogEntry('ERROR', 'No valid chroma frames found or generated to average for key detection.');
   throw new Error('Key detection failed: No valid chroma frames.');
}
addLogEntry('DEBUG', `Averaged raw chroma power vector: [${averagedChromaVector.map(v => v.toFixed(2)).join(', ')}] from ${validFramesCount} frames.`);

// L2 Normalize the final averaged vector
let sumOfSquares = 0;
for (let i = 0; i < averagedChromaVector.length; i++) {
  sumOfSquares += averagedChromaVector[i] * averagedChromaVector[i];
}
const norm = Math.sqrt(sumOfSquares);
let normalizedAveragedChroma: number[] = [...averagedChromaVector]; // Copy before normalizing
if (norm > 0) {
   normalizedAveragedChroma = averagedChromaVector.map(val => val / norm);
   addLogEntry('DEBUG', `L2 Normalized averaged chroma vector: [${normalizedAveragedChroma.map(v => v.toFixed(3)).join(', ')}]`);
} else {
   addLogEntry('WARN', 'Cannot L2 normalize averaged chroma vector, norm is 0.');
}

// Pass the single normalized averaged vector to the detection module
const keyDetectionResult = determineKeyFromChromaFrames(normalizedAveragedChroma); 

const KEY_CONFIDENCE_THRESHOLD = 0.60; 

currentAnalysisResult.detectedKeyCorrelation = keyDetectionResult?.bestMatch?.correlation ?? null; // Still store correlation if available
currentAnalysisResult.averagedChromaVector = averagedChromaVector; // Store the UNNORMALIZED averaged vector for display
currentAnalysisResult.topKeyCandidates = keyDetectionResult?.allCandidates
    ?.sort((a, b) => b.correlation - a.correlation) // Ensure sorted

// ... existing code ...
currentAnalysisResult.averagedChromaVector = currentAnalysisResult.averagedChromaVector || []; // Use value set earlier (unnormalized for display)
currentAnalysisResult.topKeyCandidates = currentAnalysisResult.topKeyCandidates || []; // Use value set earlier
currentAnalysisResult.onsetStrengthEnvelopeInfo = currentAnalysisResult.onsetStrengthEnvelopeInfo || 'N/A'; // Use value set earlier

// ... existing code ...
<p><strong>Detected Key:</strong> <span className="text-xl font-bold text-green-400">{analysisResult.detectedKey ? `${analysisResult.detectedKey}${analysisResult.detectedKeyMode ? ' ' + analysisResult.detectedKeyMode : ''}` : 'N/A'}</span></p>
<p><strong>Key Correlation:</strong> <span className="text-gray-300">{analysisResult.detectedKeyCorrelation?.toFixed(3) ?? 'N/A'}</span></p>
<p><strong>BPM Confidence:</strong> <span className="text-gray-300 text-xs">{analysisResult.bpmConfidence || 'N/A'}</span></p>
</div>
</div>

// ... existing code ...
<div className="p-4 border border-gray-700 rounded-md bg-gray-800/40">
    <h3 className="text-lg font-semibold mb-3 text-indigo-300">Key Detection Details</h3>
    <div className="space-y-2 text-sm">
        <p><strong>Chroma Source:</strong> <span className="text-gray-300">{analysisResult.chromaSource || 'N/A'}</span></p>
        <div><strong>Averaged Chroma Vector (Unnormalized Power):</strong> 
            <div className="text-xs text-gray-400 font-mono bg-gray-900 p-2 rounded mt-1 whitespace-pre-wrap break-words">
                [{analysisResult.averagedChromaVector?.map(v => v.toFixed(2)).join(', ') || 'N/A'}]
            </div>
        </div>
        <div><strong>Top Key Candidates:</strong>
            {analysisResult.topKeyCandidates && analysisResult.topKeyCandidates.length > 0 ? (
// ... existing code ...
    </div>
</div>
// ... existing code ... 