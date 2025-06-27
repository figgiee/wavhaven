'use client';

import React, { useTransition, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, UploadCloud, HardDrive, Music, FileImage } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteTrackFile, prepareTrackFileReplacement, finalizeTrackFileReplacement } from '@/server-actions/tracks/trackMutations';
import { Progress } from '@/components/ui/progress';
import { TrackFileType } from '@prisma/client';

interface FileItem {
    id: string;
    fileType: string;
    storagePath: string;
}

interface FileManagementProps {
    trackId: string;
    files: FileItem[];
}

const getFileIcon = (fileType: string) => {
    if (fileType.includes('ARTWORK')) return <FileImage className="h-5 w-5 text-neutral-400" />;
    if (fileType.includes('PREVIEW')) return <Music className="h-5 w-5 text-purple-400" />;
    if (fileType.includes('STEMS')) return <HardDrive className="h-5 w-5 text-blue-400" />;
    if (fileType.includes('MAIN')) return <Music className="h-5 w-5 text-green-400" />;
    return <Music className="h-5 w-5 text-neutral-400" />;
};

export function FileManagement({ trackId, files }: FileManagementProps) {
    const [isPending, startTransition] = useTransition();
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const handleReplace = async (fileType: TrackFileType, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadProgress(prev => ({ ...prev, [fileType]: 0 }));

        startTransition(async () => {
            try {
                toast.info(`Preparing to upload ${file.name}...`);
                const prepareResult = await prepareTrackFileReplacement(trackId, fileType, file.name);

                if (!prepareResult.success || !prepareResult.uploadUrl || !prepareResult.storagePath) {
                    throw new Error(prepareResult.error || "Failed to prepare upload.");
                }
                
                toast.info(`Uploading ${file.name}...`);
                await uploadFileToSignedUrl(prepareResult.uploadUrl, file, (progress) => {
                    setUploadProgress(prev => ({ ...prev, [fileType]: progress }));
                });

                toast.info(`Finalizing replacement...`);
                const finalizeResult = await finalizeTrackFileReplacement(trackId, fileType, prepareResult.storagePath);

                if (!finalizeResult.success) {
                    throw new Error(finalizeResult.error || "Failed to finalize replacement.");
                }
                
                toast.success(`${fileType.replace(/_/g, ' ')} replaced successfully.`);

            } catch (error: any) {
                toast.error("Replacement Failed", { description: error.message });
            } finally {
                setUploadProgress(prev => ({...prev, [fileType]: 0}));
                if(fileInputRefs.current[fileType]) {
                    fileInputRefs.current[fileType]!.value = "";
                }
            }
        });
    };
    
    // Extracted upload helper to be reusable
    const uploadFileToSignedUrl = async (signedUrl: string, file: File, onProgress: (progress: number) => void): Promise<void> => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', signedUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    onProgress(Math.round((event.loaded / event.total) * 100));
                }
            };
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve();
                else reject(new Error(`Upload failed with status ${xhr.status}`));
            };
            xhr.onerror = () => reject(new Error('Network error during upload.'));
            xhr.send(file);
        });
    };

    const handleDelete = (storagePath: string) => {
        startTransition(async () => {
            toast.info(`Deleting file...`);
            const result = await deleteTrackFile(trackId, storagePath);

            if (result.success) {
                toast.success("File deleted successfully.");
            } else {
                toast.error("Failed to delete file", { description: result.error });
            }
        });
    };

    return (
        <div className="space-y-4">
            <CardHeader className="p-0">
                <CardTitle className="text-lg">Uploaded Files</CardTitle>
                <CardDescription>
                    Manage the files associated with this track.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
                {files.length > 0 ? (
                    files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 rounded-md border bg-neutral-900/50">
                            <div className="flex items-center gap-3">
                                {getFileIcon(file.fileType as TrackFileType)}
                                <div>
                                    <p className="font-semibold text-sm">{file.fileType.replace(/_/g, ' ')}</p>
                                    <p className="text-xs text-neutral-400 truncate max-w-xs">{file.storagePath.split('/').pop()}</p>
                                </div>
                            </div>
                            {uploadProgress[file.fileType] > 0 && <Progress value={uploadProgress[file.fileType]} className="w-20 h-1.5" />}
                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    ref={el => fileInputRefs.current[file.fileType] = el}
                                    onChange={(e) => handleReplace(file.fileType as TrackFileType, e)}
                                    className="hidden"
                                    // Add accept attributes based on file type if needed
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRefs.current[file.fileType]?.click()}
                                    disabled={isPending || (uploadProgress[file.fileType] > 0 && uploadProgress[file.fileType] < 100)}
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                                >
                                    <UploadCloud className="h-4 w-4 mr-2" />
                                    {(uploadProgress[file.fileType] > 0 && uploadProgress[file.fileType] < 100) ? `${uploadProgress[file.fileType]}%` : 'Replace'}
                                </button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm" disabled={isPending}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the file from storage.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(file.storagePath)}>
                                                {isPending ? 'Deleting...' : 'Delete'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-neutral-500 text-center py-4">No files uploaded for this track yet.</p>
                )}
            </CardContent>
        </div>
    );
} 