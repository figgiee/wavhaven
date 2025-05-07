'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Music, Tag, Clock, KeyRound } from 'lucide-react';
import { TrackCard } from '@/components/track-card';
import type { TrackDetails, License as LicenseType } from '@/server-actions/trackActions';
import type { Beat as BeatCardType } from '@/components/track-card';
import { Beat } from '@/types';

interface TrackSidebarProps {
  track: TrackDetails;
  selectedLicenseId?: string;
}

function mapTrackToBeatCardType(track: TrackDetails): BeatCardType {
    const beatUrl = `/track/${track.slug}`;

    // Determine the producer display name
    const producerDisplayName = track.producer?.username || "Unknown Producer";

    return {
        id: track.id,
        title: track.title,
        imageUrl: track.coverImageUrl ?? undefined,
        producerName: producerDisplayName,
        producerProfileUrl: track.producer?.username ? `/u/${track.producer.username}` : undefined,
        bpm: track.bpm ?? undefined,
        key: track.key ?? undefined,
        audioSrc: track.previewAudioUrl ?? '',
        beatUrl: beatUrl,
        licenses: track.licenses.map(l => ({
            ...l,
            price: typeof l.price === 'object' ? Number(l.price) : l.price,
        })),
    };
}

export function TrackSidebar({ track }: TrackSidebarProps) {
  const producerProfileUrl = track.producer?.username ? `/u/${track.producer.username}` : '#';

  const beatForCard = useMemo(() => mapTrackToBeatCardType(track), [track]);

  return (
    <>
      <div className="w-full md:w-[300px] lg:w-[320px] xl:w-[340px] flex-shrink-0">
        <div className="flex flex-col items-center gap-6 sticky top-[calc(var(--header-height,6rem)+1.5rem)]">
          
          <div className="w-full">
            <TrackCard 
              beat={beatForCard} 
              fullTrackList={[beatForCard]}
              index={0}
            />
          </div>

          <div className="w-full space-y-4 px-2">
            {track.description && (
                <div>
                    <h3 className="font-semibold mb-1 text-sm">Description</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{track.description}</p>
                </div>
            )}

            {(track.bpm || track.key) && (
                 <div className="flex items-center justify-around gap-4 text-sm border-t border-b py-3">
                    {track.bpm && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{track.bpm} BPM</span>
                        </div>
                    )}
                    {track.key && (
                         <div className="flex items-center gap-1.5 text-muted-foreground">
                            <KeyRound className="w-4 h-4" />
                             <span>{track.key}</span>
                        </div>
                    )}
                </div>
            )}

            {track.tags && track.tags.length > 0 && (
                 <div>
                     <h3 className="font-semibold mb-2 text-sm">Tags</h3>
                     <div className="flex flex-wrap gap-2">
                        {track.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                        </Badge>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 