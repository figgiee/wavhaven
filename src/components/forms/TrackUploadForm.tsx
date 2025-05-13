'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from 'sonner';
import type { ContentType as ContentTypeEnum, TrackFileType } from '@prisma/client';
import { Trash2, PlusCircle, UploadCloud, Loader2, Image as ImageIcon, FileAudio, X, CheckCircle, Music } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { prepareSingleTrackUpload, finalizeSingleTrackUpload, cleanupFailedUpload } from '@/server-actions/singleTrackUploadActions';
import { Progress } from '@/components/ui/progress';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from '@/lib/utils';
import { useFileDrop } from '@/hooks/useFileDrop';

// --- Constants ---
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/mp4'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

// This list should match the one in your TrackPage/FilterSidebar if you want consistency
const availableKeys = ['Cmaj', 'Cmin', 'Gmaj', 'Gmin', 'Dmaj', 'Dmin', 'Amaj', 'Amin', 'Emaj', 'Emin', 'Bmaj', 'Bmin', 'F#maj', 'F#min', 'C#maj', 'C#min', 'Fmaj', 'Fmin', 'Bbmaj', 'Bbmin', 'Ebmaj', 'Ebmin', 'Abmaj', 'Abmin'];

// --- Zod Schemas ---
const fileListSchemaForInput = (requiredMessage: string) =>
  z.any() // Allow FileList or undefined initially
    .refine(files => files instanceof FileList && files?.length === 1, requiredMessage);

// Schema for individual licenses (if dynamic licenses are needed later)
const licenseInputSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "License name is required.").max(100, "License name too long"),
    price: z.preprocess(
      (val) => (val === '' ? undefined : Number(val)),
      z.number({ invalid_type_error: "Price must be a number" }).min(0, "Price must be non-negative.")
    ),
    description: z.string().optional(),
});

// Main form schema - includes file validations
const trackUploadSchema = z.object({
  title: z.string().min(1, "Track title is required."),
  description: z.string().optional(),
  bpm: z.preprocess(
    (val) => (val === '' ? null : Number(val)), // Convert empty string to null
    z.number({ invalid_type_error: "BPM must be a number" })
     .int("BPM must be a whole number.")
     .positive("BPM must be positive.")
     .nullable() // Allow null
     .optional(),
  ),
  key: z.string().optional(),
  tags: z.string().optional(),
  genre: z.string().optional(), // Added genre field (optional string)
  contentType: z.enum(['BEATS', 'LOOPS', 'SOUNDKITS', 'PRESETS'], { required_error: "Content type is required." }),

  // --- Integrated File Fields ---
  // Cover image is optional; fallback to Music icon if none provided
  coverImage: z.any().optional(),
  audioFile: fileListSchemaForInput("Audio file is required."),

  // --- Licenses ---
  price: z.preprocess(
    (val) => (val === '' ? null : Number(val)), // Convert empty string to null
    z.number({ invalid_type_error: "Price must be a number" })
     .min(0, "Price must be non-negative.")
     .nullable() // Allow null
     .optional(),
  ),
  licenses: z.array(licenseInputSchema).min(1, "At least one license tier is required."),
});

// Type for form values based on the schema
type TrackUploadFormValues = z.infer<typeof trackUploadSchema>;

// --- Component ---
export function TrackUploadForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ preview: number; cover: number }>({ preview: 0, cover: 0 });
  // State for file previews
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2; // Define total steps

  const form = useForm<TrackUploadFormValues>({
    resolver: zodResolver(trackUploadSchema),
    defaultValues: {
      title: "",
      description: "",
      bpm: '' as any, // Use empty string as default for controlled input
      key: "",
      tags: "",
      genre: "", // Added default value for genre
      contentType: 'BEATS',
      price: '' as any, // Use empty string as default
      licenses: [{ name: 'Basic Lease', price: 29.99, description: 'Standard MP3 lease.' }], // Default basic license
    },
  });

  const { control, handleSubmit, register, reset, watch, setValue, trigger, fields, append, remove } = form;

  // Centralized file drop logic
  const coverDrop = useFileDrop({
    fieldName: 'coverImage',
    acceptedTypes: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_IMAGE_SIZE,
    typeLabel: 'image',
    setValue,
    trigger,
  });
  const audioFileDrop = useFileDrop({
    fieldName: 'audioFile',
    acceptedTypes: ACCEPTED_AUDIO_TYPES,
    maxSize: MAX_AUDIO_SIZE,
    typeLabel: 'Audio File',
    setValue,
    trigger,
  });

  // Watch file fields to update previews
  const watchedCoverImage = watch("coverImage");
  const watchedAudioFile = watch("audioFile");

  useEffect(() => {
    if (watchedCoverImage && watchedCoverImage.length > 0) {
      const file = watchedCoverImage[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(null);
    }
  }, [watchedCoverImage]);

  useEffect(() => {
    if (watchedAudioFile && watchedAudioFile.length > 0) {
      setAudioFileName(watchedAudioFile[0].name);
    } else {
      setAudioFileName(null);
    }
  }, [watchedAudioFile]);

  // --- Helper: Upload to Signed URL ---
  const uploadFileToSignedUrl = useCallback(async (signedUrl: string, file: File, onProgress: (progress: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl);

      // Set content type based on the file - IMPORTANT for Supabase
      xhr.setRequestHeader('Content-Type', file.type);
      // xhr.setRequestHeader('x-upsert', 'true'); // Optional: if you want to overwrite

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100); // Ensure it hits 100%
          resolve();
        } else if (xhr.status === 413) {
          // Specific handling for Payload Too Large
          console.error('Upload failed: Payload too large (413)', xhr.responseText);
          reject(new Error('File size exceeds the server upload limit.')); // Reject with user-friendly message
        } else {
          // General HTTP error handling
          console.error('Upload failed:', xhr.status, xhr.responseText);
          // Attempt to parse responseText for a more specific server message
          let serverError = `HTTP error ${xhr.status}`; // Default error
          try {
            const responseJson = JSON.parse(xhr.responseText);
            serverError = responseJson.message || responseJson.error || serverError;
          } catch (e) { /* Ignore parsing errors */ }
          toast.error('Upload Failed', { description: serverError }); 
          reject(new Error(`Upload failed: ${serverError} (${xhr.status})`));
        }
      };

      xhr.onerror = () => {
        console.error('Upload failed (network error)');
        reject(new Error('Upload failed due to network error.'));
      };

      xhr.send(file);
    });
  }, []);

  // --- Main Submit Handler ---
  const onSubmit = async (data: TrackUploadFormValues) => {
    // If not the last step, go to the next step
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      return; // Don't submit yet
    }

    setIsSubmitting(true);
    setUploadProgress({ preview: 0, cover: 0 }); // Reset progress

    // --- Extract Files ---
    const coverFile = data.coverImage[0];
    const audioFile = data.audioFile[0];

    let prepareResult;
    try {
      // --- 1. Prepare Upload ---
      const preparePayload = {
          title: data.title || audioFile.name.replace(/\.[^/.]+$/, ""),
          description: data.description || null,
          bpm: data.bpm,
          key: data.key || null,
          tags: data.tags || null,
          price: data.price,
          contentType: data.contentType,
          _previewFileName: audioFile.name,
          _coverFileName: coverFile?.name,
      };
      console.log("Calling prepareSingleTrackUpload with data:", preparePayload);

      prepareResult = await prepareSingleTrackUpload(preparePayload);

      // Check the structure of prepareResult returned by the server action
      if (!prepareResult || prepareResult.error || !prepareResult.preparations) {
        console.error("Prepare Error Details:", prepareResult?.errorDetails);
        throw new Error(prepareResult?.error || "Failed to prepare upload. Invalid response from server.");
      }

      console.log("Prepare result:", prepareResult);
      const { trackId, previewUploadUrl, coverUploadUrl, previewStoragePath, coverStoragePath } = prepareResult.preparations;


      // --- 2. Upload Files Directly ---
      const uploadPromises = [];
      const fileStatuses: Record<string, boolean> = { preview: false, cover: false };

      if (previewUploadUrl) {
        console.log("Uploading preview/main track to:", previewUploadUrl);
        uploadPromises.push(
          uploadFileToSignedUrl(previewUploadUrl, audioFile, (p) => {
            setUploadProgress(prev => ({ ...prev, preview: p }));
          }).then(() => { fileStatuses.preview = true; })
        );
      } else {
          throw new Error("Missing preview upload URL.");
      }

      if (coverUploadUrl) {
        console.log("Uploading cover image to:", coverUploadUrl);
        uploadPromises.push(
          uploadFileToSignedUrl(coverUploadUrl, coverFile, (p) => {
            setUploadProgress(prev => ({ ...prev, cover: p }));
          }).then(() => { fileStatuses.cover = true; })
        );
      } else {
          throw new Error("Missing cover image upload URL.");
      }

      await Promise.all(uploadPromises);
      console.log("Direct uploads completed.");

      // --- 3. Finalize Upload ---
      const finalizePayload = {
          trackId: trackId,
          previewUploaded: fileStatuses.preview,
          coverUploaded: fileStatuses.cover,
          previewStoragePath: previewStoragePath,
          coverStoragePath: coverStoragePath,
          duration: 0, // TODO: Get actual duration if possible client-side or server-side
          bpm: data.bpm,
          key: data.key,
          tags: data.tags,
          genre: data.genre, // genre is not part of the form schema, might cause issues
      };
      console.log("Calling finalizeSingleTrackUpload with:", finalizePayload);
      const { success: finalizeSuccess, error: finalizeError } = await finalizeSingleTrackUpload(finalizePayload);

      if (!finalizeSuccess) {
        throw new Error(finalizeError || "Failed to finalize upload.");
      }

      // --- Success ---
      toast.success('Track submitted successfully! Ready for additional files and publishing.');
      reset();
      setCoverPreview(null);
      setAudioFileName(null);

    } catch (error: any) {
      console.error("Upload process error:", error);
      
      // --- Cleanup Logic --- 
      // Check if prepareResult exists and has a trackId, indicating preparation was successful
      if (prepareResult?.preparations?.trackId) {
        const failedTrackId = prepareResult.preparations.trackId;
        console.log(`Upload failed after prepare. Attempting cleanup for track ID: ${failedTrackId}`);
        // Call the cleanup action asynchronously, but don't wait for it 
        // We still want to show the user the original error quickly.
        cleanupFailedUpload(failedTrackId)
          .then(cleanupResult => {
            if (!cleanupResult.success) {
              console.error(`Background cleanup failed for track ${failedTrackId}:`, cleanupResult.error);
              // Optionally notify monitoring service about cleanup failure
            }
          })
          .catch(cleanupError => {
             console.error(`Error calling background cleanup for track ${failedTrackId}:`, cleanupError);
             // Optionally notify monitoring service
          });
      }
      // --- End Cleanup Logic ---

      // Show toast with the original error message
      toast.error(`Upload failed: ${error.message || "An unexpected error occurred."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Error handler for Zod validation
  const onValidationError = (errors: any) => {
    console.error("React Hook Form Zod Validation Errors:", errors);
    toast.error("Please fix the errors in the form.");
  };

  // Function to go to the previous step
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // --- JSX ---
  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit, onValidationError)} className="space-y-8">
        <div className="flex justify-center mb-4">
          <p className="text-sm text-muted-foreground">Step {currentStep} of {totalSteps}</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Upload Track</CardTitle>
            <CardDescription>Fill in the details for your new track.</CardDescription>
          </CardHeader>
          {/* Step 1: Metadata & Cover Art */} 
          {currentStep === 1 && (
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Column 1: Metadata */}
              <div className="space-y-4">
                 <FormField
                      control={control}
                      name="contentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select content type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover text-popover-foreground">
                              {/* Use string literals for SelectItem values */}
                              <SelectItem value="BEATS">Beats</SelectItem>
                              <SelectItem value="LOOPS">Loops</SelectItem>
                              <SelectItem value="SOUNDKITS">Soundkits</SelectItem>
                              <SelectItem value="PRESETS">Presets</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                <FormField
                  control={control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Midnight Drive" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe your track..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name="bpm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>BPM</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 140"
                            type="number" 
                            {...field}
                            value={field.value === null || field.value === undefined ? '' : String(field.value)} // Handle null/undefined for controlled input
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                field.onChange(null); // Set to null if empty
                              } else {
                                const numValue = parseInt(value, 10);
                                field.onChange(isNaN(numValue) ? null : numValue); // Set to number or null if NaN
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Key</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a key" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover text-popover-foreground">
                            {availableKeys.map((k) => (
                              <SelectItem key={k} value={k}>
                                {k}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                 <FormField
                      control={control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags (Optional, comma-separated)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., dark, trap, ambient" {...field} />
                          </FormControl>
                          <FormDescription>
                            Help users find your track.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  {/* Simplified Price for Basic License */}
                  <FormField
                    control={control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Basic License Price ($)</FormLabel>
                        <FormControl>
                           {/* Keep type="number" for semantics, handle value as string */}
                           <Input type="number" step="0.01" placeholder="e.g., 29.99" {...field} onChange={e => field.onChange(e.target.value)} value={field.value ?? ''} />
                        </FormControl>
                         <FormDescription>
                           This sets the price for the default basic license.
                         </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                {/* ADDED Genre Field */}
                <FormField
                  control={control}
                  name="genre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Genre (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Trap, Lo-fi, House" {...field} />
                      </FormControl>
                      <FormDescription>
                        The main genre of the track.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              {/* Column 2: Files & Progress */}
              <div className="space-y-6">
                {/* Cover Image Input with Drag & Drop */}
                <FormField
                  control={control}
                  name="coverImage"
                  render={({ field: { onChange, onBlur, name, ref } }) => (
                    <FormItem>
                      <FormLabel>Cover Image</FormLabel>
                       {/* Add Drag & Drop Handlers and Styling to this container */}
                      <div
                        className={cn(
                          "relative border border-dashed rounded-md p-4 text-center transition-colors",
                          coverDrop.isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/50 hover:border-primary/50"
                        )}
                        onDragEnter={coverDrop.handleDragEnter}
                        onDragLeave={coverDrop.handleDragLeave}
                        onDragOver={coverDrop.handleDragOver}
                        onDrop={coverDrop.handleDrop}
                      >
                         <FormControl>
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-24 h-24 border border-dashed rounded-md flex items-center justify-center bg-muted/50 relative overflow-hidden shrink-0">
                              {coverPreview ? (
                                <Image src={coverPreview} alt="Cover preview" layout="fill" objectFit="cover" />
                              ) : (
                                <Music className="w-8 h-8 text-muted-foreground" />
                              )}
                            </div>
                            <Label htmlFor="coverImage-input" className="cursor-pointer text-primary underline-offset-4 hover:underline">
                               {coverPreview ? "Change Cover Image" : "Select Cover Image"}
                            </Label>
                             <span className="text-xs text-muted-foreground">or drag & drop here</span>
                             <Input
                                id="coverImage-input" // Ensure ID is unique
                                type="file"
                                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                                className="sr-only" // Hide the default input visually
                                ref={ref} // RHF ref
                                name={name} // RHF name
                                onBlur={onBlur} // RHF blur handler
                                onChange={(e) => {
                                   const file = e.target.files?.[0];
                                   if (!file) return;
                                   if (file.size > MAX_IMAGE_SIZE) {
                                     toast.error('Image too large', { description: `Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB.` });
                                     e.target.value = '';
                                     setCoverPreview(null);
                                     setValue('coverImage', undefined, { shouldValidate: true });
                                     return;
                                   }
                                   onChange(e.target.files);
                                   trigger('coverImage');
                                }}
                              />
                           </div>
                        </FormControl>
                        </div>
                        <FormMessage className="mt-2" />
                       {/* Cover Upload Progress */}
                       {isSubmitting && uploadProgress.cover > 0 && (
                          <div className="mt-2">
                              <Progress value={uploadProgress.cover} className="w-full h-2" />
                              <p className="text-xs text-muted-foreground text-right">{uploadProgress.cover}%</p>
                          </div>
                     )}
                   </FormItem>
                 )}
               />

                 {/* Audio File Input moved here */}
                 <FormField
                   control={control}
                   name="audioFile"
                   render={({ field: { onChange, onBlur, name, ref } }) => (
                     <FormItem className="w-full">
                       <FormLabel>Audio File</FormLabel>
                        {/* Add Drag & Drop Handlers and Styling to this container */}
                       <div
                         className={cn(
                           "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-muted transition-colors",
                           audioFileDrop.isDragging && "border-primary bg-primary/10"
                         )}
                         onDragEnter={audioFileDrop.handleDragEnter}
                         onDragLeave={audioFileDrop.handleDragLeave}
                         onDragOver={audioFileDrop.handleDragOver}
                         onDrop={audioFileDrop.handleDrop}
                       >
                         <input
                           type="file"
                           className="hidden"
                           id="audioFile-upload"
                           accept={ACCEPTED_AUDIO_TYPES.join(',')}
                           onChange={(e) => {
                             const file = e.target.files ? e.target.files[0] : null;
                             if (file) {
                               if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
                                 toast.error(`Invalid audio file type. Accepted: ${ACCEPTED_AUDIO_TYPES.join(', ')}`);
                                 e.target.value = '';
                                 return;
                               }
                               if (file.size > MAX_AUDIO_SIZE) {
                                 toast.error(`Max audio file size is ${MAX_AUDIO_SIZE / 1024 / 1024}MB.`);
                                 e.target.value = '';
                                 return;
                               }
                               onChange(e.target.files);
                               toast.success(`Audio file selected: ${file.name}`);
                             } else {
                               onChange(null);
                             }
                           }}
                           {...ref}
                         />
                         <label htmlFor="audioFile-upload" className="absolute inset-0 cursor-pointer" />
                         {audioFileName ? (
                           <div className="text-center">
                             <FileAudio className="w-8 h-8 mx-auto mb-2 text-primary" />
                             <p className="mb-1 text-sm font-semibold">{audioFileName}</p>
                             <p className="text-xs text-muted-foreground">Click to change or drag & drop</p>
                           </div>
                         ) : (
                           <div className="text-center">
                             <UploadCloud className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                             <p className="mb-1 text-sm text-muted-foreground">Select Audio File</p>
                             <p className="text-xs text-muted-foreground">or drag & drop here</p>
                           </div>
                         )}
                       </div>
                       <FormDescription>
                         {audioFileName ? 
                           `Selected: ${audioFileName}` :
                           "The primary audio file for your track (e.g., MP3, WAV)."
                         }
                       </FormDescription>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

              </div>
            </CardContent>
          )}

          {/* Step 2: Audio & Licensing */} 
          {currentStep === 2 && (
            <CardContent className="space-y-6">
              <h3 className="text-lg font-medium">Audio File & Licensing</h3>
              <p className="text-muted-foreground">Placeholder for audio file upload and dynamic licensing tiers.</p>
              {/* TODO: Add actual form fields for Step 2 here */} 

              {/* Dynamic Licensing Tiers Section */}
              <div className="mt-6 pt-6 border-t space-y-4">
                 <h3 className="text-lg font-medium mb-2">Licensing Tiers</h3>
                 {fields.map((field, index) => (
                   <Card key={field.id} className="p-4 border border-dashed relative">
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <FormField
                         control={control}
                         name={`licenses.${index}.name`}
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>License Name</FormLabel>
                             <FormControl>
                               <Input placeholder="e.g., Premium Lease" {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                        <FormField
                         control={control}
                         name={`licenses.${index}.price`}
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Price ($)</FormLabel>
                             <FormControl>
                               <Input type="number" step="0.01" placeholder="e.g., 49.99" {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                       {/* Placeholder for other license details like description/terms */}
                       <FormField
                         control={control}
                         name={`licenses.${index}.description`}
                         render={({ field }) => (
                            <FormItem className="sm:col-span-3">
                               <FormLabel>Description (Optional)</FormLabel>
                               <FormControl>
                                 <Textarea placeholder="Briefly describe what this license includes..." {...field} />
                               </FormControl>
                               <FormMessage />
                            </FormItem>
                         )}
                       />
                     </div>
                     {fields.length > 1 && (
                        <Button
                         type="button"
                         variant="ghost"
                         size="icon"
                         onClick={() => remove(index)}
                         className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
                         aria-label="Remove license tier"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     )}
                   </Card>
                 ))}
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={() => append({ name: '', price: '' as any, description: '' })} // Append new empty license
                   className="mt-2"
                 >
                   <PlusCircle className="mr-2 h-4 w-4" />
                   Add License Tier
                 </Button>
               </div>

            </CardContent>
          )}
        </Card>

        <div className="flex justify-between mt-8">
          {/* Previous Button */} 
          {currentStep > 1 && (
            <Button type="button" variant="outline" onClick={handlePreviousStep}>
              Previous
            </Button>
          )}

          {/* Spacer to push Next/Submit button to the right */} 
          {currentStep <= 1 && <div />} 

          {/* Next / Submit Button */} 
          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="transform-gpu transition-transform duration-200 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] hover:scale-105 active:scale-95 focus-visible:ring-4 focus-visible:ring-offset-2 disabled:shadow-none disabled:opacity-60 font-semibold"
          >
            {currentStep < totalSteps ? 'Next Step' : (isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Submit Track')}
          </Button>
        </div>
      </form>
    </Form>
  );
} 