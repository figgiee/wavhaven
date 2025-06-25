'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropzone } from '@/components/ui/dropzone';
import { FileUp, Trash2, Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TrackForEdit } from '@/types';
import { updateTrackDetails } from '@/server-actions/tracks/trackMutations';
import { TrackFileType } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Link } from "@/components/ui/link";
import { Progress } from "@/components/ui/progress";

interface EditTrackFormProps {
  track: TrackForEdit;
}

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().max(1000).optional(),
  bpm: z.coerce.number().int().positive("BPM must be a positive integer").nullable(),
  key: z.string().max(50, "Key is too long").optional(),
  tags: z.string().max(200, "Tags string is too long").optional(),
  licenseId: z.string().uuid().optional(),
  licenseName: z.string().min(1, "License name cannot be empty").max(100),
  licensePrice: z.coerce.number().min(0, "Price must be non-negative"),
  licenseDescription: z.string().max(500).optional(),
  licenseFilesIncluded: z.array(z.nativeEnum(TrackFileType)).default([]),
  licenseStreamLimit: z.coerce.number().int().nonnegative().nullable(),
  licenseDistributionLimit: z.coerce.number().int().nonnegative().nullable(),
  licenseRadioStations: z.coerce.number().int().nonnegative().nullable(),
  licenseMusicVideos: z.coerce.number().int().nonnegative().nullable(),
  licenseContractText: z.string().optional(),
  audioFile: z.instanceof(File).optional(),
});

type EditTrackFormValues = z.infer<typeof formSchema>;

export default function EditTrackForm({ track }: EditTrackFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState<Record<TrackFileType, boolean>>({});
  const [fileUploadProgress, setFileUploadProgress] = useState<Record<string, number>>({});
  const router = useRouter();

  const firstLicense = track.licenses?.[0];

  const form = useForm<EditTrackFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: track.title,
      description: track.description ?? '',
      bpm: track.bpm,
      key: track.key ?? '',
      tags: track.tags.map(tag => tag.name).join(', ') ?? '',
      licenseId: firstLicense?.id,
      licenseName: firstLicense?.name ?? 'Basic License',
      licensePrice: firstLicense ? Number(firstLicense.price) : 0,
      licenseDescription: firstLicense?.description ?? '',
      licenseFilesIncluded: firstLicense?.filesIncluded ?? [TrackFileType.MAIN_MP3],
      licenseStreamLimit: firstLicense?.streamLimit,
      licenseDistributionLimit: firstLicense?.distributionLimit,
      licenseRadioStations: firstLicense?.radioStations,
      licenseMusicVideos: firstLicense?.musicVideos,
      licenseContractText: firstLicense?.contractText ?? '',
    },
  });

  async function onSubmit(values: EditTrackFormValues) {
    setIsLoading(true);
    setError(null);
    const toastId = toast.loading('Saving changes...');

    try {
      const result = await updateTrackDetails(track.id, { ...values, publish: false });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update track details');
      }
      
      toast.success('Track details saved successfully!', { id: toastId });
      router.refresh();
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      toast.error('Update failed', { id: toastId, description: message });
    } finally {
      setIsLoading(false);
    }
  }

  const handlePublish = async () => {
    setIsLoading(true);
    setError(null);
    const toastId = toast.loading('Publishing track...');
    
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error('Validation Failed', { id: toastId, description: 'Please fix errors before publishing.' });
      setIsLoading(false);
      return;
    }
    
    const currentValues = form.getValues();

    try {
      const result = await updateTrackDetails(track.id, { ...currentValues, publish: true });
      if (!result.success) {
        throw new Error(result.error || 'Failed to publish track.');
      }
      toast.success('Track published successfully!', { id: toastId });
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Publishing failed.";
      toast.error('Publish Failed', { id: toastId, description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFileToSignedUrl = async (signedUrl: string, file: File, storagePath: string, onProgress: (path: string, progress: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(storagePath, percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(storagePath, 100);
          resolve();
        } else {
          console.error(`Upload failed for ${file.name} (${storagePath}):`, xhr.status, xhr.responseText);
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText || 'Network error'}`));
        }
      };

      xhr.onerror = () => {
         console.error(`Upload failed for ${file.name} (${storagePath}) (Network Error)`);
         reject(new Error('Network error during upload.'));
      };

      xhr.send(file);
    });
  };

  const handleFileUpload = async (fileType: TrackFileType, files: File[]) => {
    if (!files || files.length === 0) return;
    const file = files[0]; 
    
    const operationId = `file-upload-${fileType}-${Date.now()}`;
    setIsUploadingFile(prev => ({ ...prev, [fileType]: true }));
    setFileUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
    toast.loading(`Preparing upload for ${fileType}...`, { id: operationId });

    try {
      const prepareResult = await prepareTrackFileUpload(track.id, fileType, file.name);
      if (prepareResult.error || !prepareResult.result) {
        throw new Error(prepareResult.error || 'Failed to prepare file upload.');
      }
      const { uploadUrl, storagePath } = prepareResult.result;

      toast.loading(`Uploading ${fileType}...`, { id: operationId });

      setFileUploadProgress(prev => {
          const { [file.name]: _, ...rest } = prev;
          return { ...rest, [storagePath]: 0 };
      });

      await uploadFileToSignedUrl(uploadUrl, file, storagePath, (path, progress) => {
          setFileUploadProgress(prev => ({ ...prev, [path]: progress }));
      });

      toast.loading(`Finalizing ${fileType}...`, { id: operationId });

      const finalizeResult = await finalizeTrackFileUpload({ 
          trackId: track.id, 
          fileType, 
          storagePath 
      });
      if (!finalizeResult.success) {
          throw new Error(finalizeResult.error || 'Failed to finalize file upload.');
      }

      toast.success(`${fileType} uploaded successfully!`, { id: operationId });
      router.refresh();

    } catch (err: unknown) {
         const message = err instanceof Error ? err.message : "File upload failed.";
         toast.error('Upload Failed', { id: operationId, description: message });
    } finally {
         setIsUploadingFile(prev => ({ ...prev, [fileType]: false }));
    }
  };

  const handleFileDelete = async (fileType: TrackFileType, storagePath: string) => {
       if (!window.confirm(`Are you sure you want to delete the ${fileType.replace('_',' ')} file? This cannot be undone.`)) {
           return;
       }
       
       const operationId = `file-delete-${fileType}-${Date.now()}`;
       toast.loading(`Deleting ${fileType}...`, { id: operationId });

       try {
           const result = await deleteTrackFile(track.id, fileType, storagePath);
           if (!result.success) {
               throw new Error(result.error || 'Failed to delete file.');
           }
           toast.success(`${fileType} deleted successfully!`, { id: operationId });
           router.refresh();
       } catch (err: unknown) {
           const message = err instanceof Error ? err.message : "File deletion failed.";
           toast.error('Deletion Failed', { id: operationId, description: message });
       }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <h2 className="text-xl font-semibold border-b pb-2">Track Details</h2>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Track Title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe your track..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="bpm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>BPM</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 120" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Key</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., C Minor" {...field} value={field.value ?? ''}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input placeholder="e.g., hip hop, trap, dark, ambient" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                Comma-separated list of relevant tags.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <h2 className="text-xl font-semibold border-b pb-2 mt-8">License Details</h2>
        <Accordion type="single" collapsible defaultValue="license-item-0" className="w-full">
          {firstLicense && (
            <AccordionItem value={`license-item-${firstLicense.id}`}>
              <AccordionTrigger>{form.watch("licenseName") || 'License'}</AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="licenseId"
                  render={({ field }) => <input type="hidden" {...field} />}
                />
                <FormField
                  control={form.control}
                  name="licenseName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Basic Lease, Unlimited" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="licensePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 29.99" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="licenseFilesIncluded"
                  render={() => (
                    <FormItem>
                      <FormLabel>Files Included</FormLabel>
                      <FormDescription>
                        Select the file types included with this license.
                      </FormDescription>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        {Object.values(TrackFileType).map((fileType) => (
                          fileType !== TrackFileType.PREVIEW_MP3 && (
                            <FormField
                              key={fileType}
                              control={form.control}
                              name="licenseFilesIncluded"
                              render={({ field }) => {
                                return (
                                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(fileType)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, fileType])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== fileType
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {fileType.replace(/_/g, ' ')} 
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          )
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="licenseStreamLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stream Limit</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 50000" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="licenseDistributionLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distribution Limit</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 2000" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="licenseRadioStations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Radio Stations</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 2" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="licenseMusicVideos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Music Videos</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 1" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="licenseDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Description (Short)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Briefly describe license terms..." {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="licenseContractText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Contract Text (Optional)</FormLabel>
                      <FormControl>
                        <Textarea rows={10} placeholder="Paste the full legal contract text here..." {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        <h2 className="text-xl font-semibold border-b pb-2 mt-8">File Management</h2>
        <div className="space-y-6">
          {[TrackFileType.MAIN_MP3, TrackFileType.MAIN_WAV, TrackFileType.STEMS]
            .filter(ft => !!ft)
            .map((fileType, index) => {
            // console.log(`Rendering file section ${index}: fileType =`, fileType);
            // if (!fileType) {
            //     console.error(`File type at index ${index} is undefined/null! Skipping render.`);
            //     return null;
            // }
            
            const existingFile = track.trackFiles.find(f => f.fileType === fileType);
            const isCurrentlyUploading = isUploadingFile[fileType];
            const progress = fileUploadProgress[existingFile?.storagePath || 'placeholder'] || fileUploadProgress[Object.keys(fileUploadProgress).find(k => k.includes(fileType)) || ''] || 0;

            return (
              <div key={fileType} className="p-4 border rounded-md bg-card">
                <Label className="text-base font-semibold block mb-2">{fileType.replace('_', ' ')}</Label>
                {existingFile ? (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{existingFile.storagePath.split('/').pop()}</span> 
                    <Button 
                      type="button" 
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleFileDelete(fileType, existingFile.storagePath)}
                      disabled={isCurrentlyUploading}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ) : (
                  <Dropzone
                    options={{
                      accept: fileType === TrackFileType.MAIN_MP3 ? { 'audio/mpeg': ['.mp3'] } :
                              fileType === TrackFileType.MAIN_WAV ? { 'audio/wav': ['.wav'] } :
                              fileType === TrackFileType.STEMS ? { 'application/zip': ['.zip'] } : {},
                      multiple: fileType === TrackFileType.STEMS,
                      maxSize: 100 * 1024 * 1024,
                      disabled: isCurrentlyUploading,
                    }}
                    onDrop={(acceptedFiles, rejectedFiles) => {
                      if (rejectedFiles.length > 0) {
                        toast.error('File Rejected', { description: `Could be size, type, or other issue. Please check requirements for ${fileType}.` });
                      }
                      if (acceptedFiles.length > 0) {
                        handleFileUpload(fileType, acceptedFiles)
                      }
                    }}
                    className={cn(
                      "border-dashed border-muted-foreground/50 hover:border-primary transition-colors py-6",
                      isCurrentlyUploading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="text-center">
                      {isCurrentlyUploading ? (
                        <>
                          <Loader2 className="mx-auto h-6 w-6 text-muted-foreground animate-spin" />
                          <p className="mt-1 text-sm text-muted-foreground">Uploading ({progress}%)</p>
                        </>
                      ) : (
                        <>
                          <FileUp className="mx-auto h-6 w-6 text-muted-foreground" />
                          <p className="mt-1 text-sm text-muted-foreground">
                            Upload {fileType === TrackFileType.STEMS ? 'ZIP' : fileType.split('_')[1]}
                          </p>
                        </>
                      )}
                    </div>
                  </Dropzone>
                )}
              </div>
            );
          })}
        </div>

        <FormField
          control={form.control}
          name="audioFile"
          render={({ field }) => (
            <FormItem className="bg-neutral-800/50 p-6 rounded-lg border border-neutral-700/70">
              <FormLabel className="text-lg font-semibold text-neutral-100">Track Audio File</FormLabel>
              <FormDescription className="text-neutral-400">
                Upload the main audio file for your track (WAV, MP3, etc.). This will be the file delivered to customers.
              </FormDescription>
              <FormControl>
                <Input 
                  type="file" 
                  onChange={handleFileChange(field.onChange, 'audioFile')} 
                  className="file:text-cyan-glow file:bg-cyan-glow/10 hover:file:bg-cyan-glow/20 file:border-none file:px-3 file:py-1.5 file:rounded-md file:text-xs file:font-semibold cursor-pointer"
                  accept=".mp3,.wav,.aac,.flac,.ogg"
                />
              </FormControl>
              {uploadProgress.audioFile > 0 && uploadProgress.audioFile < 100 && (
                <Progress value={uploadProgress.audioFile} className="w-full h-2 mt-2 bg-neutral-700 [&>div]:bg-cyan-glow" />
              )}
              {track?.audioFileUrl && !form.getValues("audioFile") && (
                 <div className="mt-2 text-xs text-neutral-400">Current: <Link href={track.audioFileUrl} target="_blank" className="text-cyan-glow hover:underline">{track.audioFileName || 'audio_file'}</Link></div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {error && <p className="text-sm font-medium text-destructive mt-6">{error}</p>}

        <div className="flex justify-end gap-4 pt-6 border-t border-[hsl(var(--border))]">
          {track && !track.isPublished && (
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handlePublish} 
              disabled={isLoading}
            >
              {isLoading ? 'Publishing...' : 'Publish Track'}
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
} 