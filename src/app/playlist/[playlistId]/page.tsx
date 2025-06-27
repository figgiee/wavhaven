import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getInternalUserId } from '@/lib/userUtils';
import prisma from '@/lib/db/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrackCardGrid } from '@/components/cards/TrackCardGrid';
import { Play, User, Clock, Music, MoreVertical, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';

interface PlaylistPageProps {
  params: Promise<{ playlistId: string }>;
}

async function getPlaylistWithTracks(playlistId: string, currentUserId?: string) {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          profileImageUrl: true,
        },
      },
      tracks: {
        include: {
          track: {
            include: {
              producer: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                },
              },
              trackFiles: {
                where: {
                  fileType: {
                    in: ['IMAGE_PNG', 'IMAGE_JPEG', 'IMAGE_WEBP', 'PREVIEW_MP3'],
                  },
                },
              },
              licenses: true,
              genres: true,
              moods: true,
              tags: true,
              _count: {
                select: {
                  likes: true,
                  comments: true,
                },
              },
              likes: currentUserId ? {
                where: {
                  userId: currentUserId,
                },
                select: {
                  id: true,
                },
              } : undefined,
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      },
      _count: {
        select: {
          tracks: true,
        },
      },
    },
  });

  return playlist;
}

export default async function PlaylistPage({ params }: PlaylistPageProps) {
  const { playlistId } = await params;
  const { userId: clerkId } = auth();

  let currentUserId: string | undefined;
  if (clerkId) {
    const internalUserId = await getInternalUserId(clerkId);
    currentUserId = internalUserId || undefined;
  }

  const playlist = await getPlaylistWithTracks(playlistId, currentUserId);

  if (!playlist) {
    notFound();
  }

  // Check if playlist is public or if user owns it
  if (!playlist.isPublic && playlist.userId !== currentUserId) {
    notFound();
  }

  const isOwner = playlist.userId === currentUserId;
  const ownerName = playlist.user.firstName || playlist.user.lastName 
    ? `${playlist.user.firstName} ${playlist.user.lastName}`.trim()
    : playlist.user.username || 'Unknown User';

  // Transform tracks to Beat format for TrackCardGrid
  const beats = playlist.tracks.map(pt => {
    const track = pt.track;
    const coverImageFile = track.trackFiles.find(f => 
      ['IMAGE_PNG', 'IMAGE_JPEG', 'IMAGE_WEBP'].includes(f.fileType)
    );
    const previewAudioFile = track.trackFiles.find(f => f.fileType === 'PREVIEW_MP3');

    return {
      id: track.id,
      title: track.title,
      description: track.description,
      slug: track.slug,
      bpm: track.bpm,
      key: track.key,
      isPublished: track.isPublished,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
      producerId: track.producerId,
      contentType: track.contentType,
      likeCount: track._count.likes,
      commentCount: track._count.comments,
      playCount: track.playCount,
      minPrice: track.minPrice,
      coverImageUrl: coverImageFile?.storagePath || null,
      previewAudioUrl: previewAudioFile?.storagePath || null,
      producerName: track.producer.firstName || track.producer.lastName
        ? `${track.producer.firstName} ${track.producer.lastName}`.trim()
        : track.producer.username || 'Unknown Artist',
      producerUsername: track.producer.username,
      licenses: track.licenses,
      genres: track.genres,
      moods: track.moods,
      tags: track.tags,
      isLiked: track.likes && track.likes.length > 0,
    };
  });

  const totalDuration = playlist.tracks.length; // Could calculate actual duration if we had track lengths

  return (
    <div className="container mx-auto px-4 pt-24 pb-8 max-w-7xl">
      {/* Playlist Header */}
      <div className="mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Playlist Cover/Icon */}
              <div className="flex-shrink-0">
                <div className="w-48 h-48 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Music className="w-20 h-20 text-white" />
                </div>
              </div>

              {/* Playlist Info */}
              <div className="flex-grow space-y-4">
                <div>
                  <Badge variant="secondary" className="mb-2">
                    {playlist.isPublic ? 'Public Playlist' : 'Private Playlist'}
                  </Badge>
                  <h1 className="text-3xl font-bold">{playlist.name}</h1>
                  {playlist.description && (
                    <p className="text-muted-foreground mt-2">{playlist.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <Link 
                      href={`/u/${playlist.user.username}`}
                      className="hover:text-foreground transition-colors"
                    >
                      {ownerName}
                    </Link>
                  </div>
                  <div className="flex items-center gap-1">
                    <Music className="w-4 h-4" />
                    <span>{playlist._count.tracks} tracks</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Created {format(new Date(playlist.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button size="lg" className="min-w-[120px]">
                    <Play className="w-4 h-4 mr-2" />
                    Play All
                  </Button>
                  
                  {isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="lg">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          Edit Playlist
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Playlist
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tracks Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Tracks</h2>
          {isOwner && playlist.tracks.length > 0 && (
            <Button variant="outline" size="sm">
              Manage Tracks
            </Button>
          )}
        </div>

        {playlist.tracks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No tracks yet</h3>
              <p className="text-muted-foreground mb-4">
                {isOwner 
                  ? "Start adding tracks to your playlist" 
                  : "This playlist doesn't have any tracks yet"
                }
              </p>
              {isOwner && (
                <Button asChild>
                  <Link href="/explore">Browse Tracks</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <TrackCardGrid 
            beats={beats}
            currentUserId={currentUserId}
            showPagination={false}
          />
        )}
      </div>
    </div>
  );
} 