import React from 'react';
import Link from 'next/link';
import { ClockIcon, TagIcon } from '@heroicons/react/24/outline';
import { ArtistBadge } from '@/components/ui/ArtistBadge'; // Import the badge
import { formatDuration } from '@/lib/utils'; // Assuming a utility function exists
import type { SlideOutBeat } from '@/types';

interface BeatPrimaryInfoProps {
  producer: SlideOutBeat['producer'];
  title: string;
  duration: number;
  packageDiscountAvailable: boolean;
  beatUrl: string;
  // TODO: Add producerUrl later
  // producerUrl?: string;
}

// Placeholder - implement if not existing
// const formatDuration = (seconds: number) => {
//   const minutes = Math.floor(seconds / 60);
//   const remainingSeconds = seconds % 60;
//   return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
// };

export const BeatPrimaryInfo: React.FC<BeatPrimaryInfoProps> = ({
  producer,
  title,
  // duration, // Comment out duration for now
  packageDiscountAvailable,
  beatUrl,
}) => {
  // TODO: Replace 'verified' with actual producer tier/status from data
  const producerBadgeType = 'verified';

  return (
    <div className="space-y-2">
      {/* Producer Info */}
      <div className="flex items-center justify-center sm:justify-start">
        {/* TODO: Make producer name a Link */}
        <span className="text-sm text-gray-400 hover:text-white transition-colors">
          {producer.name ?? 'Unknown Producer'} {/* Use producer.name here */}
        </span>
        {/* TODO: Pass actual producer tier type */}
        <ArtistBadge type={producerBadgeType} />
      </div>

      {/* Beat Title */}
      <h3 className="text-2xl font-semibold leading-tight">
        <Link href={beatUrl} className="hover:underline">
          {title}
        </Link>
      </h3>

      {/* Duration & Discount */}
      <div className="flex items-center justify-center sm:justify-start space-x-4 text-sm text-gray-400">
        {/* <div className="flex items-center">
          <ClockIcon className="h-4 w-4 mr-1" />
          <span>{formatDuration(duration)}</span>
        </div> */} {/* Comment out duration display */}
        {packageDiscountAvailable && (
          <div className="flex items-center px-2 py-0.5 bg-purple-600 bg-opacity-30 text-purple-300 rounded text-xs font-medium">
            <TagIcon className="h-3 w-3 mr-1" />
            Package Discount
          </div>
        )}
      </div>
    </div>
  );
}; 