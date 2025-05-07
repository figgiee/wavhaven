'use client';

import * as React from 'react';
import { approveTrack } from '@/server-actions/trackActions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation'; // To refresh data

interface ApproveTrackButtonProps {
  trackId: string;
}

export function ApproveTrackButton({ trackId }: ApproveTrackButtonProps) {
  const [isApproving, setIsApproving] = React.useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await approveTrack(trackId);
      if (result.success) {
        toast.success('Track approved successfully!');
        router.refresh(); // Refresh the page to remove the item from the list
      } else {
        toast.error(result.error || 'Failed to approve track.');
        setIsApproving(false); // Re-enable button on failure
      }
    } catch (error) {
      console.error("Error approving track:", error);
      toast.error('An unexpected error occurred during approval.');
      setIsApproving(false); // Re-enable button on unexpected error
    }
    // No need to set isApproving to false on success, as the component will likely unmount
  };

  return (
    <Button onClick={handleApprove} disabled={isApproving} size="sm">
      {isApproving ? 'Approving...' : 'Approve'}
    </Button>
  );
} 