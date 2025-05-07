'use client';

import React, { useState, useCallback, useEffect, DragEvent } from 'react';
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
import { Trash2, PlusCircle, UploadCloud, Loader2, Image as ImageIcon, FileAudio, X, CheckCircle } from 'lucide-react';
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

// --- Constants ---
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/x-wav"]; // Example audio types
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB (Adjusted)

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
    // Add other fields from your License model if needed (e.g., description, limits)
    // filesIncluded: z.array(z.string()).optional().default([]), // Use string array if avoiding enum
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
  coverImage: fileListSchemaForInput("Cover image is required."),
  mainTrack: fileListSchemaForInput("Main track file is required."),

  // --- Licenses ---
  price: z.preprocess(
    (val) => (val === '' ? null : Number(val)), // Convert empty string to null
    z.number({ invalid_type_error: "Price must be a number" })
     .min(0, "Price must be non-negative.")
     .nullable() // Allow null
     .optional(),
  ),
  // licenses: z.array(licenseInputSchema).min(1, "At least one license is required."), // For multiple licenses
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
  const [mainTrackName, setMainTrackName] = useState<string | null>(null);
  // --- State for Drag & Drop ---
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [isDraggingMainTrack, setIsDraggingMainTrack] = useState(false);

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
    },
  });

  const { control, handleSubmit, register, reset, watch, setValue, trigger } = form;

  // Watch file fields to update previews
  const watchedCoverImage = watch("coverImage");
  const watchedMainTrack = watch("mainTrack");

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
      if (watchedMainTrack && watchedMainTrack.length > 0) {
          setMainTrackName(watchedMainTrack[0].name);
      } else {
          setMainTrackName(null);
      }
  }, [watchedMainTrack]);

  // --- Drag & Drop Handlers ---
  const handleDragEnter = (e: DragEvent<HTMLDivElement>, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    e.preventDefault();
    e.stopPropagation();
    setter(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    e.preventDefault();
    e.stopPropagation();
    setter(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Necessary to allow drop
  };

  const handleFileDrop = (
    e: DragEvent<HTMLDivElement>,
    fieldName: keyof TrackUploadFormValues,
    acceptedTypes: string[],
    maxSize: number,
    typeLabel: string,
    setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length === 1) {
      const file = files[0];
      // Validate type
      if (!acceptedTypes.includes(file.type)) {
        toast.error(`Invalid ${typeLabel} type. Accepted: ${acceptedTypes.join(', ')}`);
        return;
      }
      // Validate size
      if (file.size > maxSize) {
        toast.error(`Max ${typeLabel} size is ${maxSize / 1024 / 1024}MB.`);
        return;
      }
      // Update form value with the FileList
      setValue(fieldName, files as any, { shouldValidate: true });
      trigger(fieldName); // Trigger validation specifically for the field
      toast.success(`${typeLabel} selected: ${file.name}`);
    } else if (files && files.length > 1) {
      toast.error(`Please drop only one ${typeLabel} file.`);
    } else {
      toast.error(`Failed to get dropped ${typeLabel} file.`);
    }
  };

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
    setIsSubmitting(true);
    setUploadProgress({ preview: 0, cover: 0 }); // Reset progress

    // --- Extract Files ---
    const coverFile = data.coverImage[0];
    const mainTrackFile = data.mainTrack[0];

    let prepareResult;
    try {
      // --- 1. Prepare Upload ---
      const preparePayload = {
          title: data.title || mainTrackFile.name.replace(/\.[^/.]+$/, ""),
          description: data.description || null,
          bpm: data.bpm,
          key: data.key || null,
          tags: data.tags || null,
          price: data.price,
          contentType: data.contentType,
          _previewFileName: mainTrackFile.name,
          _coverFileName: coverFile.name,
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
          uploadFileToSignedUrl(previewUploadUrl, mainTrackFile, (p) => {
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
      setMainTrackName(null);

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


  // --- JSX ---
  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit, onValidationError)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload Track</CardTitle>
            <CardDescription>Fill in the details for your new track.</CardDescription>
          </CardHeader>
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
                          <SelectContent>
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
                        {/* Keep type="number" for semantics, but handle value as string */}
                        <Input type="number" placeholder="e.g., 140" {...field} onChange={e => field.onChange(e.target.value)} value={field.value ?? ''} />
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
                      <FormControl>
                        <Input placeholder="e.g., Cmin" {...field} />
                      </FormControl>
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
                        "border border-dashed rounded-md p-4 text-center transition-colors",
                        isDraggingCover ? "border-primary bg-primary/10" : "border-muted-foreground/50 hover:border-primary/50"
                      )}
                      onDragEnter={(e) => handleDragEnter(e, setIsDraggingCover)}
                      onDragLeave={(e) => handleDragLeave(e, setIsDraggingCover)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleFileDrop(e, 'coverImage', ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE, 'image', setIsDraggingCover)}
                    >
                       <FormControl>
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-24 h-24 border border-dashed rounded-md flex items-center justify-center bg-muted/50 relative overflow-hidden shrink-0">
                            {coverPreview ? (
                              <Image src={coverPreview} alt="Cover preview" layout="fill" objectFit="cover" />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-muted-foreground" />
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
                                 if (!file) return; // No file selected
                                 // Client-side size check
                                 if (file.size > MAX_IMAGE_SIZE) {
                                   toast.error('Image too large', { description: `Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB.` });
                                   e.target.value = ''; // Clear the input
                                   setCoverPreview(null); // Clear preview
                                   setValue('coverImage', undefined, { shouldValidate: true }); // Reset RHF value
                                   return;
                                 }
                                 onChange(e.target.files); // Pass FileList to RHF
                                 trigger("coverImage"); // Manually trigger validation
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

               {/* Main Track Input with Drag & Drop */}
               <FormField
                 control={control}
                 name="mainTrack"
                 render={({ field: { onChange, onBlur, name, ref } }) => (
                   <FormItem>
                     <FormLabel>Main Track File</FormLabel>
                      {/* Add Drag & Drop Handlers and Styling to this container */}
                     <div
                       className={cn(
                         "border border-dashed rounded-md p-4 text-center transition-colors",
                         isDraggingMainTrack ? "border-primary bg-primary/10" : "border-muted-foreground/50 hover:border-primary/50"
                       )}
                       onDragEnter={(e) => handleDragEnter(e, setIsDraggingMainTrack)}
                       onDragLeave={(e) => handleDragLeave(e, setIsDraggingMainTrack)}
                       onDragOver={handleDragOver}
                       onDrop={(e) => handleFileDrop(e, 'mainTrack', ACCEPTED_AUDIO_TYPES, MAX_AUDIO_SIZE, 'audio', setIsDraggingMainTrack)}
                     >
                       <FormControl>
                          <div className="flex flex-col items-center gap-2">
                            <UploadCloud className={cn("w-10 h-10 mb-2", mainTrackName ? "text-green-500" : "text-muted-foreground")} />
                            <Label htmlFor="mainTrack-input" className="cursor-pointer text-primary underline-offset-4 hover:underline">
                              {mainTrackName ? "Change Main Track" : "Select Main Track File"}
                            </Label>
                            <span className="text-xs text-muted-foreground">or drag & drop here</span>
                            <Input
                              id="mainTrack-input" // Ensure ID is unique
                              type="file"
                              accept={ACCEPTED_AUDIO_TYPES.join(',')}
                              className="sr-only" // Hide the default input visually
                              ref={ref}
                              name={name}
                              onBlur={onBlur}
                              onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return; // No file selected
                                  // Client-side size check
                                  if (file.size > MAX_AUDIO_SIZE) {
                                    toast.error('Audio file too large', { description: `Maximum size is ${MAX_AUDIO_SIZE / 1024 / 1024}MB.` });
                                    e.target.value = ''; // Clear the input
                                    setMainTrackName(null); // Clear name display
                                    setValue('mainTrack', undefined, { shouldValidate: true }); // Reset RHF value
                                    return;
                                  }
                                  onChange(e.target.files); // Pass FileList to RHF
                                  trigger("mainTrack"); // Manually trigger validation
                              }}
                           />
                         </div>
                       </FormControl>
                       </div>
                      {mainTrackName && (
                       <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
                         <FileAudio className="w-4 h-4" />
                         <span>{mainTrackName}</span>
                         {isSubmitting && uploadProgress.preview === 100 && <CheckCircle className="w-4 h-4 text-green-500" />}
                         {isSubmitting && uploadProgress.preview < 100 && <Loader2 className="w-4 h-4 animate-spin" />}
                       </div>
                     )}
                     <FormMessage className="mt-2" />
                     {/* Main Track Upload Progress */}
                     {isSubmitting && uploadProgress.preview > 0 && (
                         <div className="mt-2">
                             <Progress value={uploadProgress.preview} className="w-full h-2" />
                            <p className="text-xs text-muted-foreground text-right">{uploadProgress.preview}%</p>
                         </div>
                     )}
                   </FormItem>
                 )}
               />

            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Submitting...' : 'Submit Track'}
          </Button>
        </div>
      </form>
    </Form>
  );
} 