'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Pause, Loader2, Music, Heart, ShoppingCart, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrackCardSkeleton } from '@/components/track-card-skeleton';
import { formatPrice } from '@/lib/utils';
import { useTrackCardActions } from '@/hooks/useTrackCardActions';
import type { Beat } from '@/types';

export interface TrackCardListProps {
  beat: Beat;
  fullTrackList: Beat[];
  index: number;
  className?: string;
}

export const TrackCardList: React.FC<TrackCardListProps> = ({
  beat,
  fullTrackList,
  index,
  className,
}) => {
  const [isImageLoading, setIsImageLoading] = useState(true);

  const {
    isFavorited,
    isOptimisticallyInCart,
    isCurrentTrackPlaying,
    isThisTrackLoading,
    isLikePending,
    cheapestLicense,
    licenseInCart,
    availableLicenses,
    producerProfileUrl,
    handlePlayPauseClick,
    handleLikeClick,
    handleAddToCartFromCard,
    handleCardClick,
  } = useTrackCardActions({ beat, fullTrackList, index, isInitiallyLiked: beat.isLiked ?? false });

  const imageToDisplay = beat.imageUrl || beat.coverImageUrl;

  // If no image URL, set loading to false immediately.
  React.useEffect(() => {
    if (!imageToDisplay) {
      setIsImageLoading(false);
    }
  }, [imageToDisplay]);

  const PlayPauseIcon = useMemo(() => {
    if (isThisTrackLoading) return Loader2;
    return isCurrentTrackPlaying ? Pause : Play;
  }, [isThisTrackLoading, isCurrentTrackPlaying]);

  if (isThisTrackLoading) {
    return <TrackCardSkeleton displayMode="list" variant="listitem" />;
  }

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group relative flex cursor-pointer items-center overflow-hidden rounded-lg bg-neutral-800 shadow-lg transition-all duration-150 ease-linear hover:shadow-xl hover:shadow-cyan-glow/20 p-3 sm:p-4",
        className
      )}
      aria-label={`View details for ${beat.title}`}
    >
      {/* Image Section */}
      <div className="relative overflow-hidden aspect-square w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 mr-4">
        {isImageLoading && (
          <Skeleton className="absolute inset-0 w-full h-full bg-neutral-700 rounded" />
        )}
        {imageToDisplay ? (
          <Image
            src={imageToDisplay}
            alt={`Cover art for ${beat.title}`}
            fill
            sizes="80px"
            className={cn(
              "object-cover transition-all duration-200 ease-linear rounded",
              isImageLoading ? 'opacity-0' : 'opacity-100'
            )}
            onLoad={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
          />
        ) : (
           <div className="absolute inset-0 w-full h-full bg-neutral-700 flex items-center justify-center rounded">
             <Music className="w-8 h-8 text-neutral-500" />
           </div>
        )}
        
        {/* Play/Pause Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 ease-linear flex items-center justify-center rounded">
          <Button
            variant="ghost"
            size="icon"
            className="play-button bg-white/20 hover:bg-white/30 text-white rounded-full w-8 h-8 backdrop-blur-sm"
            onClick={handlePlayPauseClick}
            aria-label={isCurrentTrackPlaying ? `Pause ${beat.title}` : `Play ${beat.title}`}
          >
            <PlayPauseIcon className={cn("w-4 h-4", isCurrentTrackPlaying && "ml-0.5")} />
          </Button>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-grow flex justify-between items-center mr-4">
        <div className="flex-grow">
          {/* Track Title */}
          <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
            {beat.title}
          </h3>
          {/* Producer Info */}
          <Link
            href={producerProfileUrl}
            onClick={(e) => e.stopPropagation()}
            className="text-xs sm:text-sm text-muted-foreground hover:text-cyan-glow transition-colors duration-150 inline-block relative focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-glow/80 rounded-sm"
          >
            {beat.producerName}
          </Link>
        </div>

        {/* Actions (Like/Cart) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Like Button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-neutral-400 hover:text-pink-500 hover:bg-pink-500/10 focus-visible:ring-pink-500 rounded-full w-8 h-8",
              isFavorited && "text-pink-500"
            )}
            onClick={handleLikeClick}
            disabled={isLikePending}
            aria-label={isFavorited ? `Unlike ${beat.title}` : `Like ${beat.title}`}
          >
            <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
          </Button>
          
          {/* Cart/License Button */}
          {cheapestLicense && (
            <Button
              variant={isOptimisticallyInCart ? "luminous-outline" : "default"}
              size="sm"
              className={cn(
                "cart-button transition-all duration-150 ease-in-out px-3 py-1.5 h-8",
                isOptimisticallyInCart ? "border-cyan-glow text-cyan-glow hover:bg-cyan-glow/10" : "shadow-glow-cyan-xs"
              )}
              onClick={handleAddToCartFromCard}
              aria-label={
                isOptimisticallyInCart && licenseInCart
                  ? `Remove ${beat.title} - ${licenseInCart.licenseName} from cart`
                  : availableLicenses.length === 1
                  ? `Add ${beat.title} - ${availableLicenses[0].name} to cart`
                  : `View license options for ${beat.title}`
              }
            >
              {isOptimisticallyInCart ? (
                <>
                  <Check size={14} className="mr-1.5" /> Added
                </>
              ) : (
                <>
                  <ShoppingCart size={14} className="mr-1.5" />
                  {formatPrice(cheapestLicense.price)}
                  {availableLicenses.length > 1 && <span className="ml-1">+</span>}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}; 