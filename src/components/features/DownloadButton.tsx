'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { generateDownloadUrl } from '@/server-actions/orderActions'; // Adjust path if needed
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs'; // Import useAuth

interface DownloadButtonProps {
  trackFileId: string;
  filename?: string; // Optional suggested filename
  trackTitle?: string; // For toast messages
  licenseName?: string; // For toast messages
}

function DownloadButton({
  trackFileId,
  filename = 'download', // Default filename
  trackTitle = 'Track',
  licenseName = 'License'
}: DownloadButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { getToken } = useAuth(); // Get getToken from useAuth

  const handleDownload = () => {
    if (isPending) return;

    const toastId = toast.loading(`Preparing download for ${trackTitle} (${licenseName})...`);

    startTransition(async () => {
      try {
        const token = await getToken();
        if (!token) {
          toast.error("Authentication token not available. Please try again.", { id: toastId });
          return;
        }

        const result = await generateDownloadUrl({ trackFileId, token, suggestedFilename: filename });

        if (result.success) {
          toast.success(`Download starting for ${trackTitle}!`, { id: toastId });
          
          // Trigger download in browser
          // Create a temporary link element
          const link = document.createElement('a');
          link.href = result.url;
          link.download = filename; // Use the provided filename
          
          // Append to body, click, and remove
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
        } else {
          toast.error(`Download failed: ${result.error}`, { id: toastId });
        }
      } catch (error) {
        toast.error("Download failed: An unexpected error occurred.", { id: toastId });
      }
    });
  };

  return (
    <Button 
      onClick={handleDownload} 
      disabled={isPending}
      aria-label={`Download ${trackTitle}`}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {isPending ? 'Preparing...' : 'Download'}
    </Button>
  );
}

export default DownloadButton;
export { DownloadButton }; 