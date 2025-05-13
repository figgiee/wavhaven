'use client'; // May need client features for future interactions

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { TrackListItem } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { Trash2, Edit, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { deleteTrack, deleteMultipleTracks } from '@/server-actions/trackActions';
import { toast } from 'sonner';
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink } from 'lucide-react';

interface ProducerTrackListProps {
  tracks: TrackListItem[];
}

const ITEMS_PER_PAGE = 5;

export default function ProducerTrackList({ tracks }: ProducerTrackListProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [isClient, setIsClient] = useState(false);
  const [lastCheckedIndex, setLastCheckedIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const numSelected = useMemo(() => Object.values(selectedRows).filter(Boolean).length, [selectedRows]);
  const isAllSelected = useMemo(() => tracks.length > 0 && numSelected === tracks.length, [numSelected, tracks.length]);

  const handleDelete = async (trackId: string) => {
    setIsDeleting(trackId);
    setError(null);
    try {
      const result = await deleteTrack(trackId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete track');
      }
      window.location.reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      toast.error(`Error deleting track: ${message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelectedRows: Record<string, boolean> = {};
    if (checked) {
      tracks.forEach(track => {
        newSelectedRows[track.id] = true;
      });
    }
    setSelectedRows(newSelectedRows);
    setLastCheckedIndex(null);
  };

  const handleSelectRow = (trackId: string, index: number, checked: boolean, event?: React.MouseEvent<HTMLButtonElement>) => {
    let newSelectedRows = { ...selectedRows };

    if (event?.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey && lastCheckedIndex !== null) {
        const start = Math.min(lastCheckedIndex, index);
        const end = Math.max(lastCheckedIndex, index);
        
        for (let i = start; i <= end; i++) {
            if (tracks[i]) {
               newSelectedRows[tracks[i].id] = checked; 
            }
        }
    } else {
        newSelectedRows[trackId] = checked;
    }

    setSelectedRows(newSelectedRows);
    if (!(event?.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey)) {
       setLastCheckedIndex(index);
    }
  };

  const handleBulkDelete = async () => {
    const idsToDelete = Object.entries(selectedRows)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id);

    if (idsToDelete.length === 0) {
      toast.info("No tracks selected for deletion.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${idsToDelete.length} selected track(s)? This action cannot be undone.`)) {
      return;
    }

    setIsBulkDeleting(true);
    const toastId = toast.loading(`Deleting ${idsToDelete.length} tracks...`);

    try {
      const result = await deleteMultipleTracks(idsToDelete);

      if (result.success) {
        toast.success(`${result.deletedCount} track(s) deleted successfully.`, { 
          id: toastId, 
          duration: 5000
        });
        
        if (result.failedCount > 0) {
          toast.warning(`${result.failedCount} track(s) could not be deleted (permission denied or not found).`, {
            duration: 8000
          });
          console.warn('Bulk delete partial failure details:', result.errors);
        }
        
        setSelectedRows({});
        
        setTimeout(() => {
           window.location.reload(); 
        }, 1500);

      } else {
        toast.error('Bulk delete failed', { 
          id: toastId, 
          description: result.error,
          duration: 10000
         });
      }
    } catch (err) {
      toast.error('Bulk delete failed', { 
        id: toastId, 
        description: err instanceof Error ? err.message : 'An unexpected client-side error occurred.',
        duration: 10000
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Render empty state if no tracks
  if (!tracks || tracks.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <p>You haven't uploaded any tracks yet.</p>
        <Button asChild className="mt-4">
          <Link href="/upload">Upload Your First Track</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {numSelected > 0 && (
        <div className="mb-4 flex justify-end">
          <Button 
            variant="destructive" 
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
          >
            {isBulkDeleting ? `Deleting ${numSelected}...` : `Delete Selected (${numSelected})`}
          </Button>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                {isClient && (
                   <Checkbox 
                     checked={isAllSelected}
                     onCheckedChange={(isChecked) => handleSelectAll(!!isChecked)}
                     aria-label="Select all rows"
                     disabled={isBulkDeleting}
                   />
                )}
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uploaded On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tracks.map((track, index) => (
              <TableRow key={track.id}>
                <TableCell>
                  {isClient && (
                    <Checkbox 
                      checked={!!selectedRows[track.id]} 
                      onCheckedChange={(checked, event) => handleSelectRow(track.id, index, !!checked, event)}
                      aria-label={`Select row ${track.title}`}
                      disabled={isBulkDeleting}
                    />
                  )}
                </TableCell>
                <TableCell className="font-medium">{track.title}</TableCell>
                <TableCell>
                  <Badge variant={track.isPublished ? 'success' : 'secondary'}>
                    {track.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </TableCell>
                <TableCell>{format(new Date(track.createdAt), 'PPP')}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button asChild variant="outline" size="icon" className="h-8 w-8">
                    <Link href={`/dashboard/track/${track.id}/edit`} title="Edit Track">
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="h-8 w-8" 
                        disabled={isDeleting === track.id || isBulkDeleting}
                        title="Delete Track"
                      >
                        {isDeleting === track.id ? 
                          <Loader2 className="h-4 w-4 animate-spin" /> :
                          <Trash2 className="h-4 w-4" />
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4 bg-popover border border-[hsl(var(--border))]">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Are you sure?</p>
                        <p className="text-sm text-muted-foreground">
                           Delete "<strong>{track.title}</strong>"?
                        </p>
                        <div className="flex justify-end pt-2">
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDelete(track.id)} 
                            disabled={isDeleting === track.id}
                          >
                            {isDeleting === track.id ? 'Deleting...' : 'Confirm'}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
} 