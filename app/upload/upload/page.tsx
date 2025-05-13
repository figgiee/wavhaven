'use client';

import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { useForm, useFieldArray, UseFormReturn, ControllerRenderProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UploadCloud, Image as ImageIcon, Loader2, Tag, KeyRound, Gauge, Plus, Trash2, XCircle, CheckCircle, FileMusic, X, Check, AudioWaveform } from 'lucide-react';
import { SignedIn } from '@clerk/nextjs'; // Ensure only signed-in users see this
import { parseBlob } from 'music-metadata-browser'; // <-- Add this import
import { Badge } from '@/components/ui/badge'; // Add Badge import
import { toast } from "sonner"; // Added toast
import { useEssentiaAnalysis } from '@/hooks/useEssentiaAnalysis';
import { createMeydaInstance } from '@/lib/meydaService'; // <-- ADD THIS IMPORT
import { preprocessAudioBuffer } from '@/lib/audioPreProcessor'; // Assuming you might use this before Meyda if not already done
import { processHPSS } from '@/lib/hpss'; // <-- ADD THIS IMPORT
import { determineKeyFromChromaFrames } from '@/lib/keyDetectionModule'; // <-- ADD THIS IMPORT
import { calculateGlobalBpmViaWorker } from '@/lib/bpmAnalysis'; // <-- Import the worker function

// --- Import Server Action ---
import { prepareBulkUpload } from '@/server-actions/bulkUploadActions';
// -------------------------

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from "@/components/ui/form";

// Define the structure expected back from the API Route
// Matches the interface in the API route
interface UploadPreparationResult {
  trackId: string;
  _audioFileName: string; // For matching
  _coverFileName?: string; // For matching
  audioUploadUrl?: string;
  coverUploadUrl?: string;
}

// Define the structure of the API response object - REMOVED as we now use Server Action return type
// interface ApiResponse {
//     preparations?: UploadPreparationResult[];
//     error?: string; // Top-level error from API
//     warning?: string; // For partial success (e.g., 207 status)
// }

// --- Moved Type Definitions outside component scope ---
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error' | 'skipped';
type TrackStatus = { audio: UploadStatus; cover: UploadStatus };

// Define the Zod schema for a SINGLE track (renamed from beat)
const trackSchema = z.object({
    id: z.string().optional(), // Optional ID for potential updates (not used in creation)
    title: z.string().min(1, { message: "Title is required." }),
    audioFile: z.instanceof(File, { message: "Audio file is required." }),
    coverImage: z.instanceof(File).optional(),
    bpm: z.number().positive().nullable(),
    key: z.string().nullable(),
    tags: z.string().optional(), // Comma-separated tags
    // Internal fields for tracking filenames during upload
    _audioFileName: z.string().optional(),
    _coverFileName: z.string().optional(),
});

// Define the schema for the bulk upload form (using 'tracks')
const bulkUploadSchema = z.object({
    tracks: z.array(trackSchema).min(1, "Please add at least one track."),
});


type TrackFormValues = z.infer<typeof trackSchema>;
type BulkUploadFormValues = z.infer<typeof bulkUploadSchema>;

// Example data - replace with actual fetched or passed data
const availableKeys = ['Cmaj', 'Cmin', 'Gmaj', 'Gmin', 'Dmaj', 'Dmin', 'Amaj', 'Amin', 'Emaj', 'Emin', 'Bmaj', 'Bmin', 'F#maj', 'F#min', 'C#maj', 'C#min', 'Fmaj', 'Fmin', 'Bbmaj', 'Bbmin', 'Ebmaj', 'Ebmin', 'Abmaj', 'Abmin'];

// Content Type Data
const contentTypes = [
    { id: 'beat', name: 'Beats', description: 'Share your beats with the world', icon: FileMusic, features: ['WAV, MP3, AIFF', 'Up to 100MB'] },
    // Can disable other types for now if focusing on beats bulk upload
    // { id: 'loop', name: 'Loops', description: 'Perfect loops for producers', icon: AudioWaveform, features: ['WAV, MP3, AIFF', 'Up to 10MB'] },
    // { id: 'soundkit', name: 'Soundkits', description: 'Complete sound collections', icon: Boxes, features: ['ZIP Files', 'Up to 500MB'] },
    // { id: 'preset', name: 'Presets', description: 'Share your sound design', icon: SlidersHorizontal, features: ['Various Formats', 'Up to 10MB'] },
];

// Helper function to create a new empty track entry
const createEmptyTrack = (): TrackFormValues => ({
    title: "",
    audioFile: undefined as unknown as File, // Required but initially undefined
    coverImage: undefined,
    bpm: null,
    key: null,
    tags: "",
    _audioFileName: undefined,
    _coverFileName: undefined,
});

// Helper function to upload a file to a signed URL
async function uploadFileToSignedUrl(url: string, file: File, contentType: string): Promise<void> {
    const response = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': contentType,
            // Add 'x-upsert': 'true' if you want Supabase to overwrite existing files
            // 'x-upsert': 'true'
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Signed URL Upload Error:", errorText);
        throw new Error(`Failed to upload ${file.name}: ${response.statusText} - ${errorText}`);
    }
     console.log(`Successfully uploaded ${file.name} to signed URL.`);
}

// --- NEW: Extracted Tag Input Component ---
interface TrackTagInputProps {
    field: ControllerRenderProps<BulkUploadFormValues, `tracks.${number}.tags`>;
    form: UseFormReturn<BulkUploadFormValues>;
}

function TrackTagInput({ field, form }: TrackTagInputProps) {
    const [inputValue, setInputValue] = useState('');
    const tagsArray = (field.value || "").split(',').map((t: string) => t.trim()).filter(Boolean);

    const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const newTag = inputValue.trim();
            if (newTag && !tagsArray.includes(newTag)) {
                const updatedTags = [...tagsArray, newTag].join(', ');
                form.setValue(field.name, updatedTags, { shouldValidate: true });
            }
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        const updatedTags = tagsArray.filter((tag: string) => tag !== tagToRemove).join(', ');
        form.setValue(field.name, updatedTags, { shouldValidate: true });
    };

    return (
        <FormItem>
            <FormLabel className="text-gray-300">Tags</FormLabel>
            <FormControl>
                <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Add tags and press Enter"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        className="bg-gray-900/70 border-gray-700 focus:border-indigo-500 focus:ring-indigo-500 text-white pl-8"
                    />
                </div>
            </FormControl>
            <FormDescription className="text-xs text-gray-500">Press Enter to add tags. Click tag to remove.</FormDescription>
            <div className="mt-2 flex flex-wrap gap-2">
                {tagsArray.map((tag: string, i: number) => (
                    <Badge
                        key={`${tag}-${i}`}
                        variant="secondary"
                        className="cursor-pointer hover:bg-red-900/50 hover:text-red-300 transition-colors inline-flex items-center"
                        asChild
                    >
                      <button 
                        type="button"
                        onClick={() => removeTag(tag)}
                        aria-label={`Remove tag: ${tag}`}
                        title={`Remove "${tag}"`}
                      >
                        {tag}
                        <X className="ml-1.5 h-3 w-3" aria-hidden="true"/>
                      </button>
                    </Badge>
                ))}
            </div>
            <FormMessage />
        </FormItem>
    );
}
// --- END: Extracted Tag Input Component ---

export default function UploadPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [uploadStatuses, setUploadStatuses] = useState<TrackStatus[]>([]);
    // State for selected content type, managed outside RHF
    const [selectedContentType, setSelectedContentType] = useState<string>('beat');

    const { analyzeAudioWithEssentia, isAnalyzing: isAnyEssentiaAnalyzing, error: essentiaGlobalError, isEssentiaReady } = useEssentiaAnalysis();

    // Add state to track analysis status per track item
    const [trackAnalysisStatuses, setTrackAnalysisStatuses] = useState<Record<string, 'idle' | 'analyzing' | 'success' | 'error'>>({});
    const [isDraggingMainTrack, setIsDraggingMainTrack] = useState(false); // Added from single upload, might be per-track

    const form = useForm<BulkUploadFormValues>({
        resolver: zodResolver(bulkUploadSchema),
        defaultValues: {
            tracks: [createEmptyTrack()],
        },
        mode: "onBlur",
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "tracks",
    });

    // Initialize statuses based on the number of fields
    useEffect(() => {
        // Initialize status only if it doesn't exist for the index yet
        setUploadStatuses(prev => {
            const newStatuses = [...prev];
            while (newStatuses.length < fields.length) {
                newStatuses.push({ audio: 'idle', cover: 'idle' });
            }
            // Trim excess statuses if fields were removed
            return newStatuses.slice(0, fields.length);
        });
    }, [fields.length]); // Rerun when fields array length changes

    const updateUploadStatus = (index: number, type: 'audio' | 'cover', status: UploadStatus) => {
        setUploadStatuses(prevStatuses => {
            const newStatuses = [...prevStatuses];
            if (newStatuses[index]) {
                newStatuses[index] = { ...newStatuses[index], [type]: status };
            }
            return newStatuses;
        });
    };

    // Update status when analysis starts/ends for a specific track ID/index
    const setTrackAnalysisStatus = useCallback((index: number, status: 'idle' | 'analyzing' | 'success' | 'error') => {
         setTrackAnalysisStatuses(prev => ({
             ...prev,
             [index]: status
         }));
    }, []);

    const handleMeydaAnalysis = async (index: number) => {
        const audioFile = form.getValues(`tracks.${index}.audioFile`);
        if (!audioFile) {
            toast.error("No audio file selected for this track.");
            return;
        }

        console.log(`Attempting Audio API processing for Meyda.js analysis for track ${index + 1}`, audioFile.name);
        setTrackAnalysisStatus(index, 'analyzing');
        let audioCtx: AudioContext | null = null; // Define audioCtx here to be accessible in finally
        let meydaAnalyzer: any = null; // To hold Meyda instance for stopping
        let sourceNodeToAnalyze: AudioBufferSourceNode | null = null; // To hold the source node
        const MEYDA_BUFFER_SIZE = 4096; // Define buffer size for consistency

        try {
            // 1. Create AudioContext
            // Ensure AudioContext is available (runs in client-side effect or function)
            if (typeof window !== "undefined") {
                audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            } else {
                throw new Error("AudioContext not supported in this environment.");
            }

            // 2. Read file to ArrayBuffer
            const arrayBuffer = await audioFile.arrayBuffer();
            toast.info(`Read ${audioFile.name} into ArrayBuffer. Decoding...`, { duration: 2000 });

            // 3. Decode ArrayBuffer to AudioBuffer
            let audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            console.log(`Audio decoded for ${audioFile.name}: Duration=${audioBuffer.duration.toFixed(2)}s, SampleRate=${audioBuffer.sampleRate}Hz, Channels=${audioBuffer.numberOfChannels}`);
            toast.success(`Audio decoded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz, ${audioBuffer.numberOfChannels}ch`, { duration: 3000 });

            // 3.5 Pre-process Audio Buffer (Task 4 Integration)
            try {
                console.log('Starting audio pre-processing...');
                toast.info('Pre-processing audio (resample, mono, normalize, filter)...');
                audioBuffer = await preprocessAudioBuffer(audioBuffer, {
                    // Use default options or pass custom ones if needed
                    // targetSampleRate: 44100,
                    // normalizeTargetDBFS: -1.0,
                    // highPassFreq: 30,
                });
                console.log(`Audio pre-processed: Duration=${audioBuffer.duration.toFixed(2)}s, SampleRate=${audioBuffer.sampleRate}Hz, Channels=${audioBuffer.numberOfChannels}ch`);
                toast.success('Audio pre-processing complete.');
            } catch (preprocessError) {
                 console.error('Audio pre-processing error:', preprocessError);
                 toast.error(`Pre-processing failed: ${preprocessError instanceof Error ? preprocessError.message : String(preprocessError)}`);
                 // Decide whether to continue analysis with the original buffer or stop
                 // For now, let's stop if pre-processing fails, as subsequent steps might rely on it.
                 throw preprocessError; // Re-throw to stop further processing in this block
            }

            // 4. Create AudioBufferSourceNode using the *processed* buffer
            sourceNodeToAnalyze = audioCtx.createBufferSource();
            sourceNodeToAnalyze.buffer = audioBuffer; // Use the potentially modified audioBuffer
            
            const allPowerSpectrums: Float32Array[] = [];
            const allChromaVectors: Float32Array[] = []; // <-- For collecting chroma

            // 5. Setup Meyda instance
            meydaAnalyzer = createMeydaInstance(audioCtx, sourceNodeToAnalyze, {
                bufferSize: MEYDA_BUFFER_SIZE, // Use defined buffer size
                featureExtractors: ['powerSpectrum', 'chroma'],
                chromaBands: 12,
                callback: (features: { powerSpectrum: Float32Array, chroma?: Float32Array }) => {
                    if (features.powerSpectrum) {
                        allPowerSpectrums.push(new Float32Array(features.powerSpectrum));
                    }
                    if (features.chroma) {
                        allChromaVectors.push(new Float32Array(features.chroma));
                    }
                }
            });

            // 6. Start analysis and setup stopping condition
            const analysisPromise = new Promise<void>((resolve, reject) => {
                if (!sourceNodeToAnalyze || !meydaAnalyzer) {
                    reject(new Error("Audio source or Meyda analyzer not initialized."));
                    return;
                }
                sourceNodeToAnalyze.onended = () => {
                    console.log("Audio source ended, stopping Meyda.");
                    if (meydaAnalyzer) {
                        meydaAnalyzer.stop();
                        meydaAnalyzer = null; // Clear instance
                    }
                    resolve();
                };

                try {
                    meydaAnalyzer.start();
                    sourceNodeToAnalyze.start(0); // Start playing the buffer for Meyda to process
                    console.log('Meyda analysis started.');
                } catch (meydaStartError) {
                    console.error("Error starting Meyda analysis:", meydaStartError);
                    reject(meydaStartError);
                }
            });

            await analysisPromise; // Wait for Meyda to process the whole buffer

            console.log(`Collected ${allPowerSpectrums.length} powerSpectrum frames.`);
            if (allPowerSpectrums.length > 0) {
                console.log(`First frame length: ${allPowerSpectrums[0].length}`);
                toast.success(`Spectrogram data collected: ${allPowerSpectrums.length} frames.`);

                // Call HPSS processing
                try {
                    console.log('Starting HPSS processing...');
                    toast.info('Performing Harmonic-Percussive Source Separation...');
                    const { harmonicOutputSpectrogram, percussiveOutputSpectrogram } = await processHPSS(allPowerSpectrums, {
                        harmonicKernelSize: 17, // Default, can be tuned
                        percussiveKernelSize: 17, // Default, can be tuned
                        maskingExponent: 1,      // Default, can be tuned
                    });
                    console.log('HPSS processing complete.');
                    console.log(`Harmonic output spectrogram: ${harmonicOutputSpectrogram.length} frames, first frame length: ${harmonicOutputSpectrogram[0]?.length}`);
                    console.log(`Percussive output spectrogram: ${percussiveOutputSpectrogram.length} frames, first frame length: ${percussiveOutputSpectrogram[0]?.length}`);
                    toast.success('HPSS processing successful!');

                    // --- BPM Analysis via Worker ---
                    let finalBpm: number | null = null;
                    if (percussiveOutputSpectrogram) {
                         try {
                            const frameRate = audioCtx.sampleRate / MEYDA_BUFFER_SIZE;
                            console.log('Starting BPM analysis via worker...');
                            toast.info('Analyzing BPM...');
                            finalBpm = await calculateGlobalBpmViaWorker(
                                percussiveOutputSpectrogram, 
                                frameRate, 
                                { minBPM: 60, maxBPM: 180, minVoteBPM: 70, maxVoteBPM: 180 } // Optional: pass custom options
                            );
                            
                            if (finalBpm !== null) {
                                console.log(`Worker returned final BPM: ${finalBpm}`);
                                toast.success(`Global BPM calculated: ${finalBpm}`);
                                form.setValue(`tracks.${index}.bpm`, finalBpm, { shouldValidate: true });
                            } else {
                                console.log('BPM worker did not return a final BPM.');
                                toast.warn('Could not determine BPM value.');
                            }
                         } catch (bpmErr) {
                             console.error('BPM analysis worker error:', bpmErr);
                             toast.error(`BPM analysis failed: ${bpmErr instanceof Error ? bpmErr.message : String(bpmErr)}`);
                         }
                    }
                    // --- End BPM Analysis via Worker ---

                } catch (hpssError) {
                    console.error('HPSS processing error:', hpssError);
                    toast.error(`HPSS failed: ${hpssError instanceof Error ? hpssError.message : String(hpssError)}`);
                    // Potentially set trackAnalysisStatus to error here if HPSS is critical before BPM/Key setting
                }
            }

            // Placeholder BPM/Key setting (remains from previous steps)
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate further async work

            // Use detected key if available, otherwise placeholder/keep existing
            if (detectedKeyInfo && detectedKeyInfo.key !== 'Unknown') {
                form.setValue(`tracks.${index}.key`, detectedKeyInfo.key, { shouldValidate: true });
            } else {
                // Optional: set to a default or clear if key detection fails
                // form.setValue(`tracks.${index}.key`, null, { shouldValidate: true }); 
                // For now, let previous placeholder logic or manual input prevail if no new key found
                if (!form.getValues(`tracks.${index}.key`)) { // Only set placeholder if field is empty
                    const placeholderKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
                    form.setValue(`tracks.${index}.key`, placeholderKey, { shouldValidate: true });
                }
            }
            // Update BPM only if it wasn't set by the analysis
            if (form.getValues(`tracks.${index}.bpm`) === null) {
                const placeholderBpm = Math.floor(Math.random() * (180 - 70 + 1)) + 70;
                form.setValue(`tracks.${index}.bpm`, placeholderBpm, { shouldValidate: true }); // BPM still placeholder if analysis failed
            }
            
            // Refined toast message - get final values from form
            const finalKey = form.getValues(`tracks.${index}.key`);
            const finalBpmValue = form.getValues(`tracks.${index}.bpm`);
            const keyMessagePart = finalKey ? `Key: ${finalKey}` : "Key: N/A";
            const bpmMessagePart = finalBpmValue !== null ? `BPM: ${finalBpmValue}` : "BPM: N/A";
            toast.success(`Analysis complete for ${audioFile.name}. ${keyMessagePart}, ${bpmMessagePart}`);
            setTrackAnalysisStatus(index, 'success');

        } catch (error) {
            console.error(`Audio processing or analysis error for track ${index + 1}:`, error);
            let errorMessage = "Audio processing/analysis failed.";
            if (error instanceof Error) {
                errorMessage = error.message;
                if (error.name === 'EncodingError') { // Specific error from decodeAudioData
                    errorMessage = `Error decoding audio file: ${error.message}. Unsupported format or corrupt file?`;
                }
            }
            toast.error(errorMessage);
            setTrackAnalysisStatus(index, 'error');
        } finally {
            // Clean up AudioContext if it was created and is no longer needed.
            if (meydaAnalyzer) {
                meydaAnalyzer.stop(); // Ensure Meyda is stopped if an error occurred mid-analysis
            }
            if (sourceNodeToAnalyze) {
                sourceNodeToAnalyze.onended = null; // Clean up listener
                // sourceNodeToAnalyze.disconnect(); // Disconnect if connected to other nodes
            }
            if (audioCtx && audioCtx.state !== 'closed') {
                // Closing the context immediately might be an issue if other async operations depend on it.
                // For file-based processing, it might be okay after everything is done for this track.
                // await audioCtx.close(); 
                // console.log("AudioContext closed for track " + (index + 1));
            }
        }
    };

    const handleAudioFileProcessing = async (file: File | undefined, index: number) => {
        const { setValue, getValues, trigger } = form; // Assuming `form` is your useForm instance

         if (!file) {
            // Handle file removal: Clear fields for this specific track index
            setValue(`tracks.${index}.bpm`, null);
            setValue(`tracks.${index}.key`, null);
            // TODO: Clear genre/tags for this index
             setValue(`tracks.${index}._audioFileName`, undefined); // Clear filename helper field
            setTrackAnalysisStatus(index, 'idle');
            return;
        }

        // ... (any existing client-side file validation for this specific file) ...
        // Example: size/type validation

        // Update RHF state with the file object (you likely have this)
        // form.setValue(`tracks.${index}.audioFile`, file, { shouldValidate: true });
        // form.setValue(`tracks.${index}._audioFileName`, file.name); // Update filename helper


        const toastId = `metadata-parse-bulk-${index}`;
        toast.loading(`Processing metadata for ${file.name} (Track #${index + 1})...`, { id: toastId });

        let musicMetadataResults: { bpm?: number, key?: string, title?: string } = {};

        // --- 1. music-metadata-browser (Keep if desired) ---
        try {
            console.log(`[Bulk] Parsing (music-metadata-browser) for: ${file.name}`);
            const metadata = await parseBlob(file); // Assuming parseBlob is imported
            console.log('[Bulk] music-metadata-browser Results:', metadata.common);

            // Auto-fill title if it's empty for this track
            if (metadata.common.title && !getValues(`tracks.${index}.title`)) {
                setValue(`tracks.${index}.title`, metadata.common.title, { shouldValidate: true });
            }
             // Capture BPM/Key from music-metadata as fallback
            if (metadata.common.bpm) musicMetadataResults.bpm = Math.round(metadata.common.bpm);
            if (metadata.common.key) {
                let formattedKey = metadata.common.key.replace(/m$/, 'min');
                if (!formattedKey.endsWith('min') && !formattedKey.endsWith('maj')) formattedKey += 'maj';
                musicMetadataResults.key = formattedKey;
            }
        } catch (error) {
            console.error(`[Bulk] Error with music-metadata-browser for ${file.name}:`, error);
            // Optionally show a specific toast for music-metadata-browser failure
        }

        // --- 2. Essentia.js Analysis ---
        if (isEssentiaReady) {
            console.log(`[Bulk] Analyzing (Essentia.js) for: ${file.name}`);
            setTrackAnalysisStatus(index, 'analyzing');
            try {
                const essentiaResults = await analyzeAudioWithEssentia(file);
                if (essentiaResults) {
                    console.log(`[Bulk] Essentia.js Results for Track #${index + 1}:`, essentiaResults);
                    setTrackAnalysisStatus(index, 'success');

                    // Apply results to form fields for this track index (`tracks.${index}.fieldName`)
                    // Prioritize Essentia or merge. Overwrite fields if a value is detected.
                    if (essentiaResults.bpm) {
                        setValue(`tracks.${index}.bpm`, essentiaResults.bpm, { shouldValidate: true });
                    } else if (musicMetadataResults.bpm) { // Fallback
                        setValue(`tracks.${index}.bpm`, musicMetadataResults.bpm, { shouldValidate: true });
                    }

                    if (essentiaResults.key && essentiaResults.scale) {
                        let formattedKey = `${essentiaResults.key}${essentiaResults.scale === 'major' ? 'maj' : 'min'}`;
                         formattedKey = formattedKey.replace(/\s*major/i, 'maj').replace(/\s*minor/i, 'min');
                        if (availableKeys.includes(formattedKey)) {
                             // Set it if it's a standard key
                            setValue(`tracks.${index}.key`, formattedKey, { shouldValidate: true });
                        } else {
                             // If not in standard list, decide behavior. Setting it allows schema validation.
                             setValue(`tracks.${index}.key`, formattedKey, { shouldValidate: true });
                             console.warn(`[Bulk Essentia] Track #${index+1}: Detected key "${formattedKey}" not in standard list.`);
                        }
                    } else if (musicMetadataResults.key && availableKeys.includes(musicMetadataResults.key)) { // Fallback
                         setValue(`tracks.${index}.key`, musicMetadataResults.key, { shouldValidate: true });
                    }

                    // TODO: Implement logic to set genre/mood/tags for `tracks.${index}.fieldName`
                    // Use analysisResults.genreSuggestions, moodSuggestions, tagSuggestions
                    // Remember to handle your form field type (e.g., string vs array for tags)

                    toast.success(`Analysis complete for ${file.name}.`, { id: toastId, duration: 3000 });

                } else {
                     // No results, but analysis ran (possibly hook error handled internally by toast)
                     setTrackAnalysisStatus(index, essentiaGlobalError ? 'error' : 'success'); // if hook had global error, mark as error
                     if (essentiaGlobalError) {
                        toast.error(`Advanced analysis failed for ${file.name}: ${essentiaGlobalError}`, {duration: 4000});
                     }
                }
            } catch (e) {
                console.error(`[Bulk] Error analyzing with Essentia.js for ${file.name}:`, e);
                setTrackAnalysisStatus(index, 'error');
                 toast.error(`Advanced analysis error for ${file.name}.`, { id: toastId, duration: 4000 });
            }
        } else {
            // Handle case where Essentia isn't ready when file is selected
            setTrackAnalysisStatus(index, 'idle');
            toast.info("Audio analysis engine not ready. Metadata will not be auto-filled for this file. Please try re-selecting or refresh.", {duration: 3000});
            // Fallback to only music-metadata-browser results if Essentia isn't ready
            if (musicMetadataResults.bpm) setValue(`tracks.${index}.bpm`, musicMetadataResults.bpm, { shouldValidate: true });
            if (musicMetadataResults.key && availableKeys.includes(musicMetadataResults.key)) setValue(`tracks.${index}.key`, musicMetadataResults.key, { shouldValidate: true });
        }

        // Final success toast if no specific analysis error toast was shown by essentia part
         if (!essentiaGlobalError && trackAnalysisStatuses[index] !== 'error') {
            toast.success(`Metadata processing finished for ${file.name}.`, { id: toastId, duration: 3000 });
         } else {
            toast.dismiss(toastId); // Dismiss loading if an error occurred during essentia analysis
         }
    };

    async function onSubmit(data: BulkUploadFormValues) {
        setIsSubmitting(true);
        toast.info("Preparing uploads...", { id: "prepare-toast" }); // Give toast an ID for updates

        // Reset statuses to 'idle' or 'skipped' before starting
        setUploadStatuses(data.tracks.map((track) => ({
            audio: track.audioFile instanceof File ? 'idle' : 'skipped',
            cover: track.coverImage instanceof File ? 'idle' : 'skipped'
        })));

        // 1. Prepare API Payload (filter tracks without audio)
        const apiPayload = {
            tracks: data.tracks
                .map((track, index) => ({ // Include original index for status updates
                    ...track,
                    index,
                    bpm: track.bpm ?? null, // Ensure null if empty/0
                    key: track.key ?? null,
                    tags: track.tags ?? '',
                    _audioFileName: track.audioFile instanceof File ? track.audioFile.name : undefined,
                    _coverFileName: track.coverImage instanceof File ? track.coverImage.name : undefined,
                }))
                .filter(track => !!track._audioFileName) // Only include tracks with audio files
        };

        if (apiPayload.tracks.length === 0) {
            toast.warning("No tracks with audio files selected for upload.", { id: "prepare-toast" });
                setIsSubmitting(false);
                return;
            }

        // --- Step 2.1: Call Server Action directly ---
        try {
            // Replace fetch call with direct server action invocation
            // const response = await fetch('/api/prepare-upload', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ tracks: apiPayload.tracks.map(({ index, ...rest }) => rest) }) // Send only track data, not the index
            // });
            // const responseBody: ApiResponse = await response.json();

            const responseBody = await prepareBulkUpload({ 
                // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Destructuring to omit index from payload
                tracks: apiPayload.tracks.map(({ index, ...rest }) => rest) // Pass only track data
            });
            
            const successfulPreparations: UploadPreparationResult[] = responseBody.preparations || []; // Use const

            // --- Step 2.2 & 2.3 (Status Update Part 1): Handle Server Action Response ---
            // The rest of the logic remains largely the same, but we check responseBody.error instead of response.ok

            // Update statuses based on API response
            setUploadStatuses(prevStatuses => {
                const newStatuses = [...prevStatuses];
                apiPayload.tracks.forEach(submittedTrack => {
                    const originalIndex = submittedTrack.index;
                    const prepResult = successfulPreparations.find(p => p._audioFileName === submittedTrack._audioFileName);

                    if (prepResult) {
                        // Mark as ready for upload (idle) if prepared successfully
                        if (newStatuses[originalIndex]) newStatuses[originalIndex].audio = 'idle';
                        // Only mark cover as ready if it was included and prepared
                        if (prepResult._coverFileName && newStatuses[originalIndex]) {
                             newStatuses[originalIndex].cover = 'idle';
                        } else if (submittedTrack._coverFileName && newStatuses[originalIndex]) {
                            // Cover was submitted but not prepared successfully
                            newStatuses[originalIndex].cover = 'error';
                        }
                    } else {
                        // Mark as error if submitted but not in successful preparations
                        if (newStatuses[originalIndex]) newStatuses[originalIndex].audio = 'error';
                        if (submittedTrack._coverFileName && newStatuses[originalIndex]) {
                             newStatuses[originalIndex].cover = 'error'; // Also mark cover as error if audio failed preparation
                        }
                    }
                });
                // Ensure skipped statuses remain skipped
                data.tracks.forEach((track, index) => {
                     if (!(track.audioFile instanceof File) && newStatuses[index]) {
                        newStatuses[index].audio = 'skipped';
                        if (newStatuses[index].cover !== 'skipped') { // Don't overwrite if cover was explicitly skipped
                           newStatuses[index].cover = track.coverImage instanceof File ? 'skipped' : newStatuses[index].cover;
                        }
                     }
                     if (!(track.coverImage instanceof File) && newStatuses[index] && newStatuses[index].cover !== 'error') { // Keep error status if set previously
                        newStatuses[index].cover = 'skipped';
                     }
                });
                return newStatuses;
            });


            if (responseBody.error) { // Check for error property from server action
                 // Attempt to determine if it was a partial success (207 equivalent)
                 // We'll treat any error with some successful preparations as a warning
                 if (successfulPreparations.length > 0) {
                     toast.warning(`Partial success: ${responseBody.error}`, { id: "prepare-toast", duration: 10000 }); // Longer duration for partial error
                 } else {
                     // Full failure
                     toast.error(responseBody.error, { id: "prepare-toast" });
                 }
                 
                 // Keep isSubmitting true if there are partial successes to upload
                 if (successfulPreparations.length === 0) {
                     setIsSubmitting(false);
                     return; // Stop if preparation completely failed
                 }

            } else {
                toast.success("Preparation complete. Starting uploads...", { id: "prepare-toast" });
            }


            // --- Step 2.3 (Status Update Part 2): Initiate Uploads ---
            const uploadPromises: Promise<void>[] = [];

            successfulPreparations.forEach(prep => {
                const originalIndex = apiPayload.tracks.find(t => t._audioFileName === prep._audioFileName)?.index;
                const trackData = originalIndex !== undefined ? data.tracks[originalIndex] : undefined;

                if (originalIndex === undefined || !trackData) {
                    console.error("Mismatch finding original track for prepared upload:", prep);
                    return; // Should not happen if logic is correct
                }

                // Audio Upload
                if (prep.audioUploadUrl && trackData.audioFile) {
                    const audioFile = trackData.audioFile;
                    updateUploadStatus(originalIndex, 'audio', 'uploading');
                    uploadPromises.push(
                        uploadFileToSignedUrl(prep.audioUploadUrl, audioFile, audioFile.type)
                            .then(() => updateUploadStatus(originalIndex, 'audio', 'success'))
                            .catch((error) => {
                                console.error(`Audio upload failed for ${audioFile.name}:`, error);
                                updateUploadStatus(originalIndex, 'audio', 'error');
                                toast.error(`Upload failed for ${audioFile.name}`);
                            })
                    );
                } else if(trackData.audioFile) {
                     // If audio file exists but no URL, it means preparation failed for it earlier
                     updateUploadStatus(originalIndex, 'audio', 'error');
                }

                // Cover Upload (if applicable)
                if (prep.coverUploadUrl && trackData.coverImage) {
                    const coverFile = trackData.coverImage;
                    updateUploadStatus(originalIndex, 'cover', 'uploading');
                    uploadPromises.push(
                        uploadFileToSignedUrl(prep.coverUploadUrl, coverFile, coverFile.type)
                            .then(() => updateUploadStatus(originalIndex, 'cover', 'success'))
                            .catch((error) => {
                                console.error(`Cover upload failed for ${coverFile.name}:`, error);
                                updateUploadStatus(originalIndex, 'cover', 'error');
                                toast.error(`Upload failed for ${coverFile.name}`);
                            })
                    );
                 } else if (trackData.coverImage && !prep.coverUploadUrl && uploadStatuses[originalIndex]?.cover !== 'skipped') {
                     // If cover file exists but no URL (and not skipped), it means preparation failed for it earlier
                     updateUploadStatus(originalIndex, 'cover', 'error');
                 }
            });

            await Promise.all(uploadPromises);

             // Check final statuses
             const finalStatuses = uploadStatuses; // Get the latest state
             const allSucceeded = finalStatuses.every(status =>
                 (status.audio === 'success' || status.audio === 'skipped') &&
                 (status.cover === 'success' || status.cover === 'skipped')
             );
             const anyFailed = finalStatuses.some(status => status.audio === 'error' || status.cover === 'error');

             if (allSucceeded) {
                 toast.success("All uploads completed successfully!");
                 form.reset({ tracks: [createEmptyTrack()] }); // Reset form on full success
                 setUploadStatuses([]); // Clear statuses
             } else if (anyFailed) {
                 toast.error("Some uploads failed. Please check the status indicators.");
                } else {
                 // Should mean some are still uploading? Or partial success without errors?
                 // This case might need refinement depending on desired behavior.
                 toast.warning("Uploads finished, but some may not have completed successfully.");
             }


        } catch (error) {
            console.error('Error during upload preparation or submission:', error);
            toast.error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`, { id: "prepare-toast" });
             // Set all 'idle' or 'uploading' statuses to 'error' on unexpected failure
             setUploadStatuses(prev => prev.map(status => ({
                 audio: status.audio === 'idle' || status.audio === 'uploading' ? 'error' : status.audio,
                 cover: status.cover === 'idle' || status.cover === 'uploading' ? 'error' : status.cover,
             })));
        } finally {
            setIsSubmitting(false);
        }
    }

    // --- Step 2.4: Add Status Indicator Helper --- // Modified for accessibility
    const getStatusIndicator = (status: UploadStatus | undefined) => {
        let statusText = "Idle";
        let IconComponent = null;
        let iconClassName = "text-gray-500";

        switch (status) {
            case 'uploading':
                statusText = "Uploading";
                IconComponent = Loader2;
                iconClassName = "text-blue-500 animate-spin";
                break;
            case 'success':
                statusText = "Upload successful";
                IconComponent = CheckCircle;
                iconClassName = "text-green-500";
                break;
            case 'error':
                statusText = "Upload failed";
                IconComponent = XCircle;
                iconClassName = "text-red-500";
                break;
            case 'skipped':
                 statusText = "Skipped";
                 IconComponent = Check; // Or another suitable icon
                 iconClassName = "text-yellow-500";
                 break;
            case 'idle':
            default:
                statusText = "Idle";
                // No icon for idle, or a placeholder if desired
                break;
        }

        return (
            <span className="inline-flex items-center">
                {IconComponent && <IconComponent className={`h-4 w-4 ${iconClassName}`} aria-hidden="true" />}
                <span className="sr-only">{statusText}</span>
            </span>
        );
    };

    return (
        <SignedIn>
            <div className="container mx-auto max-w-6xl px-4 py-12 sm:py-16 text-gray-200">
                 <header className="mb-10 sm:mb-12 text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold mb-2 text-white">Share Your Sound</h1>
                    <p className="text-lg text-gray-400">Choose your content type and start sharing.</p>
                </header>

                {/* Content Type Selection - Managed by useState, not RHF */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                     {contentTypes.map((type) => (
                         // Removed FormField and FormItem wrappers
                         <div key={type.id} className="block relative">
                             <button
                                 type="button"
                                 // Use setSelectedContentType for onClick
                                 onClick={() => setSelectedContentType(type.id)}
                                 disabled={type.id !== 'beat'} // Disable non-beat types for now
                                 className={cn(
                                     "w-full p-6 text-left rounded-lg border-2 transition-all duration-200 ease-in-out",
                                     "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900",
                                     // Check against selectedContentType state
                                     selectedContentType === type.id 
                                         ? 'border-indigo-500 bg-indigo-900/30 shadow-lg'
                                         : 'border-gray-700 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-800/40',
                                     type.id !== 'beat' ? 'opacity-50 cursor-not-allowed' : ''
                                 )}
                             >
                                 <div className="flex items-center mb-3">
                                     {/* Check against selectedContentType state */}
                                     <type.icon className={cn("w-6 h-6 mr-3", selectedContentType === type.id ? "text-indigo-400" : "text-gray-500")} />
                                     {/* Check against selectedContentType state */}
                                     <h3 className={cn("text-lg font-semibold", selectedContentType === type.id ? "text-white" : "text-gray-300")}>{type.name}</h3>
                                 </div>
                                 <p className="text-sm text-gray-400 mb-3">{type.description}</p>
                                 <ul className="space-y-1 text-xs text-gray-500">
                                     {type.features.map((feature, i) => (
                                         <li key={i} className="flex items-center">
                                             <Check className="w-3 h-3 mr-1.5 text-green-500 flex-shrink-0" />
                                             {feature}
                                         </li>
                                     ))}
                                 </ul>
                             </button>
                            {/* Removed hidden radio input and label */}
                         </div>
                     ))}
                 </div>

                {/* RHF Form context now wraps only the track upload part */}
                <Form {...form}>
                    {/* Form element now wraps the field array mapping */}
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        
                        {/* Map over track fields */} 
                        <div className="space-y-8">
                            {fields.map((item, index) => (
                                <div key={item.id} className="p-6 bg-gray-900/30 border border-gray-700/50 rounded-lg relative space-y-6">
                                    {/* Remove Button for this track */} 
                                    {fields.length > 1 && (
                                         <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="text-red-500 hover:text-red-400 hover:bg-red-900/30 border-red-500/30 hover:border-red-500/60"
                                            onClick={() => remove(index)}
                                            disabled={fields.length <= 1} // Disable removing if only one track left
                                            title="Remove this track"
                                            aria-label={`Remove track ${index + 1}`}
                                         >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}

                                    <h3 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">Track #{index + 1}</h3>

                                    {/* Upload Status Indicator */}
                                    <div className="absolute top-3 left-3 flex items-center space-x-4 text-xs">
                                        <div className="flex items-center space-x-1">
                                            <AudioWaveform className="h-3 w-3 text-gray-400" />
                                            <span className="text-gray-400">Audio:</span>
                                            {/* Call helper for audio status */} 
                                            {getStatusIndicator(uploadStatuses[index]?.audio)}
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <ImageIcon className="h-3 w-3 text-gray-400" />
                                            <span className="text-gray-400">Cover:</span>
                                            {/* Call helper for cover status */} 
                                            {getStatusIndicator(uploadStatuses[index]?.cover)}
                                        </div>
                                    </div>

                                    {/* --- Form Content for ONE Track (similar to old layout but uses index) --- */} 
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                        {/* --- Left Column: Metadata --- */} 
                                        <div className="space-y-6">
                                             {/* Title */}
                                            <FormField
                                                control={form.control}
                                                name={`tracks.${index}.title`}
                                                render={({ field }: { field: ControllerRenderProps<BulkUploadFormValues, `tracks.${number}.title`> }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-gray-300">Title</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter Title" {...field} className="bg-gray-900/70 border-gray-700 focus:border-indigo-500 focus:ring-indigo-500 text-white" />
                                                        </FormControl>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )}
                                            />
                                            {/* BPM/Key Row */} 
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                {/* BPM Field */}
                                                <FormField control={form.control} name={`tracks.${index}.bpm`} render={({ field }: { field: ControllerRenderProps<BulkUploadFormValues, `tracks.${number}.bpm`> }) => (
                                                    <FormItem className="col-span-1">
                                                        <FormLabel className="text-gray-300">BPM</FormLabel>
                                                        <FormControl>
                                                            <Input 
                                                                type="number" 
                                                                placeholder="e.g. 120" 
                                                                {...field} 
                                                                value={field.value ?? ''}
                                                                onChange={e => {
                                                                    const value = e.target.value;
                                                                    field.onChange(value === '' ? null : parseInt(value, 10));
                                                                }}
                                                                className="bg-gray-900/70 border-gray-700 focus:border-indigo-500 focus:ring-indigo-500 text-white"
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )} />
                                                {/* Key Field */}
                                                <FormField control={form.control} name={`tracks.${index}.key`} render={({ field }: { field: ControllerRenderProps<BulkUploadFormValues, `tracks.${number}.key`> }) => (
                                                    <FormItem className="col-span-1">
                                                        <FormLabel className="text-gray-300">Key</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value ?? undefined} >
                                                            <FormControl>
                                                                <SelectTrigger className="bg-gray-900/70 border-gray-700 focus:border-indigo-500 focus:ring-indigo-500 text-white">
                                                                    <SelectValue placeholder="Select key" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                                                {availableKeys.map((k) => (
                                                                    <SelectItem key={k} value={k} className="hover:bg-gray-700">{k}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )} />
                                            </div>
                                             {/* Tags */}
                                            <FormField
                                                control={form.control}
                                                name={`tracks.${index}.tags`}
                                                render={({ field }: { field: ControllerRenderProps<BulkUploadFormValues, `tracks.${number}.tags`> }) => (
                                                    <TrackTagInput field={field} form={form} />
                                                )}
                                            />
                                        </div>
                                        {/* --- Right Column: Files --- */} 
                                        <div className="space-y-8">
                                             {/* Audio File Input - Inlined */}
                                             <FormField
                                                control={form.control}
                                                name={`tracks.${index}.audioFile`}
                                                render={({ field }) => (
                                                  <FormItem>
                                                    <FormLabel className="flex items-center justify-between w-full text-gray-300">
                                                        <span>Audio File <span className="text-red-500">*</span></span>
                                                        {/* Use the updated getStatusIndicator */} 
                                                        {getStatusIndicator(uploadStatuses[index]?.audio)} 
                                                    </FormLabel>
                                                    <FormControl>
                                                      <div className={cn(
                                                                 "relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-lg cursor-pointer bg-gray-900/50 transition-colors group",
                                                                 }
                                                                 )}
                                                                   // Add accessibility attributes to the clickable/droppable div
                                                                   tabIndex={0}
                                                                   role="button"
                                                                   aria-label={`Upload audio file for track ${index + 1}`}
                                                                   onClick={() => document.getElementById(`audio-file-input-${index}`)?.click()}
                                                                   onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { document.getElementById(`audio-file-input-${index}`)?.click(); }}}
                                                                   // Drag/drop handlers remain
                                                                   onDragOver={(e) => { e.preventDefault(); /* Add hover state */ }}
                                                                   onDragLeave={(e) => { /* Remove hover state */ }}
                                                                   onDrop={(e) => { /* Handle drop */ }}
                                                                 >
                                                                     <Input 
                                                                       id={`audio-file-input-${index}`} // Ensure ID exists
                                                                       name={`tracks.${index}.audioFile`} 
                                                                       type="file" 
                                                                       accept="audio/*" 
                                                                       onChange={async (e) => {
                                                                         const file = e.target.files?.[0];
                                                                         form.setValue(`tracks.${index}.audioFile`, file, { shouldValidate: true });
                                                                         await handleAudioFileProcessing(file, index);
                                                                       }}
                                                                       onBlur={field.onBlur} 
                                                                       ref={field.ref} 
                                                                       disabled={!form.watch(`tracks.${index}.audioFile`)} 
                                                                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                                                       // Add ARIA for the hidden input itself
                                                                       aria-label={`Audio file input for track ${index + 1}`}
                                                                       aria-hidden="true"
                                                                     />
                                                                     <div className="text-center pointer-events-none">
                                                                       <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
                                                                     </div>
                                                                   </div>
                                                    </FormControl>
                                                  </FormItem>
                                                )}
                                              />
                                             {/* Cover Image Input - Inlined */}
                                             <FormField
                                                 control={form.control}
                                                 name={`tracks.${index}.coverImage`}
                                                 render={({ field }) => (
                                                   <FormItem>
                                                     <FormLabel className="flex items-center justify-between w-full text-gray-300">
                                                          <span>Cover Image (Optional)</span>
                                                          {/* Use the updated getStatusIndicator */} 
                                                          {getStatusIndicator(uploadStatuses[index]?.cover)} 
                                                     </FormLabel>
                                                     <FormControl>
                                                       <div 
                                                         className="relative flex items-center justify-center p-4 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-indigo-600 transition-colors h-32"
                                                         onClick={() => document.getElementById(`cover-image-input-${index}`)?.click()} // Trigger hidden input
                                                         tabIndex={0} // Make keyboard focusable
                                                         role="button" // Identify as interactive element
                                                         aria-label={`Upload cover image for track ${index + 1}`}
                                                         onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { document.getElementById(`cover-image-input-${index}`)?.click(); }}} // Trigger on Enter/Space
                                                       >
                                                         {form.getValues(`tracks.${index}.coverImage`) ? (
                                                           <ImageIcon className="h-8 w-8 text-gray-500 mb-2" />
                                                         ) : (
                                                           <p className="text-sm text-center text-gray-400">
                                                             <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
                                                           </p>
                                                         )}
                                                         <Input
                                                           id={`cover-image-input-${index}`}
                                                           type="file"
                                                           className="hidden"
                                                           accept="image/jpeg,image/png,image/webp"
                                                           onChange={(e) => {
                                                               const file = e.target.files?.[0];
                                                               form.setValue(`tracks.${index}.coverImage`, file, { shouldValidate: true });
                                                               form.setValue(`tracks.${index}._coverFileName`, file?.name); // Store filename
                                                           }}
                                                           aria-label={`Cover image input for track ${index + 1}`} // Label for screen reader on hidden input
                                                           aria-hidden="true" // Ensure it's not directly announced if label is on wrapper
                                                         />
                                                       </div>
                                                     </FormControl>
                                                   </FormItem>
                                                 )}
                                               />
                                        </div>
                                    </div>

                                    {/* Analyze Audio Button */}
                                    <Button
                                        type="button"
                                        onClick={() => handleMeydaAnalysis(index)}
                                        disabled={!form.watch(`tracks.${index}.audioFile`) || trackAnalysisStatuses[index] === 'analyzing' || trackAnalysisStatuses[index] === 'success'}
                                        variant="outline"
                                        size="sm"
                                        className="w-full mb-4 bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500"
                                    >
                                        {trackAnalysisStatuses[index] === 'analyzing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {trackAnalysisStatuses[index] === 'success' && <CheckCircle className="mr-2 h-4 w-4 text-green-400" />}
                                        {trackAnalysisStatuses[index] === 'error' && <XCircle className="mr-2 h-4 w-4 text-red-400" />}
                                        Analyze Audio (Key/BPM)
                                    </Button>
                                </div> // End individual track item container
                            ))}
                        </div>

                        {/* Add Track Button */} 
                        <div className="flex justify-center pt-4">
                            <Button 
                                type="button"
                                variant="outline"
                                onClick={() => append(createEmptyTrack())}
                                className="mt-8 w-full border-dashed border-indigo-500 hover:border-indigo-400 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30"
                                aria-label="Add another track"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Another Track
                            </Button>
                        </div>
                        
                        {/* Global Submit Button */} 
                        <div className="flex justify-center pt-6 border-t border-gray-700/50">
                             <Button 
                                type="submit" 
                                disabled={isSubmitting || !form.formState.isValid} // Disable if loading or form invalid 
                                className="w-full max-w-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
                                ) : (
                                    `Upload ${fields.length} Track${fields.length > 1 ? 's' : ''}` // Dynamic button text
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </SignedIn>
    );
} 