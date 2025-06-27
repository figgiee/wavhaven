'use client';

import React, { useState, useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { PlusCircle, ListMusic } from 'lucide-react';
import { toast } from 'sonner';
import { addTrackToPlaylist } from '@/server-actions/socialActions';
import { CreatePlaylistModal } from './CreatePlaylistModal';

// This would be fetched from the server
interface UserPlaylist {
    id: string;
    name: string;
}

interface AddToPlaylistButtonProps {
    trackId: string;
    userPlaylists: UserPlaylist[]; // Passed as a prop for now
}

export function AddToPlaylistButton({ trackId, userPlaylists }: AddToPlaylistButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const handleAddToPlaylist = (playlistId: string) => {
        startTransition(async () => {
            const result = await addTrackToPlaylist({ playlistId, trackId });
            if (result.success) {
                toast.success("Added to playlist!");
            } else {
                toast.error("Failed to add to playlist", { description: result.error });
            }
        });
    };

    const handleCreatePlaylistSuccess = (playlistId: string) => {
        // Automatically add track to the newly created playlist
        handleAddToPlaylist(playlistId);
    };

    return (
        <>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isPending}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add to Playlist
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Your Playlists</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {userPlaylists.length > 0 ? (
                    userPlaylists.map(playlist => (
                        <DropdownMenuItem
                            key={playlist.id}
                            onClick={() => handleAddToPlaylist(playlist.id)}
                            disabled={isPending}
                        >
                            <ListMusic className="mr-2 h-4 w-4" />
                            <span>{playlist.name}</span>
                        </DropdownMenuItem>
                    ))
                ) : (
                    <DropdownMenuItem disabled>No playlists yet.</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsCreateModalOpen(true)} disabled={isPending}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Create new playlist</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <CreatePlaylistModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={handleCreatePlaylistSuccess}
        />
        </>
    );
} 