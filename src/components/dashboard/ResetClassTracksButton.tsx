'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
// import { resetClassTrackTitles } from '@/server-actions/trackActions'; // Function not implemented yet
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react'; // Using a reset icon

export default function ResetClassTracksButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setError(null);
    if (!window.confirm('Are you sure you want to reset all published tracks starting with \"class \" back to just \"class\"? This prepares them for sequential renaming.')) {
      return;
    }

    startTransition(async () => {
      const toastId = toast.loading('Resetting track titles to \"class\"...');
      try {
        // const result = await resetClassTrackTitles(); // Function not implemented yet
        const result = { success: false, error: 'Function not implemented yet', resetCount: 0 };
        if (result.success) {
          if (result.resetCount > 0) {
            toast.success('Titles Reset!', { 
              id: toastId, 
              description: `Reset ${result.resetCount} track titles to \"class\". Now run the sequential rename.` 
            });
          } else {
             toast.info('No Tracks Reset', {
                id: toastId,
                description: result.error || 'No published tracks starting with \"class \" were found to reset.' 
             });
          }
        } else {
          throw new Error(result.error || 'An unknown error occurred during title reset.');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(message);
        toast.error('Failed to Reset Titles', { id: toastId, description: message });
      } 
    });
  };

  return (
    <div className="mt-4 p-4 border border-dashed border-orange-500/50 rounded-lg bg-orange-500/10">
      <p className="text-sm text-orange-300 mb-2">Temporary Tool (Step 1):</p>
      <Button 
        variant="outline"
        size="sm"
        onClick={handleReset}
        disabled={isPending}
        className="border-orange-500/60 text-orange-300 hover:bg-orange-500/20 hover:text-orange-200"
      >
        {isPending ? (
          <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RotateCcw className="mr-2 h-4 w-4" />
        )}
        Reset \"class ...\" Titles to \"class\"
      </Button>
      {error && <p className="text-xs text-red-400 mt-2">Error: {error}</p>}
      <p className="text-xs text-orange-400/70 mt-2">
        Run this FIRST. It finds published tracks like \"class 1\" and resets their title to just \"class\".
      </p>
    </div>
  );
} 