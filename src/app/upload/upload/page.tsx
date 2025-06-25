'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { useForm, useFieldArray, UseFormReturn, ControllerRenderProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UploadCloud, Image as ImageIcon, Loader2, Tag, KeyRound, Gauge, Plus, Trash2, XCircle, CheckCircle, FileMusic, X, Check, AudioWaveform } from 'lucide-react';
import { SignedIn } from '@clerk/nextjs'; // Ensure only signed-in users see this
import { parseBlob } from 'music-metadata-browser'; // <-- Add this import
import { Badge } from '@/components/ui/badge'; // Add Badge import
import { toast } from "sonner"; // Added toast

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
                        className="cursor-pointer hover:bg-red-900/50 hover:text-red-300 transition-colors"
                        onClick={() => removeTag(tag)}
                        title={`Remove "${tag}"`}
                    >
                        {tag}
                        <X className="ml-1.5 h-3 w-3" />
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
                tracks: apiPayload.tracks.map(({ index, audioFile, coverImage, ...rest }) => ({
                    ...rest,
                    contentType: 'beats' as const, // Default to beats for bulk upload
                    price: 0 // Default price for bulk upload
                })) // Pass only track data with required fields
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

    // Defined helper function for status icons
    const getStatusIndicator = (status: UploadStatus) => {
        switch (status) {
            case 'uploading':
                return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'skipped':
                 return <span title="Skipped"><X className="h-4 w-4 text-gray-500" /></span>;
            case 'idle':
            default:
                return null; // No indicator for idle
        }
    };

    // --- Metadata Parsing Logic ---
    const parseAndSetMetadata = async (file: File | undefined, index: number) => {
        if (!file) {
             console.log(`No file provided for metadata parsing at index ${index}.`);
             toast.warning(`No audio file found for track #${index + 1} to parse metadata.`);
             return;
        }

        toast.info(`Parsing metadata for ${file.name}...`, { id: `parse-${index}` });
        try {
            console.log(`Parsing metadata for: ${file.name}`);
            const metadata = await parseBlob(file);
            console.log('Parsed Metadata:', metadata.common);

            let changesMade = false;
            const bpm = metadata.common.bpm;
            const key = metadata.common.key; // Note: may need format conversion

            if (bpm) {
                const bpmNum = Math.round(bpm);
                if (bpmNum >= 40 && bpmNum <= 300) { // Basic validation
                    // Only set if different from current value
                    if (form.getValues(`tracks.${index}.bpm`) !== bpmNum) {
                        console.log(`Setting BPM for track ${index}: ${bpmNum}`);
                        form.setValue(`tracks.${index}.bpm`, bpmNum, { shouldValidate: true });
                        changesMade = true;
                    }
                }
            }
            
            // Basic Key mapping (can be expanded)
            if (key) {
                 let formattedKey = key.replace(/m$/, 'min'); // G#m -> G#min
                if (!formattedKey.endsWith('min') && !formattedKey.endsWith('maj')) { // Avoid double 'majmaj'
                    formattedKey += 'maj'; // C -> Cmaj
                }
                if (availableKeys.includes(formattedKey)) {
                     // Only set if different from current value
                     if (form.getValues(`tracks.${index}.key`) !== formattedKey) {
                        console.log(`Setting Key for track ${index}: ${formattedKey}`);
                        form.setValue(`tracks.${index}.key`, formattedKey, { shouldValidate: true });
                        changesMade = true;
                    }
                } else {
                    console.warn(`Parsed key "${key}" (formatted: "${formattedKey}") not in availableKeys.`);
                }
            }

            if (changesMade) {
                 toast.success(`Metadata parsed for ${file.name}.`, { id: `parse-${index}` });
            } else {
                 toast.info(`No new metadata found or applied for ${file.name}.`, { id: `parse-${index}` });
            }

        } catch (error) {
            console.error(`Error parsing metadata for ${file.name}:`, error);
            toast.error(`Error parsing metadata for ${file.name}.`, { id: `parse-${index}` });
        }
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
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => remove(index)}
                                            className="absolute top-3 right-3 text-gray-500 hover:text-red-500 hover:bg-red-900/20 w-8 h-8"
                                            aria-label="Remove track"
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
                                            <div className="grid grid-cols-2 gap-4">
                                                 <FormField control={form.control} name={`tracks.${index}.bpm`} render={({ field }: { field: ControllerRenderProps<BulkUploadFormValues, `tracks.${number}.bpm`> }) => (
                                                    <FormItem className="col-span-1">
                                                        <FormLabel className="text-gray-300">BPM</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                                                <Input type="number" placeholder="BPM" {...field} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} value={field.value ?? ''} className="bg-gray-900/70 border-gray-700 focus:border-indigo-500 focus:ring-indigo-500 text-white pl-8" />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )}/>
                                                 <FormField control={form.control} name={`tracks.${index}.key`} render={({ field }: { field: ControllerRenderProps<BulkUploadFormValues, `tracks.${number}.key`> }) => (
                                                    <FormItem className="col-span-1">
                                                        <FormLabel className="text-gray-300">Key</FormLabel>
                                                         <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                                                             <FormControl>
                                                                 <SelectTrigger className="bg-gray-900/70 border-gray-700 text-white">
                                                                     <div className="flex items-center">
                                                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 mr-2"/>
                                                                        <SelectValue placeholder="Select key" className="pl-6"/>
                                                                    </div>
                                                                 </SelectTrigger>
                                                             </FormControl>
                                                             <SelectContent className="bg-gray-900 border-gray-700 text-white">
                                                                 {availableKeys.map(key => ( <SelectItem key={key} value={key} className="hover:bg-gray-800">{key}</SelectItem> ))}
                                                             </SelectContent>
                                                         </Select>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )}/>
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
                                                render={({ field: { onChange, onBlur, name, ref, disabled } }: { field: ControllerRenderProps<BulkUploadFormValues, `tracks.${number}.audioFile`> }) => {
                                                    // Get the temporary file name for display, if stored
                                                    const currentFileName = form.watch(`tracks.${index}._audioFileName`); 
                                                    // Make the handler async to await parsing
                                                    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                        const file = e.target.files?.[0];
                                                        onChange(file); // Update RHF state with the file object
                                                        // Use setValue to update the hidden field for display name
                                                        form.setValue(`tracks.${index}._audioFileName`, file?.name);

                                                        // --- Automatically parse metadata on file selection ---
                                                        if (file) {
                                                            await parseAndSetMetadata(file, index);
                                                        }
                                                        // --------------------------------
                                                    };
                                                    return (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center justify-between w-full text-gray-300">
                                                                <span>Audio File*</span>
                                                                 {/* --- Step 2.4: Add Audio Status Indicator --- */}
                                                                 <span className="ml-2">{getStatusIndicator(uploadStatuses[index]?.audio)}</span>
                                                            </FormLabel>
                                                            <FormControl>
                                                                <div className={cn(
                                                                    "relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-lg cursor-pointer bg-gray-900/50 transition-colors group",
                                                                    {
                                                                        "border-indigo-500": uploadStatuses[index]?.audio === 'uploading',
                                                                        "bg-indigo-900/30": uploadStatuses[index]?.audio === 'success',
                                                                        "hover:border-indigo-600": uploadStatuses[index]?.audio === 'idle',
                                                                        "hover:bg-indigo-800/30": uploadStatuses[index]?.audio === 'error',
                                                                    }
                                                                )}>
                                                                    <Input id={name} name={name} type="file" accept="audio/*" onChange={handleFileChange} onBlur={onBlur} ref={ref} disabled={disabled} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                                    <div className="text-center pointer-events-none">
                                                                        <UploadCloud className="mx-auto h-8 w-8 text-gray-500 group-hover:text-indigo-400 mb-2 transition-colors" />
                                                                        {currentFileName ? (
                                                                            <div className="flex items-center justify-between w-full text-sm text-gray-400">
                                                                                <span className="truncate mr-2">{currentFileName}</span>
                                                                                {/* Metadata Parsing - Updated onClick */}
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    // Get file from form state for manual trigger
                                                                                    onClick={() => parseAndSetMetadata(form.getValues(`tracks.${index}.audioFile`), index)}
                                                                                    disabled={!form.watch(`tracks.${index}.audioFile`)} // Disable if no file
                                                                                    className="text-indigo-400 hover:text-indigo-300 px-1 py-0.5 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                >
                                                                                    Parse Metadata
                                                                                </Button>
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Choose file or drag & drop</p>
                                                                        )}
                                                                        <p className="text-xs text-gray-500 mt-1">WAV, MP3, AIFF. Max 100MB.</p>
                                                                    </div>
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage className="text-red-400" />
                                                        </FormItem>
                                                    );
                                                }}
                                            />
                                             {/* Cover Image Input - Inlined */}
                                             <FormField
                                                 control={form.control}
                                                 name={`tracks.${index}.coverImage`}
                                                 render={({ field: { onChange, onBlur, name, ref, disabled } }: { field: ControllerRenderProps<BulkUploadFormValues, `tracks.${number}.coverImage`> }) => { 
                                                     const currentFileName = form.watch(`tracks.${index}._coverFileName`);
                                                     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                                                         const file = e.target.files?.[0];
                                                         onChange(file); 
                                                         form.setValue(`tracks.${index}._coverFileName`, file?.name);
                                                     };
                                                     return (
                                                         <FormItem>
                                                            <FormLabel className="flex items-center justify-between w-full text-gray-300">
                                                                <span>Cover Image</span>
                                                                 {/* --- Step 2.4: Add Cover Status Indicator --- */}
                                                                 <span className="ml-2">{getStatusIndicator(uploadStatuses[index]?.cover)}</span>
                                                            </FormLabel>
                                                            <FormControl>
                                                                <div className={cn(
                                                                    "relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-lg cursor-pointer bg-gray-900/50 transition-colors group",
                                                                    {
                                                                        "border-indigo-500": uploadStatuses[index]?.cover === 'uploading',
                                                                        "bg-indigo-900/30": uploadStatuses[index]?.cover === 'success',
                                                                        "hover:border-indigo-600": uploadStatuses[index]?.cover === 'idle',
                                                                        "hover:bg-indigo-800/30": uploadStatuses[index]?.cover === 'error',
                                                                    }
                                                                )}>
                                                                    <Input id={name} name={name} type="file" accept="image/*" onChange={handleFileChange} onBlur={onBlur} ref={ref} disabled={disabled} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                                    <div className="text-center pointer-events-none">
                                                                         <ImageIcon className="mx-auto h-8 w-8 text-gray-500 group-hover:text-indigo-400 mb-2 transition-colors" />
                                                                        {currentFileName ? (
                                                                            <div className="flex items-center justify-between w-full text-sm text-gray-400">
                                                                                <span className="truncate">{currentFileName}</span>
                                                                                  {/* Optionally add a remove button for the cover */}
                                                                                   <Button
                                                                                       type="button"
                                                                                       variant="ghost"
                                                                                       size="icon"
                                                                                       onClick={() => form.setValue(`tracks.${index}.coverImage`, undefined)}
                                                                                       className="text-red-500 hover:text-red-400 h-6 w-6 ml-2" // Adjusted size/margin
                                                                                    >
                                                                                        <XCircle className="h-4 w-4" />
                                                                                    </Button>
                                                                            </div>
                                                                        ) : (
                                                                             <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Choose file or drag & drop</p>
                                                                         )}
                                                                         <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP. Max 5MB.</p>
                                                                    </div>
                                                                </div>
                                                             </FormControl>
                                                            <FormMessage className="text-red-400" /> 
                                                         </FormItem>
                                                     );
                                                 }}
                                             />
                                        </div>
                                    </div>
                                </div> // End individual track item container
                            ))}
                        </div>

                        {/* Add Track Button */} 
                        <div className="flex justify-center pt-4">
                            <Button 
                                type="button"
                                variant="outline"
                                onClick={() => append(createEmptyTrack())}
                                className="border-gray-700 hover:bg-gray-800 hover:text-indigo-400"
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