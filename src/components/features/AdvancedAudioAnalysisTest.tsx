'use client';

import { useState } from 'react';
import { useAdvancedAudioAnalysis } from '@/hooks/useAdvancedAudioAnalysis';
import { Button } from '@/components/ui/button';
import { Dropzone } from '@/components/ui/dropzone';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function AdvancedAudioAnalysisTest() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [results, setResults] = useState<any>(null);
  const { analyzeAudio, isAnalyzing, error } = useAdvancedAudioAnalysis();

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
        description: `Detected ${analysisResults.genres.length} genres and ${analysisResults.moods.length} moods.`,
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
      <h2 className="text-2xl font-bold text-white">Advanced Audio Analysis</h2>
      <p className="text-gray-400">Test the advanced audio tagging, genre and mood detection for your audio files.</p>
      
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
              <span>Analyzing... This may take a moment</span>
            </div>
          ) : 'Analyze Audio'}
        </Button>
      </div>
      
      {results && (
        <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Advanced Analysis Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column: Basic info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-400">BPM</p>
                  <p className="text-xl font-bold text-white">{results.bpm || 'Unknown'}</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-400">Key</p>
                  <p className="text-xl font-bold text-white">{results.key || 'Unknown'}</p>
                </div>
              </div>
              
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-400">Energy Level</p>
                <p className="text-xl font-bold text-white capitalize">{results.energyLevel || 'Unknown'}</p>
                <div className="mt-2">
                  <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        results.energyLevel === 'low' ? 'bg-blue-500 w-1/3' : 
                        results.energyLevel === 'medium' ? 'bg-yellow-500 w-2/3' : 
                        'bg-red-500 w-full'
                      }`}
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-400">Danceability</p>
                <p className="text-xl font-bold text-white">
                  {results.danceability ? `${Math.round(results.danceability * 100)}%` : 'Unknown'}
                </p>
                <div className="mt-2">
                  <Progress value={results.danceability ? results.danceability * 100 : 0} className="h-1.5" />
                </div>
              </div>
            </div>
            
            {/* Right column: Tags */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Detected Genres</h4>
                <div className="flex flex-wrap gap-2">
                  {results.genres.length > 0 ? results.genres.map((genre: string) => (
                    <Badge 
                      key={genre} 
                      className="bg-indigo-900/50 text-indigo-200 hover:bg-indigo-900/70 border-indigo-700"
                    >
                      {genre}
                    </Badge>
                  )) : (
                    <p className="text-sm text-gray-500">No genres detected</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Detected Moods</h4>
                <div className="flex flex-wrap gap-2">
                  {results.moods.length > 0 ? results.moods.map((mood: string) => (
                    <Badge 
                      key={mood} 
                      className="bg-purple-900/50 text-purple-200 hover:bg-purple-900/70 border-purple-700"
                    >
                      {mood}
                    </Badge>
                  )) : (
                    <p className="text-sm text-gray-500">No moods detected</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Confidence scores */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Genre Confidence Scores</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(results.genreConfidences || {})
                .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
                .slice(0, 6)
                .map(([genre, confidence]: [string, any]) => (
                  <div key={genre} className="p-2 bg-gray-800/50 rounded border border-gray-800">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-gray-300">{genre}</span>
                      <span className="text-gray-400">{Math.round(confidence * 100)}%</span>
                    </div>
                    <Progress value={confidence * 100} className="h-1" />
                  </div>
                ))
              }
            </div>
          </div>
          
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Mood Confidence Scores</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(results.moodConfidences || {})
                .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
                .slice(0, 6)
                .map(([mood, confidence]: [string, any]) => (
                  <div key={mood} className="p-2 bg-gray-800/50 rounded border border-gray-800">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-gray-300">{mood}</span>
                      <span className="text-gray-400">{Math.round(confidence * 100)}%</span>
                    </div>
                    <Progress value={confidence * 100} className="h-1" />
                  </div>
                ))
              }
            </div>
          </div>
          
          <p className="mt-4 text-xs text-gray-500">
            {results.confidence >= 0.8 
              ? 'High confidence result - Extracted from filename'
              : 'Medium confidence result - Analyzed with Web Audio API'}
          </p>
        </div>
      )}
      
      <div className="p-4 bg-amber-900/20 border border-amber-800/30 rounded-lg">
        <h3 className="text-lg font-semibold text-amber-300 mb-2">How this improves your upload workflow</h3>
        <p className="text-amber-200/70 mb-3">
          This advanced audio analysis can be integrated into your upload process to automatically:
        </p>
        <ul className="list-disc list-inside space-y-1 text-amber-200/70">
          <li>Suggest relevant genre tags based on audio characteristics</li>
          <li>Add mood tags to improve discoverability</li>
          <li>Categorize tracks by energy level (great for workout vs. chill playlists)</li>
          <li>Identify dance-friendly tracks</li>
          <li>Improve SEO through more accurate and comprehensive metadata</li>
        </ul>
      </div>
    </div>
  );
} 