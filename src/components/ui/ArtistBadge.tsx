import React from 'react';
import { CheckBadgeIcon, StarIcon } from '@heroicons/react/20/solid'; // Example icons
import { cn } from '@/lib/utils';

// Define possible tiers/types - adjust based on actual requirements
type BadgeType = 'verified' | 'premium' | 'top-seller' | 'none';

interface ArtistBadgeProps {
  type: BadgeType;
  className?: string;
}

// Simple placeholder implementation - Refine SVGs/styles later
export const ArtistBadge: React.FC<ArtistBadgeProps> = ({ type, className }) => {
  if (type === 'none') {
    return null;
  }

  const badgeStyles = {
    verified: {
      icon: <CheckBadgeIcon className="h-3 w-3 text-blue-400" />,
      bgColor: 'bg-blue-900',
      tooltip: 'Verified Artist'
    },
    premium: {
      icon: <StarIcon className="h-3 w-3 text-yellow-400" />,
      bgColor: 'bg-yellow-800',
      tooltip: 'Premium Artist'
    },
    'top-seller': {
        icon: <StarIcon className="h-3 w-3 text-purple-400" />,
        bgColor: 'bg-purple-900',
        tooltip: 'Top Seller'
      },
  }[type];

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center w-4 h-4 rounded-full ml-1',
        badgeStyles.bgColor,
        className
      )}
      title={badgeStyles.tooltip} // Simple browser tooltip for now
      aria-label={badgeStyles.tooltip}
    >
      {badgeStyles.icon}
      {/* Add more complex SVG shapes here if needed for specific badge designs */}
    </div>
  );
}; 