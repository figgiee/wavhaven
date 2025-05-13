"use client";

import React from 'react';
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"; // Assuming Sheet is installed
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PlayerTrack } from '@/types'; // Assuming this type exists
import Image from 'next/image';
import { X, Trash2, Music } from 'lucide-react';
import { cn } from '@/lib/utils'; // Import cn

// Mock data for initial display
const mockQueue: PlayerTrack[] = [
  { id: '1', title: 'Track One', artist: { username: 'Artist A' }, coverArtUrl: '/coverart/default-cover.png', audioSrc: '' },
  { id: '2', title: 'Another Track Title That Is Quite Long To Test Wrapping', artist: { username: 'Artist B' }, coverArtUrl: '/coverart/default-cover.png', audioSrc: '' },
  { id: '3', title: 'Track Three', artist: { username: 'Artist C' }, coverArtUrl: '/coverart/default-cover.png', audioSrc: '' },
  { id: '4', title: 'Track Four', artist: { username: 'Artist A' }, coverArtUrl: '/coverart/default-cover.png', audioSrc: '' },
  { id: '5', title: 'Track Five', artist: { username: 'Artist D' }, coverArtUrl: '/coverart/default-cover.png', audioSrc: '' },
];

interface QueueDisplayProps {
  // TODO: Add props to receive actual queue data and handlers later
  queue: PlayerTrack[];
  currentTrackIndex: number | null; // Index of the currently playing track in the queue
  onRemoveTrack: (trackId: string) => void;
  // onReorderTrack: (startIndex: number, endIndex: number) => void; // For future drag-and-drop
  // Add prop for playing a specific track from queue later if needed
  // onPlayTrackFromQueue: (trackIndex: number) => void;
}

export function QueueDisplay({ queue = mockQueue, currentTrackIndex, onRemoveTrack }: QueueDisplayProps) {
  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4">
        <SheetTitle>Playback Queue</SheetTitle>
        <SheetDescription>
          View and manage the upcoming tracks.
        </SheetDescription>
      </SheetHeader>
      <Separator />
      <ScrollArea className="h-[calc(100vh-160px)] px-6 py-4"> {/* Adjust height as needed */}
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Music className="w-10 h-10 mb-4" />
            <p>The queue is empty.</p>
            <p className="text-xs mt-1">Add tracks to start playing.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((track, index) => (
              <div
                key={track.id ? `${track.id}-${index}` : `queue-item-${index}`} // Handle potential missing IDs temporarily
                className={cn(
                  "flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50 group transition-colors",
                  index === currentTrackIndex && "bg-primary/10 border border-primary/30" // Highlight current track
                )}
                // onClick={() => onPlayTrackFromQueue(index)} // Add later if needed
                // style={{ cursor: 'pointer' }} // Add later if needed
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Image
                    src={track.coverArtUrl || '/coverart/default-cover.png'}
                    alt={track.title || 'Track cover'}
                    width={40}
                    height={40}
                    className="rounded object-cover aspect-square"
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className={cn(
                       "text-sm font-medium truncate",
                       index === currentTrackIndex && "text-primary" // Highlight text
                    )} title={track.title}>
                      {track.title || 'Untitled Track'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate" title={track.artist?.username}>
                      {track.artist?.username || 'Unknown Artist'}
                    </p>
                  </div>
                </div>
                {/* Placeholder for remove/drag actions */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive focus-visible:opacity-100" // Make focus visible
                  onClick={(e) => {
                     e.stopPropagation(); // Prevent triggering potential parent onClick
                     onRemoveTrack(track.id);
                  }}
                  aria-label={`Remove ${track.title || 'Untitled Track'} from queue`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      <Separator />
      <SheetFooter className="px-6 py-4">
         {/* Optional: Add Clear Queue button or other actions */}
         <SheetClose asChild>
           <Button variant="outline">Close</Button>
         </SheetClose>
      </SheetFooter>
    </>
  );
} 