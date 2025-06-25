'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
// import { renameTracksSequentially } from '@/server-actions/trackActions'; // Function not implemented yet
import { toast } from 'sonner';
import { CaseSensitive } from 'lucide-react'; // Using a different icon

export default function RenameClassTracksButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleRename = () => {
    setError(null);
    // Confirm before proceeding (optional but recommended for destructive actions)
    if (!window.confirm('Are you sure you want to rename all tracks titled \"class\" sequentially (class 1, class 2, ...)? This cannot be undone easily.')) {
      return;
    }

    startTransition(async () => {
      const toastId = toast.loading('Renaming \"class\" tracks...');
      try {
        // const result = await renameTracksSequentially('class'); // Function not implemented yet
        const result = { success: false, error: 'Function not implemented yet', renamedCount: 0 };
        if (result.success) {
          if (result.renamedCount > 0) {
            toast.success('Tracks Renamed!', { 
              id: toastId, 
              description: `Successfully renamed ${result.renamedCount} tracks.` 
            });
          } else {
             toast.info('No Tracks Renamed', {
                id: toastId,
                description: result.error || 'No tracks with the exact title \"class\" were found.' 
             });
          }
        } else {
          throw new Error(result.error || 'An unknown error occurred during renaming.');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(message);
        toast.error('Failed to Rename Tracks', { id: toastId, description: message });
      } 
    });
  };

  return (
    <div className="mt-4 p-4 border border-dashed border-blue-500/50 rounded-lg bg-blue-500/10">
      <p className="text-sm text-blue-300 mb-2">Temporary Tool:</p>
      <Button 
        variant="outline"
        size="sm"
        onClick={handleRename}
        disabled={isPending}
        className="border-blue-500/60 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200"
      >
        {isPending ? (
          <CaseSensitive className="mr-2 h-4 w-4 animate-pulse" /> // Use pulse for variety
        ) : (
          <CaseSensitive className="mr-2 h-4 w-4" />
        )}
        Rename \"class\" Tracks Sequentially
      </Button>
      {error && <p className="text-xs text-red-400 mt-2">Error: {error}</p>}
      <p className="text-xs text-blue-400/70 mt-2">
        Finds tracks exactly titled \"class\" and renames them to \"class 1\", \"class 2\", etc., based on creation order.
      </p>
    </div>
  );
} 