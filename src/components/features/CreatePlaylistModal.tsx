'use client';

import React, { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createPlaylist } from '@/server-actions/socialActions';
import { useRouter } from 'next/navigation';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (playlistId: string) => void;
}

export function CreatePlaylistModal({ isOpen, onClose, onSuccess }: CreatePlaylistModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
  });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Playlist name is required');
      return;
    }

    startTransition(async () => {
      const result = await createPlaylist({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isPublic: formData.isPublic,
      });

      if (result.success && result.playlist) {
        toast.success('Playlist created successfully!');
        
        // Reset form
        setFormData({ name: '', description: '', isPublic: false });
        
        // Close modal
        onClose();
        
        // Handle success callback or navigation
        if (onSuccess) {
          onSuccess(result.playlist.id);
        } else {
          // Navigate to the new playlist
          router.push(`/playlist/${result.playlist.id}`);
        }
      } else {
        toast.error(result.error || 'Failed to create playlist');
      }
    });
  };

  const handleClose = () => {
    if (!isPending) {
      setFormData({ name: '', description: '', isPublic: false });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Playlist</DialogTitle>
          <DialogDescription>
            Create a playlist to organize your favorite tracks.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="playlist-name">Name *</Label>
            <Input
              id="playlist-name"
              placeholder="Enter playlist name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={isPending}
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playlist-description">Description</Label>
            <Textarea
              id="playlist-description"
              placeholder="Describe your playlist (optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={isPending}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="playlist-public"
              checked={formData.isPublic}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, isPublic: checked as boolean }))
              }
              disabled={isPending}
            />
            <Label htmlFor="playlist-public" className="text-sm">
              Make this playlist public
            </Label>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Playlist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 