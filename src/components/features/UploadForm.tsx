'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dropzone } from '@/components/ui/dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { uploadTrack } from '@/server-actions/trackActions';
import { cn } from '@/lib/utils';
import { Music, Repeat, Package, Sliders, Upload, Tag } from 'lucide-react';
import * as musicMetadata from 'music-metadata-browser';
// Import only the Meyda-based analysis to avoid essentia.js errors
// import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import { useMeydaAudioAnalysis } from '@/hooks/useMeydaAudioAnalysis';

// Define content types
type ContentType = 'beats' | 'loops' | 'soundkits' | 'presets';

// Define form schema with Zod
const uploadFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  genre: z.string().min(1, 'Genre is required'),
  bpm: z.string().regex(/^\d+$/, 'BPM must be a number'),
  key: z.string().min(1, 'Key is required'),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid number'),
  tags: z.string().optional(),
});

type UploadFormData = z.infer<typeof uploadFormSchema>;

export function UploadForm() {
  const [isUploading, setIsUploading] = useState(false);
  const [isMetadataProcessing, setIsMetadataProcessing] = useState(false);
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [metadataSource, setMetadataSource] = useState<string>('Manual entry');
  const [suggestedGenres, setSuggestedGenres] = useState<string[]>([]);
  const [suggestedMoods, setSuggestedMoods] = useState<string[]>([]);

  // Import our custom audio analysis hooks
  // const { analyzeAudio, isAnalyzing: isEssentiaAnalyzing } = useAudioAnalysis();
  const { analyzeAudio: analyzeMeyda, isAnalyzing: isMeydaAnalyzing, meydaLoaded } = useMeydaAudioAnalysis();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      bpm: '120',
    },
  });

  // Extract metadata from filename
  const extractMetadataFromFilename = (filename: string) => {
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    
    // Common patterns for music file naming
    // Example formats: "Track Name - 120BPM - Amin.wav" or "Artist - Track Name [120BPM, Amin].wav"
    
    let title = nameWithoutExt;
    let bpm = "";
    let key = "";
    
    // Check for BPM in format "120BPM" or "BPM120"
    const bpmRegex = /\b(\d{2,3})\s*(?:bpm|BPM)|(?:bpm|BPM)\s*(\d{2,3})\b/i;
    const bpmMatch = nameWithoutExt.match(bpmRegex);
    
    if (bpmMatch) {
      bpm = bpmMatch[1] || bpmMatch[2]; // Get the captured BPM number
      
      // Clean the title by removing the BPM part
      title = title.replace(bpmRegex, '').trim();
    }
    
    // Common music keys: A, Am, Amin, A min, A minor, C#, C# min, etc.
    const keyRegex = /\b([A-G][#b]?)\s*(?:m|min|minor|maj|major)?\b/i;
    const keyMatch = nameWithoutExt.match(keyRegex);
    
    if (keyMatch) {
      key = keyMatch[0].trim();
      
      // Clean the title by removing the key part
      // Only remove if it's at the end or within brackets
      if (title.endsWith(key) || title.includes(`[${key}]`) || title.includes(`(${key})`)) {
        title = title.replace(new RegExp(`\\[${key}\\]|\\(${key}\\)|${key}$`), '').trim();
      }
    }
    
    // Remove common separators (hyphen, underscore, brackets) from the title
    title = title.replace(/[-_\[\]()]/g, ' ').trim();
    // Remove multiple spaces
    title = title.replace(/\s+/g, ' ');
    
    return { title, bpm, key };
  };

  // Handle audio file selection with metadata extraction
  const handleAudioFileDrop = async (files: File[]) => {
    if (files && files.length > 0) {
      const file = files[0];
      setAudioFile(file);
      setIsMetadataProcessing(true);
      
      try {
        // CHANGED ORDER: First attempt to extract from filename as it's most direct
        const filenameData = extractMetadataFromFilename(file.name);
        let foundTitle = filenameData.title;
        let foundBpm = filenameData.bpm;
        let foundKey = filenameData.key;
        
        let metadataSource = 'filename';
        
        // If BPM or key are missing from filename, try embedded metadata
        if (!foundBpm || !foundKey) {
          try {
            // Try to extract embedded metadata from the file
            const metadata = await musicMetadata.parseBlob(file);
            
            // Use embedded metadata if available
            if (metadata.common.title && (!foundTitle || foundTitle === '')) {
              foundTitle = metadata.common.title;
            }
            
            if (metadata.common.bpm && (!foundBpm || foundBpm === '')) {
              foundBpm = String(Math.round(metadata.common.bpm));
            }
            
            if (metadata.common.key && (!foundKey || foundKey === '')) {
              foundKey = metadata.common.key;
            }
            
            // Handle tags from metadata
            if (metadata.common.genre && metadata.common.genre.length > 0) {
              const newTags = [...tags];
              metadata.common.genre.forEach(genre => {
                if (!newTags.includes(genre)) {
                  newTags.push(genre);
                }
              });
              setTags(newTags);
              setValue('tags', newTags.join(','));
            }
            
            metadataSource = 'embedded metadata';
          } catch (metadataError) {
            console.error('Error extracting embedded metadata:', metadataError);
          }
        }
        
        // If we still missing BPM or key data, use audio analysis
        // Try Meyda first for better key detection via chroma analysis
        if (!foundBpm || !foundKey) {
          try {
            if (meydaLoaded) {
              const meydaResults = await analyzeMeyda(file);

              // Update form fields only if they weren't found in filename
              if (meydaResults.bpm && (!foundBpm || foundBpm === '')) {
                foundBpm = String(meydaResults.bpm);
                setValue('bpm', foundBpm);
              }
              if (meydaResults.key && (!foundKey || foundKey === '')) {
                foundKey = meydaResults.key;
                setValue('key', foundKey);
              }

              // Store suggestions in state INSTEAD of auto-adding to tags
              setSuggestedGenres(meydaResults.genres || []);
              setSuggestedMoods(meydaResults.moods || []);

              if (meydaResults.bpm || meydaResults.key || (meydaResults.genres && meydaResults.genres.length > 0) || (meydaResults.moods && meydaResults.moods.length > 0)) {
                toast.success('Audio analysis complete', {
                  description: `Detected: ${meydaResults.bpm ? `BPM: ${meydaResults.bpm}` : ''} ${meydaResults.key ? `Key: ${meydaResults.key}` : ''}`,
                  duration: 3000,
                });
                metadataSource = 'Meyda audio analysis';
              } else {
                 toast.info('Could not extract BPM/Key via Meyda.');
              }
            } else {
              toast.warning("Meyda not loaded, skipping advanced analysis.");
            }
          } catch (analysisError) {
            console.error("Error during Meyda analysis:", analysisError);
            toast.error("Audio analysis failed.");
            // Clear suggestions on error
            setSuggestedGenres([]);
            setSuggestedMoods([]);
          }
        }
        
        // Set form values, only if fields are empty (don't overwrite user input)
        const currentTitle = watch('title');
        const currentBpm = watch('bpm');
        const currentKey = watch('key');
        
        if (foundTitle && (!currentTitle || currentTitle === '')) {
          setValue('title', foundTitle);
        }
        
        if (foundBpm && (!currentBpm || currentBpm === '120')) {
          setValue('bpm', foundBpm);
        }
        
        if (foundKey && (!currentKey || currentKey === '')) {
          setValue('key', foundKey);
        }
        
        toast.success('Metadata extracted', {
          description: `Audio information has been extracted from ${metadataSource} and added to the form.`,
          duration: 3000,
        });
      } catch (error) {
        console.error('Error processing audio:', error);
        toast.error('Metadata extraction failed', {
          description: 'Could not extract all metadata from the audio file.',
          duration: 3000,
        });
      } finally {
        setIsMetadataProcessing(false);
      }
    }
  };

  const onSubmit = async (data: UploadFormData) => {
    if (!selectedType) {
      toast.error('Missing Content Type', {
        description: 'Please select a content type (Beats, Loops, Soundkits or Presets).',
      });
      return;
    }

    if (!audioFile || !coverImageFile) {
      toast.error('Missing Files', {
        description: 'Please upload both an audio file and a cover image.',
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('contentType', selectedType);
      formData.append('mainTrack', audioFile);
      formData.append('coverImage', coverImageFile);
      
      // Add tags
      formData.append('tags', tags.join(','));
      
      Object.entries(data).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });

      console.log('Submitting to API:', { 
        contentType: selectedType, 
        tags,
        audioFile: audioFile.name,
        coverImage: coverImageFile.name,
        ...data
      });

      const result = await uploadTrack(formData);
      
      if (result.success) {
        toast.success('Upload Successful', {
          description: 'Your content has been uploaded successfully.',
        });
        reset();
        setAudioFile(null);
        setCoverImageFile(null);
        setTags([]);
        setTagInput('');
        // Keep selected content type for convenience
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      toast.error('Upload Failed', {
        description: error instanceof Error ? error.message : 'Something went wrong',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        const newTags = [...tags, tagInput.trim()];
        setTags(newTags);
        setValue('tags', newTags.join(','));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    setValue('tags', newTags.join(','));
  };

  return (
    <div className="space-y-8">
      {/* Content Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ContentTypeCard
          type="beats"
          title="Beats"
          description="Share your beats with the world"
          icon={<Music className="w-5 h-5" />}
          selected={selectedType === 'beats'}
          onClick={() => setSelectedType('beats')}
          formats={['WAV, MP3, AIFF']}
          sizeLimit="100MB"
        />
        <ContentTypeCard
          type="loops"
          title="Loops"
          description="Perfect loops for producers"
          icon={<Repeat className="w-5 h-5" />}
          selected={selectedType === 'loops'}
          onClick={() => setSelectedType('loops')}
          formats={['WAV, MP3, AIFF']}
          sizeLimit="50MB"
        />
        <ContentTypeCard
          type="soundkits"
          title="Soundkits"
          description="Complete sound collections"
          icon={<Package className="w-5 h-5" />}
          selected={selectedType === 'soundkits'}
          onClick={() => setSelectedType('soundkits')}
          formats={['ZIP files']}
          sizeLimit="500MB"
        />
        <ContentTypeCard
          type="presets"
          title="Presets"
          description="Share your sound design"
          icon={<Sliders className="w-5 h-5" />}
          selected={selectedType === 'presets'}
          onClick={() => setSelectedType('presets')}
          formats={['Various formats']}
          sizeLimit="100MB"
        />
      </div>

      {selectedType && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left column: Metadata */}
            <div className="space-y-6">
              <h2 className="text-lg font-medium flex items-center gap-2 text-white mb-4">
                <Tag className="w-5 h-5 text-indigo-400" />
                Metadata
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white">Title</Label>
                  <Input 
                    id="title" 
                    placeholder="Enter title" 
                    {...register('title')} 
                    className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:border-indigo-500"
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price" className="text-white">Price (USD)</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-sm border border-gray-800 border-r-0 rounded-l-md bg-gray-900 text-gray-400">
                      $
                    </span>
                    <Input 
                      id="price" 
                      type="text" 
                      className="rounded-l-none bg-gray-900 border-gray-800 text-white" 
                      placeholder="0.00" 
                      {...register('price')} 
                    />
                  </div>
                  {errors.price && (
                    <p className="text-sm text-red-500">{errors.price.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bpm" className="text-white">BPM</Label>
                    <div className="relative">
                      <Input 
                        id="bpm" 
                        type="text" 
                        placeholder="120" 
                        {...register('bpm')} 
                        className="bg-gray-900 border-gray-800 text-white"
                      />
                      {(isMetadataProcessing || isMeydaAnalyzing) && (
                        <div className="absolute right-2 top-2">
                          <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-indigo-500 animate-spin"></div>
                        </div>
                      )}
                    </div>
                    {errors.bpm && (
                      <p className="text-sm text-red-500">{errors.bpm.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="key" className="text-white">Key</Label>
                    <div className="relative">
                      <Input 
                        id="key" 
                        placeholder="e.g. Amin" 
                        {...register('key')} 
                        className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
                      />
                      {(isMetadataProcessing || isMeydaAnalyzing) && (
                        <div className="absolute right-2 top-2">
                          <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-indigo-500 animate-spin"></div>
                        </div>
                      )}
                    </div>
                    {errors.key && (
                      <p className="text-sm text-red-500">{errors.key.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genre" className="text-white">Genre</Label>
                  <Input 
                    id="genre" 
                    placeholder="e.g. Hip Hop, Trap, R&B" 
                    {...register('genre')} 
                    className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
                  />
                  {errors.genre && (
                    <p className="text-sm text-red-500">{errors.genre.message}</p>
                  )}
                  {/* Genre Suggestions */}
                  {suggestedGenres.length > 0 && (
                    <div className="mt-2 space-x-2">
                      <span className="text-xs text-gray-400">Suggestions:</span>
                      {suggestedGenres.map(genre => (
                        <Button
                          key={genre}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs border-indigo-700 text-indigo-300 hover:bg-indigo-900/30 hover:text-indigo-200"
                          onClick={() => {
                            setValue('genre', genre);
                            setSuggestedGenres([]); // Clear suggestions after selection
                          }}
                        >
                          {genre}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags" className="text-white">Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                      <span 
                        key={tag} 
                        className="bg-indigo-900/30 text-indigo-400 text-sm px-2.5 py-1 rounded-full flex items-center gap-1"
                      >
                        {tag}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveTag(tag)}
                          className="text-indigo-400 hover:text-indigo-300 w-4 h-4 rounded-full flex items-center justify-center"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <Input 
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Add tags and press Enter" 
                    className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
                  />
                  <p className="text-xs text-gray-500">Press Enter to add multiple tags</p>
                  {/* Tag Suggestions (Moods & Genres) */}
                  {(suggestedMoods.length > 0 || suggestedGenres.length > 0) && (
                    <div className="mt-2 space-x-2 flex flex-wrap gap-y-2">
                      <span className="text-xs text-gray-400 w-full mb-1">Suggestions:</span>
                      {[...suggestedMoods, ...suggestedGenres].map(suggestion => (
                        <Button
                          key={suggestion}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs border-purple-700 text-purple-300 hover:bg-purple-900/30 hover:text-purple-200"
                          onClick={() => {
                            if (!tags.includes(suggestion)) {
                              const newTags = [...tags, suggestion];
                              setTags(newTags);
                              setValue('tags', newTags.join(','));
                              // Optionally remove suggestion after adding?
                              // setSuggestedMoods(prev => prev.filter(m => m !== suggestion));
                              // setSuggestedGenres(prev => prev.filter(g => g !== suggestion));
                            }
                          }}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                  <input type="hidden" {...register('tags')} />
                </div>
              </div>
            </div>

            {/* Right column: Files */}
            <div className="space-y-6">
              <h2 className="text-lg font-medium flex items-center gap-2 text-white mb-4">
                <Upload className="w-5 h-5 text-indigo-400" />
                Audio File
              </h2>
              
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
                      <p className="text-xs text-gray-500">Max size: 100MB</p>
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

              <h2 className="text-lg font-medium flex items-center gap-2 text-white mb-4 mt-8">
                <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Cover Image
              </h2>
              
              <div className="border border-dashed border-gray-700 rounded-lg p-8 flex flex-col items-center justify-center h-32">
                {!coverImageFile ? (
                  <Dropzone
                    onDrop={(files) => setCoverImageFile(files[0])}
                    accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
                    maxSize={2 * 1024 * 1024}
                    className="w-full h-full flex items-center justify-center cursor-pointer"
                  >
                    <div className="text-center">
                      <p className="text-indigo-400 mb-1">Choose an image or drag and drop</p>
                      <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 2MB</p>
                    </div>
                  </Dropzone>
                ) : (
                  <div className="text-center">
                    <p className="text-indigo-400 mb-1">Selected: {coverImageFile.name}</p>
                    <button 
                      type="button" 
                      onClick={() => setCoverImageFile(null)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Change image
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-12">
            <div className="flex gap-4">
              <Button 
                type="submit" 
                disabled={isUploading} 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-6 rounded-md"
              >
                {isUploading ? 'Uploading...' : (
                  <div className="flex items-center justify-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9" />
                      <path d="M16 16v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4" />
                      <path d="M12 12v9" />
                    </svg>
                    Upload
                  </div>
                )}
              </Button>
              
              <Button 
                type="button"
                variant="outline"
                disabled={isUploading}
                onClick={() => {
                  // Reset form fields
                  reset({ bpm: '120' });
                  
                  // Clear files
                  setAudioFile(null);
                  setCoverImageFile(null);
                  
                  // Clear tags
                  setTags([]);
                  setTagInput('');
                  
                  // Clear selected content type
                  setSelectedType(null);
                  
                  toast.success('Form cleared', {
                    description: 'All form fields have been reset.',
                  });
                }}
                className="px-6 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
              >
                Clear Form
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

interface ContentTypeCardProps {
  type: ContentType;
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  formats: string[];
  sizeLimit: string;
}

function ContentTypeCard({
  type,
  title,
  description,
  icon,
  selected,
  onClick,
  formats,
  sizeLimit
}: ContentTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full p-6 rounded-xl border text-left transition-all",
        "border-gray-800 hover:border-indigo-600/50 hover:bg-indigo-900/10",
        selected && "border-indigo-600 bg-indigo-900/20"
      )}
    >
      <div className="flex items-center mb-4">
        <div className={cn(
          "p-2 rounded-lg mr-3",
          selected ? "bg-indigo-600" : "bg-gray-800"
        )}>
          {icon}
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      
      <p className="text-sm text-gray-400 mb-4">{description}</p>
      
      <div className="space-y-1">
        {formats.map((format, i) => (
          <div key={i} className="flex items-center text-xs text-gray-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            {format}
          </div>
        ))}
        <div className="flex items-center text-xs text-gray-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Up to {sizeLimit}
        </div>
      </div>
    </button>
  );
} 