'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { fixMissingBasicLicenses } from '@/server-actions/trackActions';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

export default function FixLicenseButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleFixLicenses = () => {
    setError(null);
    const priceInput = window.prompt('Enter the target price for missing/zero-priced BASIC licenses (e.g., 29.99):');
    if (priceInput === null) return; // User cancelled

    const targetPrice = parseFloat(priceInput);
    if (isNaN(targetPrice) || targetPrice < 0) {
      toast.error('Invalid Price', { description: 'Please enter a valid non-negative number.' });
      setError('Invalid price entered.');
      return;
    }

    startTransition(async () => {
      const toastId = toast.loading('Fixing licenses...');
      try {
        const result = await fixMissingBasicLicenses(targetPrice);
        if (result.success) {
          if (result.fixedCount > 0) {
            toast.success('Licenses Fixed!', { 
              id: toastId, 
              description: `Successfully processed ${result.fixedCount} tracks.` 
            });
          } else {
             toast.info('No Tracks Needed Fixing', {
                id: toastId,
                description: result.error || 'All tracks already have valid basic license prices.' 
             });
          }
        } else {
          throw new Error(result.error || 'An unknown error occurred.');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(message);
        toast.error('Failed to Fix Licenses', { id: toastId, description: message });
      } 
    });
  };

  return (
    <div className="mt-4 p-4 border border-dashed border-yellow-500/50 rounded-lg bg-yellow-500/10">
      <p className="text-sm text-yellow-300 mb-2">Temporary Tool:</p>
      <Button 
        variant="outline"
        size="sm"
        onClick={handleFixLicenses}
        disabled={isPending}
        className="border-yellow-500/60 text-yellow-300 hover:bg-yellow-500/20 hover:text-yellow-200"
      >
        {isPending ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        Fix Missing/Zero Basic License Prices
      </Button>
      {error && <p className="text-xs text-red-400 mt-2">Error: {error}</p>}
      <p className="text-xs text-yellow-400/70 mt-2">
        Use this if bulk upload didn't set prices correctly. Enter the desired price when prompted.
      </p>
    </div>
  );
} 