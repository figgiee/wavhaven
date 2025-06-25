import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { prepareBulkUpload } from '@/server-actions/bulkUploadActions';
import { z } from 'zod';

// --- Types ---
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error' | 'skipped';
export type TrackStatus = { audio: UploadStatus; cover: UploadStatus };

interface UploadPreparationResult {
  trackId: string;
  _audioFileName: string;
  _coverFileName?: string;
  audioUploadUrl?: string;
  coverUploadUrl?: string;
}

// --- Form Schemas ---
const trackSchema = z.object({
  title: z.string().min(1, "Title is required"),
  audioFile: z.any(), // File input handled separately
  coverImage: z.any().optional(),
  bpm: z.number().min(60).max(200).optional(),
  key: z.string().optional(),
  tags: z.string().optional(),
});

const bulkUploadSchema = z.object({
  tracks: z.array(trackSchema).min(1, "At least one track is required"),
});

export type TrackFormValues = z.infer<typeof trackSchema>;
export type BulkUploadFormValues = z.infer<typeof bulkUploadSchema>;

// --- Helper Functions ---
const createEmptyTrack = (): TrackFormValues => ({
  title: '',
  audioFile: undefined,
  coverImage: undefined,
  bpm: undefined,
  key: undefined,
  tags: '',
});

async function uploadFileToSignedUrl(url: string, file: File, contentType: string): Promise<void> {
  const response = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': contentType,
      'Content-Length': file.size.toString(),
    },
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }
}

interface UseBulkUploaderReturn {
  // Form management
  form: ReturnType<typeof useForm<BulkUploadFormValues>>;
  fields: ReturnType<typeof useFieldArray>['fields'];
  append: ReturnType<typeof useFieldArray>['append'];
  remove: ReturnType<typeof useFieldArray>['remove'];
  
  // Upload state
  isSubmitting: boolean;
  uploadStatuses: TrackStatus[];
  selectedContentType: string;
  setSelectedContentType: (type: string) => void;
  
  // Upload functions
  onSubmit: (data: BulkUploadFormValues) => Promise<void>;
  updateUploadStatus: (index: number, type: 'audio' | 'cover', status: UploadStatus) => void;
  getStatusIndicator: (status: UploadStatus) => { icon: string; color: string; label: string };
  parseAndSetMetadata: (file: File | undefined, index: number) => Promise<void>;
}

export function useBulkUploader(): UseBulkUploaderReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatuses, setUploadStatuses] = useState<TrackStatus[]>([]);
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
    setUploadStatuses(prev => {
      const newStatuses = [...prev];
      while (newStatuses.length < fields.length) {
        newStatuses.push({ audio: 'idle', cover: 'idle' });
      }
      return newStatuses.slice(0, fields.length);
    });
  }, [fields.length]);

  const updateUploadStatus = useCallback((index: number, type: 'audio' | 'cover', status: UploadStatus) => {
    setUploadStatuses(prevStatuses => {
      const newStatuses = [...prevStatuses];
      if (newStatuses[index]) {
        newStatuses[index] = { ...newStatuses[index], [type]: status };
      }
      return newStatuses;
    });
  }, []);

  const getStatusIndicator = useCallback((status: UploadStatus) => {
    switch (status) {
      case 'idle':
        return { icon: '⚪', color: 'text-gray-400', label: 'Ready' };
      case 'uploading':
        return { icon: '🔄', color: 'text-blue-500', label: 'Uploading...' };
      case 'success':
        return { icon: '✅', color: 'text-green-500', label: 'Success' };
      case 'error':
        return { icon: '❌', color: 'text-red-500', label: 'Error' };
      case 'skipped':
        return { icon: '⏭️', color: 'text-yellow-500', label: 'Skipped' };
      default:
        return { icon: '⚪', color: 'text-gray-400', label: 'Unknown' };
    }
  }, []);

  const parseAndSetMetadata = useCallback(async (file: File | undefined, index: number) => {
    if (!file) {
      toast.error("No file selected for metadata parsing.");
      return;
    }

    try {
      // Extract filename without extension as title
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      form.setValue(`tracks.${index}.title`, nameWithoutExt);

      // Try to extract BPM from filename (common pattern: "Track Name 120 BPM.mp3")
      const bpmMatch = file.name.match(/(\d{2,3})\s*bpm/i);
      if (bpmMatch) {
        const bpm = parseInt(bpmMatch[1], 10);
        if (bpm >= 60 && bpm <= 200) {
          form.setValue(`tracks.${index}.bpm`, bpm);
        }
      }

      // Try to extract key from filename (pattern: "Track Name Am.mp3" or "Track Name A minor.mp3")
      const keyMatch = file.name.match(/\b([A-G][b#]?)\s*(m|min|minor|maj|major)?\b/i);
      if (keyMatch) {
        let key = keyMatch[1];
        if (keyMatch[2] && keyMatch[2].toLowerCase().startsWith('m')) {
          key += 'm'; // Add 'm' for minor
        }
        form.setValue(`tracks.${index}.key`, key);
      }

      toast.success(`Metadata extracted for ${nameWithoutExt}`);
    } catch (error) {
      console.error('Error parsing metadata:', error);
      toast.error("Failed to parse metadata from filename.");
    }
  }, [form]);

  const onSubmit = useCallback(async (data: BulkUploadFormValues) => {
    setIsSubmitting(true);
    toast.info("Preparing uploads...", { id: "prepare-toast" });

    // Reset statuses
    setUploadStatuses(data.tracks.map((track) => ({
      audio: track.audioFile instanceof File ? 'idle' : 'skipped',
      cover: track.coverImage instanceof File ? 'idle' : 'skipped'
    })));

    // Prepare API payload
    const apiPayload = {
      tracks: data.tracks
        .map((track, index) => ({
          ...track,
          index,
          bpm: track.bpm ?? null,
          key: track.key ?? null,
          tags: track.tags ?? '',
          _audioFileName: track.audioFile instanceof File ? track.audioFile.name : undefined,
          _coverFileName: track.coverImage instanceof File ? track.coverImage.name : undefined,
        }))
        .filter(track => !!track._audioFileName)
    };

    if (apiPayload.tracks.length === 0) {
      toast.warning("No tracks with audio files selected for upload.", { id: "prepare-toast" });
      setIsSubmitting(false);
      return;
    }

    try {
      // Call server action for preparation
      const responseBody = await prepareBulkUpload({ 
        tracks: apiPayload.tracks.map(({ index, audioFile, coverImage, ...rest }) => ({
          ...rest,
          contentType: 'beats' as const,
          price: 0
        }))
      });
      
      const successfulPreparations: UploadPreparationResult[] = responseBody.preparations || [];

      // Update statuses based on preparation response
      setUploadStatuses(prevStatuses => {
        const newStatuses = [...prevStatuses];
        apiPayload.tracks.forEach(submittedTrack => {
          const originalIndex = submittedTrack.index;
          const prepResult = successfulPreparations.find(p => p._audioFileName === submittedTrack._audioFileName);

          if (prepResult) {
            if (newStatuses[originalIndex]) newStatuses[originalIndex].audio = 'idle';
            if (prepResult._coverFileName && newStatuses[originalIndex]) {
              newStatuses[originalIndex].cover = 'idle';
            } else if (submittedTrack._coverFileName && newStatuses[originalIndex]) {
              newStatuses[originalIndex].cover = 'error';
            }
          } else {
            if (newStatuses[originalIndex]) newStatuses[originalIndex].audio = 'error';
            if (submittedTrack._coverFileName && newStatuses[originalIndex]) {
              newStatuses[originalIndex].cover = 'error';
            }
          }
        });

        // Ensure skipped statuses remain skipped
        data.tracks.forEach((track, index) => {
          if (!(track.audioFile instanceof File) && newStatuses[index]) {
            newStatuses[index].audio = 'skipped';
            if (newStatuses[index].cover !== 'skipped') {
              newStatuses[index].cover = track.coverImage instanceof File ? 'skipped' : newStatuses[index].cover;
            }
          }
          if (!(track.coverImage instanceof File) && newStatuses[index] && newStatuses[index].cover !== 'error') {
            newStatuses[index].cover = 'skipped';
          }
        });
        return newStatuses;
      });

      if (responseBody.error) {
        if (successfulPreparations.length > 0) {
          toast.warning(`Partial success: ${responseBody.error}`, { id: "prepare-toast", duration: 10000 });
        } else {
          toast.error(responseBody.error, { id: "prepare-toast" });
        }
        
        if (successfulPreparations.length === 0) {
          setIsSubmitting(false);
          return;
        }
      } else {
        toast.success("Preparation complete. Starting uploads...", { id: "prepare-toast" });
      }

      // Initiate uploads
      const uploadPromises: Promise<void>[] = [];

      successfulPreparations.forEach(prep => {
        const originalIndex = apiPayload.tracks.find(t => t._audioFileName === prep._audioFileName)?.index;
        const trackData = originalIndex !== undefined ? data.tracks[originalIndex] : undefined;

        if (originalIndex === undefined || !trackData) {
          console.error("Mismatch finding original track for prepared upload:", prep);
          return;
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
          updateUploadStatus(originalIndex, 'audio', 'error');
        }

        // Cover Upload
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
          updateUploadStatus(originalIndex, 'cover', 'error');
        }
      });

      await Promise.all(uploadPromises);

      // Check final statuses
      const finalStatuses = uploadStatuses;
      const allSucceeded = finalStatuses.every(status =>
        (status.audio === 'success' || status.audio === 'skipped') &&
        (status.cover === 'success' || status.cover === 'skipped')
      );
      const anyFailed = finalStatuses.some(status => status.audio === 'error' || status.cover === 'error');

      if (allSucceeded) {
        toast.success("All uploads completed successfully!");
        form.reset({ tracks: [createEmptyTrack()] });
        setUploadStatuses([]);
      } else if (anyFailed) {
        toast.error("Some uploads failed. Please check the status indicators.");
      } else {
        toast.warning("Uploads finished, but some may not have completed successfully.");
      }

    } catch (error) {
      console.error('Error during upload preparation or submission:', error);
      toast.error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`, { id: "prepare-toast" });
      setUploadStatuses(prev => prev.map(status => ({
        audio: status.audio === 'idle' || status.audio === 'uploading' ? 'error' : status.audio,
        cover: status.cover === 'idle' || status.cover === 'uploading' ? 'error' : status.cover,
      })));
    } finally {
      setIsSubmitting(false);
    }
  }, [form, updateUploadStatus, uploadStatuses]);

  return {
    form,
    fields,
    append: () => append(createEmptyTrack()),
    remove,
    isSubmitting,
    uploadStatuses,
    selectedContentType,
    setSelectedContentType,
    onSubmit,
    updateUploadStatus,
    getStatusIndicator,
    parseAndSetMetadata,
  };
} 