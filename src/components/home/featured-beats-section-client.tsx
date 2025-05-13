"use client";

import Link from 'next/link'; // Likely not needed here, but was in original context
import Image from 'next/image'; // Likely not needed here
import { motion } from 'framer-motion';
import TrackCard from '@/components/track-card';
import type { Beat as BeatCardType } from '@/components/track-card';
import type { TrackSearchResult } from '@/types';
import { cn } from "@/lib/utils"; // Was used by HeroSection, maybe not here

// --- Featured Beats Section (CLIENT COMPONENT) ---
interface FeaturedBeatsClientProps {
  initialTracks: TrackSearchResult[];
  error?: string | null;
}

export function FeaturedBeatsSectionClient({ initialTracks, error: initialError }: FeaturedBeatsClientProps) {
  const adaptToBeatCardType = (track: TrackSearchResult): BeatCardType => ({
    id: track.id,
    title: track.title,
    slug: track.slug,
    imageUrl: track.coverImageUrl ?? undefined,
    producerName: `${track.producer?.firstName || ''} ${track.producer?.lastName || ''}`.trim() || track.producer?.username || 'Producer',
    producerProfileUrl: track.producer?.username ? `/u/${track.producer.username}` : undefined,
    bpm: track.bpm ?? undefined,
    key: track.key ?? undefined,
    audioSrc: track.previewAudioUrl ?? '',
    beatUrl: `/track/${track.slug}`,
    licenses: (track.licenses || []).map(l => ({
      id: l.id,
      type: l.type,
      name: l.name || l.type,
      price: l.price, // Ensure this is a number if TrackCard expects it
      description: l.description || '',
      filesIncluded: l.filesIncluded || [],
    })),
    producer: track.producer ? { id: track.producer.id, username: track.producer.username, storeName: track.producer.storeName } : undefined,
    coverImageUrl: track.coverImageUrl ?? undefined,
    genre: track.genre ? { id: track.genre.id, name: track.genre.name, slug: track.genre.slug } : undefined,
    moods: track.moods || [],
    tags: track.tags || [],
    durationInSeconds: track.durationInSeconds,
    waveformUrl: track.waveformUrl,
    playCount: track.playCount,
    likeCount: track.likeCount,
    commentCount: track.commentCount,
    createdAt: track.createdAt,
    updatedAt: track.updatedAt,
  });

  const adaptedListForPlayerContext = initialTracks.map(adaptToBeatCardType);

  const sectionVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <section className="py-24 sm:py-32 bg-background">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center w-full">Fresh Drops</h2>
        </div>

        {initialError && <div className="text-center text-red-500 py-10">{initialError}</div>}
        {!initialError && initialTracks.length === 0 && (
          <div className="text-center text-muted-foreground py-10">No featured beats available right now.</div>
        )}

        {!initialError && initialTracks.length > 0 && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
            data-testid="featured-tracks-grid"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            {initialTracks.map((track, index) => (
              <motion.div key={track.id} variants={itemVariants}>
                <TrackCard
                  beat={adaptToBeatCardType(track)}
                  fullTrackList={adaptedListForPlayerContext}
                  index={index}
                  className="w-full h-full"
                  variant="default"
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
} 