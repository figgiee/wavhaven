'use client';

import { MeydaAudioAnalysisTest } from '@/components/features/MeydaAudioAnalysisTest';
import { Badge } from '@/components/ui/badge';

export default function AudioAnalysisTestPage() {
  return (
    <div className="container py-10 mx-auto max-w-6xl">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-white">Audio Analysis Tools</h1>
        <p className="text-gray-400 max-w-3xl">
          Analyze audio files to detect BPM, musical key, genre, mood, and more using Meyda.js
        </p>
      </div>
      
      <div className="grid gap-4 mb-8">
        <div className="p-4 bg-gray-900 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-3">About This Tool</h2>
          
          <div className="p-4 border border-gray-800 rounded-lg bg-gray-950">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-indigo-300">Meyda.js Audio Analysis</h3>
              <Badge className="bg-indigo-900/50 text-indigo-200 border-indigo-700">
                Production Ready
              </Badge>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              This tool uses Meyda.js to analyze audio with advanced chroma feature extraction for key detection
              and spectral analysis for genre/mood classification. Key features include:
            </p>
            <ul className="list-disc list-inside text-gray-400 text-sm space-y-1">
              <li>Accurate musical key detection using the Krumhansl-Schmuckler algorithm</li>
              <li>Tempo (BPM) detection optimized for electronic music</li>
              <li>Genre and mood classification based on spectral features</li>
              <li>Energy level and danceability metrics</li>
            </ul>
          </div>
        </div>
      </div>
      
      <MeydaAudioAnalysisTest />
      
      <div className="mt-8 p-4 bg-gray-900 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-3">How This Tool Helps</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-800 rounded-lg">
            <h3 className="text-md font-medium text-white mb-2">Better Metadata</h3>
            <p className="text-gray-400 text-sm">
              Automatically extract accurate BPM, key, energy level, and more from your audio files
              to improve track metadata without manual work.
            </p>
          </div>
          
          <div className="p-3 bg-gray-800 rounded-lg">
            <h3 className="text-md font-medium text-white mb-2">Improved Discoverability</h3>
            <p className="text-gray-400 text-sm">
              Add genre and mood tags automatically based on audio characteristics,
              making your tracks easier to discover through search and filters.
            </p>
          </div>
          
          <div className="p-3 bg-gray-800 rounded-lg">
            <h3 className="text-md font-medium text-white mb-2">SEO & Organization</h3>
            <p className="text-gray-400 text-sm">
              Better metadata means better SEO and more organized libraries. Let the audio itself
              tell you what categories and tags it belongs to.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 