import React from 'react'; // Removed useState as internal state is replaced
import { usePlayerStore } from '@/stores/use-player-store'; // Import player store
import type { PlayerTrack } from '@/types'; // Import PlayerTrack type
import { BeatImage } from './BeatImage';
import { BeatPrimaryInfo } from './BeatPrimaryInfo';
import { BeatActions } from './BeatActions';
import { BeatMetadata } from './BeatMetadata';
// Use the adapted type exported from SlideOutPanel
import type { AdaptedBeatData } from '../SlideOutPanel';
import { Card } from '@/components/ui/card';
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner'; // For error messages

interface BeatOverviewSectionProps {
  beat: AdaptedBeatData; // Use the adapted data structure
}

export const BeatOverviewSection: React.FC<BeatOverviewSectionProps> = ({ beat }) => {
  // Get player state and actions from Zustand store
  const {
      currentTrack,
      isPlaying: isPlayerPlaying, // Rename to avoid conflict with component scope variable
      isLoading: isPlayerLoading,
      playTrack, // Use the simpler playTrack action for a single track view
      togglePlay,
      setCurrentTrack, // Use this to load without auto-play if needed
  } = usePlayerStore();

  // Determine if the track in the panel is the one currently loaded/playing/loading
  // const isCurrentlyPlaying = isPlayerPlaying && currentTrack?.id === beat.id;
  // const isCurrentlyLoading = isPlayerLoading && currentTrack?.id === beat.id;
  // const isCurrentlyLoaded = currentTrack?.id === beat.id;

  // Removed handlePlayPauseClick as BeatImage in this context won't be interactive for play/pause

  return (
    <Card className="bg-gray-800 border-gray-700 text-white p-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start">
        <BeatImage
          artworkUrl={beat.artworkUrl}
          title={beat.title}
          // isPlaying prop is removed as it's no longer interactive here
          // onPlayPauseClick prop is removed to make it non-interactive
        />
        <div className="flex-grow mt-4 sm:mt-0 sm:ml-6 text-center sm:text-left">
          <BeatPrimaryInfo
            producer={beat.producer}
            title={beat.title}
            duration={beat.duration}
            packageDiscountAvailable={beat.packageDiscountAvailable}
            beatUrl={beat.url}
          />
          <BeatActions
            likes={beat.likes}
            commentCount={beat.commentCount}
            beatId={beat.id}
            title={beat.title}
            producerName={beat.producer.name}
            beatUrl={beat.url}
            initialIsLiked={beat.initialIsLiked}
          />
        </div>
      </div>

      <Separator className="bg-gray-700 my-4" />

      <BeatMetadata
        genre={beat.genre ? { id: beat.genre.id, name: beat.genre.name } : null}
        tempo={beat.tempo}
        moods={beat.moods || []}
        tags={beat.tags || []}
        description={beat.description}
      />
    </Card>
  );
}; 