'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Music, Tag, Clock, KeyRound, Info, UserCircle, Heart } from 'lucide-react';
import TrackCard from '@/components/track-card';
import type { TrackDetails } from '@/server-actions/trackActions';
import type { Beat as BeatCardType } from '@/types';
import { cn } from '@/lib/utils';

interface TrackSidebarProps {
  track: TrackDetails;
}

function mapTrackToBeatCardType(track: TrackDetails): BeatCardType {
    const beatUrl = `/track/${track.slug}`;
    const producerDisplayName = track.producer?.username || "Unknown Producer";
    return {
        id: track.id,
        title: track.title,
        slug: track.slug,
        imageUrl: track.coverImageUrl ?? undefined,
        coverImageUrl: track.coverImageUrl ?? undefined,
        producerName: producerDisplayName,
        producerProfileUrl: track.producer?.username ? `/u/${track.producer.username}` : undefined,
        bpm: track.bpm ?? undefined,
        key: track.key ?? undefined,
        audioSrc: track.previewAudioUrl ?? '',
        beatUrl: beatUrl,
        licenses: (track.licenses || []).map(l => ({
            ...l,
            price: typeof l.price === 'string' ? parseFloat(l.price) : (typeof l.price === 'object' && l.price !== null ? Number((l.price as any).amount) : Number(l.price)),
        })),
        producer: track.producer ? { id: track.producer.id, username: track.producer.username, storeName: track.producer.storeName } : undefined,
        genre: track.genre ? { id: track.genre.id, name: track.genre.name, slug: track.genre.slug } : undefined,
        moods: track.moods || [],
        tags: track.tags || [],
        durationInSeconds: track.durationInSeconds || 0,
        waveformUrl: track.waveformUrl || '',
        playCount: track.playCount || 0,
        likeCount: track.likeCount || 0,
        commentCount: track.commentCount || 0,
        createdAt: track.createdAt || new Date(),
        updatedAt: track.updatedAt || new Date(),
    };
}

export function TrackSidebar({ track }: TrackSidebarProps) {
  const beatForCard = useMemo(() => mapTrackToBeatCardType(track), [track]);

  return (
    <aside className={cn(
        "w-full md:w-[300px] lg:w-[340px] xl:w-[380px] flex-shrink-0",
        "md:sticky md:top-[calc(var(--site-header-height,4rem)+2rem)] md:max-h-[calc(100vh-var(--site-header-height,4rem)-4rem)]"
    )}>
      <div className="bg-neutral-800/30 backdrop-blur-sm border border-neutral-700/50 rounded-xl p-1 shadow-xl">
        <TrackCard 
          beat={beatForCard} 
          fullTrackList={[beatForCard]}
          index={0}
          variant="detailPage"
          className="w-full h-full rounded-lg overflow-hidden"
        />
      </div>
    </aside>
  );
} 