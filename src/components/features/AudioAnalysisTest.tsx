'use client';

import { useState } from 'react';
import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import { Button } from '@/components/ui/button';
import { Dropzone } from '@/components/ui/dropzone';
import { toast } from 'sonner';

export function AudioAnalysisTest() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [results, setResults] = useState<{ bpm: number | null; key: string | null; confidence: number } | null>(null);
  const { analyzeAudio, isAnalyzing, error } = useAudioAnalysis();

  const handleAudioFileDrop = (files: File[]) => {
    if (files && files.length > 0) {
      setAudioFile(files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!audioFile) {
      toast.error('No audio file', {
        description: 'Please select an audio file to analyze.',
      });
      return;
    }

    try {
      setResults(null);
      const analysisResults = await analyzeAudio(audioFile);
      setResults(analysisResults);
      
      toast.success('Analysis complete', {
        description: `BPM: ${analysisResults.bpm || 'Unknown'}, Key: ${analysisResults.key || 'Unknown'}`,
      });
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error('Analysis failed', {
        description: error?.message || 'Failed to analyze the audio file.',
      });
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-950 rounded-lg border border-gray-800">
      <h2 className="text-2xl font-bold text-white">Audio Analysis Test</h2>
      <p className="text-gray-400">Test the audio analysis functionality with your audio files.</p>
      
      <div className="border border-dashed border-gray-700 rounded-lg p-8 flex flex-col items-center justify-center h-32">
        {!audioFile ? (
          <Dropzone
            onDrop={handleAudioFileDrop}
            accept={{ 'audio/*': ['.wav', '.mp3', '.aiff'] }}
            maxSize={100 * 1024 * 1024}
            className="w-full h-full flex items-center justify-center cursor-pointer"
          >
            <div className="text-center">
              <p className="text-indigo-400 mb-1">Choose a file or drag and drop</p>
              <p className="text-xs text-gray-500">Accepted files: wav, mp3, aiff</p>
            </div>
          </Dropzone>
        ) : (
          <div className="text-center">
            <p className="text-indigo-400 mb-1">Selected: {audioFile.name}</p>
            <button 
              type="button" 
              onClick={() => setAudioFile(null)}
              className="text-xs text-gray-400 hover:text-white"
            >
              Change file
            </button>
          </div>
        )}
      </div>
      
      <div className="flex justify-center">
        <Button 
          onClick={handleAnalyze}
          disabled={!audioFile || isAnalyzing}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isAnalyzing ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
              Analyzing...
            </div>
          ) : 'Analyze Audio'}
        </Button>
      </div>
      
      {results && (
        <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-2">Analysis Results</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-400">BPM</p>
              <p className="text-xl font-bold text-white">{results.bpm || 'Unknown'}</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-400">Key</p>
              <p className="text-xl font-bold text-white">{results.key || 'Unknown'}</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-400">Confidence</p>
              <p className="text-xl font-bold text-white">{Math.round(results.confidence * 100)}%</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            {results.confidence >= 0.9 
              ? 'High confidence result - Extracted from filename'
              : 'Medium confidence result - Analyzed with Web Audio API'}
          </p>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p className="font-semibold">Instructions:</p>
        <ol className="list-decimal list-inside space-y-1 mt-2">
          <li>Drop an audio file in the area above</li>
          <li>Click the "Analyze Audio" button</li>
          <li>The analysis will detect BPM and musical key</li>
          <li>For best results, name your files with BPM and key information (e.g., "My Track - 128BPM - Amin.wav")</li>
        </ol>
      </div>
    </div>
  );
} 