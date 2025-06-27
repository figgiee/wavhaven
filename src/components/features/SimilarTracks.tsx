import React from 'react';
import { getSimilarTracks } from '@/server-actions/ai/discoveryActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';

interface SimilarTracksProps {
    trackId: string;
}

export async function SimilarTracks({ trackId }: SimilarTracksProps) {
    const similarTracks = await getSimilarTracks(trackId, 5);

    if (!similarTracks || similarTracks.length === 0) {
        return null; // Don't render the component if there are no similar tracks
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Similar Tracks</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {similarTracks.map(track => (
                        <Link href={`/track/${track.id}`} key={track.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-neutral-800/50 transition-colors">
                            <div className="relative w-16 h-16 bg-muted rounded-md overflow-hidden">
                               {track.cover_image_url ? (
                                    <Image
                                        src={track.cover_image_url}
                                        alt={`${track.title} cover art`}
                                        fill
                                        className="object-cover"
                                    />
                               ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">Art</div>
                               )}
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold truncate">{track.title}</p>
                                <p className="text-sm text-muted-foreground truncate">by {track.producer_username}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
} 