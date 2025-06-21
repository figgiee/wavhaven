'use client';

import { useState } from 'react';
import { useMeydaAudioAnalysis } from '@/hooks/useMeydaAudioAnalysis';
import { Button } from '@/components/ui/button';
import { Dropzone } from '@/components/ui/dropzone';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function MeydaAudioAnalysisTest() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [results, setResults] = useState<any>(null);
  const { analyzeAudio, isAnalyzing, error, meydaLoaded } = useMeydaAudioAnalysis();

  const handleAudioFileDrop = (files: File[]) => {
    if (files && files.length > 0) {
      const file = files[0];
      setAudioFile(file);
      // Ensure the filename is available for analysis
      // We need to store this so it can be passed to the audio buffer later
      if (file && file.name) {
        (file as any)._filename = file.name;
      }
      setResults(null); // Clear previous results
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
      // Make sure the filename is correctly passed to the analysis function
      const analysisResults = await analyzeAudio(audioFile);
      setResults(analysisResults);
      
      toast.success('Analysis complete', {
        description: `Key: ${analysisResults.key || 'Unknown'}, BPM: ${analysisResults.bpm || 'Unknown'}`,
      });
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error('Analysis failed', {
        description: error?.message || 'Failed to analyze the audio file.',
      });
    }
  };

  // Function to format confidence as a percentage
  const formatConfidence = (confidence: number) => {
    // Ensure confidence is between 0-1
    const normalizedConfidence = Math.min(1, Math.max(0, confidence));
    // Convert to percentage (0-100%)
    return `${Math.round(normalizedConfidence * 100)}%`;
  };

  return (
    <div className="space-y-6 p-6 bg-gray-950 rounded-lg border border-gray-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Meyda Audio Analysis</h2>
          <p className="text-gray-400">Test audio analysis with Meyda.js, featuring improved key detection via chroma analysis</p>
        </div>
        
        <Badge 
          variant={meydaLoaded ? "success" : "destructive"}
          className={`${meydaLoaded ? 'bg-emerald-950 text-emerald-200 border-emerald-700' : 'bg-red-950 text-red-200 border-red-700'} px-3 py-1.5`}
        >
          Meyda.js {meydaLoaded ? 'Loaded' : 'Not Loaded'}
        </Badge>
      </div>
      
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
      
      <div className="flex justify-center space-x-4">
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
          ) : 'Analyze with Meyda.js'}
        </Button>
        
        <Button 
          onClick={() => {
            setAudioFile(null);
            setResults(null);
            toast.success('Form cleared', {
              description: 'All input fields have been reset.',
            });
          }}
          variant="outline"
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
          disabled={isAnalyzing}
        >
          Clear Form
        </Button>
      </div>
      
      {results && (
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="w-full bg-gray-800 grid grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="genres">Genres & Moods</TabsTrigger>
            <TabsTrigger value="technical">Technical Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="p-4 bg-gray-900 rounded-lg border border-gray-800 mt-2">
            <h3 className="text-lg font-semibold text-white mb-4">Audio Analysis Results Overview</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Column 1: Primary Key & BPM */}
              <div className="space-y-4">
                <div className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-400">Final Key <span className="text-xs">({results.source === 'filename' ? 'Filename' : results.source === 'meyda' ? 'Meyda' : 'Fallback'})</span></p>
                  <p className="text-xl font-bold text-white">{results.key || 'Unknown'}</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-400">Final BPM <span className="text-xs">({results.source === 'filename' ? 'Filename' : results.source === 'meyda' ? 'Meyda' : 'Fallback'})</span></p>
                  <p className="text-xl font-bold text-white">{results.bpm || 'Unknown'}</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-400">Loudness (RMS)</p>
                  <p className="text-xl font-bold text-white">{results.loudness ? `${results.loudness.toFixed(0)}` : '--'}</p>
                  {results.loudness && <Progress value={results.loudness} className="h-1.5 mt-2" />}
                </div>
              </div>
              
              {/* Column 2: Meyda Specific Results */}
              <div className="space-y-4">
                <div className="p-3 bg-gray-800/70 rounded-lg border border-dashed border-emerald-900">
                  <p className="text-sm text-gray-400">Meyda Key <Badge variant="outline" className="text-xs px-1 py-0 border-emerald-700 text-emerald-300">Meyda</Badge></p>
                  <p className="text-xl font-bold text-emerald-300">{results.meydaKey || 'Not Detected'}</p>
                  {results.meydaKeyConfidence !== null && (
                    <p className="text-xs text-emerald-400 mt-1">Confidence: {formatConfidence(results.meydaKeyConfidence)}</p>
                  )}
                </div>
                <div className="p-3 bg-gray-800/70 rounded-lg border border-dashed border-emerald-900">
                  <p className="text-sm text-gray-400">Meyda BPM <Badge variant="outline" className="text-xs px-1 py-0 border-emerald-700 text-emerald-300">Meyda</Badge></p>
                  <p className="text-xl font-bold text-emerald-300">{results.meydaBpm || 'Not Detected'}</p>
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
              </div>
              
              {/* Column 3: Tags & Danceability */}
              <div className="space-y-4">
                 <div className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-400">Danceability</p>
                  <p className="text-xl font-bold text-white">
                    {results.danceability !== null ? `${Math.round(results.danceability * 100)}%` : 'Unknown'}
                  </p>
                  <div className="mt-2">
                    <Progress value={results.danceability !== null ? results.danceability * 100 : 0} className="h-1.5" />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Top Genres</h4>
                  <div className="flex flex-wrap gap-2">
                    {(results.genres && results.genres.length > 0) ? results.genres.slice(0, 3).map((genre: string) => (
                      <Badge 
                        key={genre} 
                        className="bg-indigo-900/50 text-indigo-200 hover:bg-indigo-900/70 border-indigo-700"
                      >
                        {genre}
                      </Badge>
                    )) : (
                      <Badge variant="outline" className="text-gray-500">Not Detected</Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Top Moods</h4>
                  <div className="flex flex-wrap gap-2">
                    {(results.moods && results.moods.length > 0) ? results.moods.slice(0, 3).map((mood: string) => (
                      <Badge 
                        key={mood} 
                        className="bg-purple-900/50 text-purple-200 hover:bg-purple-900/70 border-purple-700"
                      >
                        {mood}
                      </Badge>
                    )) : (
                      <Badge variant="outline" className="text-gray-500">Not Detected</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="genres" className="p-4 bg-gray-900 rounded-lg border border-gray-800 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Genre Confidence Scores</h4>
                <div className="space-y-2">
                  {Object.entries(results.genreConfidences || {})
                    .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
                    .slice(0, 8)
                    .map(([genre, confidence]: [string, any]) => (
                      <div key={genre} className="p-2 bg-gray-800/50 rounded border border-gray-800">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-gray-300">{genre}</span>
                          <span className="text-gray-400">{formatConfidence(confidence)}</span>
                        </div>
                        <Progress value={confidence * 100} className="h-1" />
                      </div>
                    ))
                  }
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Mood Confidence Scores</h4>
                <div className="space-y-2">
                  {Object.entries(results.moodConfidences || {})
                    .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
                    .slice(0, 8)
                    .map(([mood, confidence]: [string, any]) => (
                      <div key={mood} className="p-2 bg-gray-800/50 rounded border border-gray-800">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-gray-300">{mood}</span>
                          <span className="text-gray-400">{formatConfidence(confidence)}</span>
                        </div>
                        <Progress value={confidence * 100} className="h-1" />
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="technical" className="p-4 bg-gray-900 rounded-lg border border-gray-800 mt-2">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Audio Information</h4>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <pre className="text-xs text-gray-300 overflow-auto max-h-60 whitespace-pre-wrap">
                    {audioFile && (
                      <>
                        <p><strong>Filename:</strong> {audioFile.name}</p>
                        <p><strong>Size:</strong> {(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        <p><strong>Type:</strong> {audioFile.type}</p>
                      </>
                    )}
                  </pre>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Analysis Details</h4>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <pre className="text-xs text-gray-300 overflow-auto max-h-60 whitespace-pre-wrap">
                    {JSON.stringify({
                      key: results.key,
                      bpm: results.bpm,
                      confidence: formatConfidence(results.confidence),
                      energyLevel: results.energyLevel,
                      danceability: results.danceability ? `${Math.round(results.danceability * 100)}%` : null,
                      source: results.source,
                      genres: results.genres?.slice(0, 3) || [],
                      moods: results.moods?.slice(0, 3) || []
                    }, null, 2)}
                  </pre>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">About Meyda.js</h4>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-300">
                    Meyda.js is an audio feature extraction library for the web audio API. 
                    It provides real-time access to audio features like RMS, spectral centroid, 
                    and chroma for music analysis applications.
                  </p>
                  <a 
                    href="https://meyda.js.org/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:underline mt-2 inline-block"
                  >
                    Learn more about Meyda.js →
                  </a>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
      
      <div className="p-4 bg-amber-900/20 border border-amber-800/30 rounded-lg">
        <h3 className="text-lg font-semibold text-amber-300 mb-2">About Meyda Audio Analysis</h3>
        <p className="text-amber-200/70 mb-3">
          This implementation uses <a href="https://meyda.js.org/getting-started" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-200">Meyda.js</a> to analyze audio files with these improvements:
        </p>
        <ul className="list-disc list-inside space-y-1 text-amber-200/70">
          <li>More accurate key detection using <strong className="text-amber-200">chroma features</strong> (frequency analysis focused on pitch classes)</li>
          <li>Better genre and mood detection through spectral feature analysis</li>
          <li>More precise energy level and danceability metrics</li>
          <li>Graceful fallback to Web Audio API if Meyda is unavailable</li>
        </ul>
      </div>
    </div>
  );
} 