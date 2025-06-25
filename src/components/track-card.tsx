'use client';

import React from 'react';
import { TrackCardGrid } from '@/components/cards/TrackCardGrid';
import { TrackCardList } from '@/components/cards/TrackCardList';
import { TrackCardDetail } from '@/components/cards/TrackCardDetail';
import type { Beat } from '@/types';

export interface TrackCardProps {
  beat: Beat;
  fullTrackList: Beat[];
  index: number;
  className?: string;
  /** @deprecated Prefer using the `variant` prop to control layout. */
  displayMode?: 'grid' | 'list';
  variant?: 'default' | 'listitem' | 'compact' | 'detailPage';
}

export const TrackCard: React.FC<TrackCardProps> = ({
  beat,
  fullTrackList,
  index,
  className,
  displayMode = 'grid',
  variant = 'default',
}) => {
  // Route to appropriate specialized component based on variant/displayMode
  if (variant === 'detailPage') {
    return (
      <TrackCardDetail
        beat={beat}
        fullTrackList={fullTrackList}
        index={index}
        className={className}
      />
    );
  }

  if (variant === 'listitem' || displayMode === 'list') {
    return (
      <TrackCardList
        beat={beat}
        fullTrackList={fullTrackList}
        index={index}
        className={className}
      />
    );
  }

  // Default to grid layout
  return (
    <TrackCardGrid
      beat={beat}
      fullTrackList={fullTrackList}
      index={index}
      className={className}
    />
  );
};

// Re-export the original component name for backward compatibility
export const TrackCardComponent = TrackCard;

// Default export for backward compatibility
export default TrackCard;
