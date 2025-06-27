'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CreatePlaylistModal } from '@/components/features/CreatePlaylistModal';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    tracks: number;
  };
  tracks: Array<{
    track: {
      coverImageUrl: string | null;
    };
  }>;
}

interface PlaylistsPageClientProps {
  playlists: Playlist[];
}

export function PlaylistsPageClient({ playlists }: PlaylistsPageClientProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Playlists</h1>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Create New Playlist
          </Button>
        </div>

        {playlists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {playlists.map(playlist => (
              <Link href={`/playlist/${playlist.id}`} key={playlist.id}>
                <Card className="h-full hover:bg-neutral-800/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="truncate">{playlist.name}</CardTitle>
                    <CardDescription>{playlist._count.tracks} tracks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Image Grid Preview */}
                    <div className="aspect-square bg-muted rounded-md grid grid-cols-2 grid-rows-2 gap-1 overflow-hidden">
                      {playlist.tracks.slice(0, 4).map((pt, index) => (
                        pt.track.coverImageUrl ? (
                          <div 
                            key={index} 
                            className="bg-cover bg-center" 
                            style={{backgroundImage: `url(${pt.track.coverImageUrl})`}}
                          />
                        ) : (
                          <div key={index} className="bg-neutral-700" />
                        )
                      ))}
                      {/* Fill remaining slots if less than 4 tracks */}
                      {Array.from({ length: Math.max(0, 4 - playlist.tracks.length) }).map((_, index) => (
                        <div key={`empty-${index}`} className="bg-neutral-700" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-medium mb-2">No playlists yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first playlist to organize your favorite tracks
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                Create Your First Playlist
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
} 