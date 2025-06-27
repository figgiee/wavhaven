'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Pause, Loader2, Music, Heart, ShoppingCart, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrackCardSkeleton } from '@/components/track-card-skeleton';
import { formatPrice } from '@/lib/utils';
import { useTrackCardActions } from '@/hooks/useTrackCardActions';
import type { Beat } from '@/types';

export interface TrackCardGridProps {
  beat: Beat;
  fullTrackList: Beat[];
  index: number;
  className?: string;
}

export const TrackCardGrid: React.FC<TrackCardGridProps> = ({
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
    return <TrackCardSkeleton displayMode="grid" variant="default" />;
  }

  return (
    <motion.div
      onClick={handleCardClick}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-lg bg-neutral-800 shadow-lg transition-all duration-150 ease-linear hover:shadow-xl hover:shadow-cyan-glow/20",
        "transform-gpu will-change-transform",
        className
      )}
      aria-label={`View details for ${beat.title}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.03, transition: { duration: 0.15, ease: "linear" } }}
    >
      {/* Image Section */}
      <div className="relative overflow-hidden aspect-square w-full">
        {isImageLoading && (
          <Skeleton className="absolute inset-0 w-full h-full bg-neutral-700" />
        )}
        {imageToDisplay ? (
          <Image
            src={imageToDisplay}
            alt={`Cover art for ${beat.title}`}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className={cn(
              "object-cover transition-all duration-200 ease-linear",
              isImageLoading ? 'opacity-0' : 'opacity-100'
            )}
            priority={index < 4}
            onLoad={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
          />
        ) : (
           <div className="absolute inset-0 w-full h-full bg-neutral-700 flex items-center justify-center">
             <Music className="w-1/3 h-1/3 text-neutral-500" />
           </div>
        )}
        
        {/* Overlay Buttons - Appear on Hover/Focus */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 ease-linear flex items-center justify-center p-2">
          <div className="flex items-center space-x-2">
            {/* Play/Pause Button */}
            <Button
              variant="ghost"
              size="icon"
              className="play-button bg-white/20 hover:bg-white/30 text-white rounded-full w-12 h-12 backdrop-blur-sm"
              onClick={handlePlayPauseClick}
              aria-label={isCurrentTrackPlaying ? `Pause ${beat.title}` : `Play ${beat.title}`}
            >
              <PlayPauseIcon className={cn("w-6 h-6", isCurrentTrackPlaying && "ml-0.5")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-3 sm:p-4">
        <div className="flex-grow">
          {/* Track Title */}
          <h3 className="font-semibold text-sm sm:text-base text-foreground truncate mb-0.5">
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
        <div className="flex items-center gap-1 sm:gap-1.5 mt-3 justify-end">
          {/* Like Button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "text-neutral-400 hover:text-pink-500 hover:bg-pink-500/10 focus-visible:ring-pink-500 rounded-full w-7 h-7 sm:w-8 sm:h-8",
              isFavorited && "text-pink-500"
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleLikeClick(e);
            }}
            disabled={isLikePending}
            aria-label={isFavorited ? `Unlike ${beat.title}` : `Like ${beat.title}`}
          >
            <Heart size={14} fill={isFavorited ? 'currentColor' : 'none'} />
          </Button>
          
          {/* Cart/License Button */}
          {cheapestLicense && (
            <Button
              variant={isOptimisticallyInCart ? "luminous-outline" : "default"}
              size="sm"
              className={cn(
                "cart-button transition-all duration-150 ease-in-out px-2.5 py-1 h-7 sm:px-3 sm:py-1.5 sm:h-8 text-xs sm:text-sm",
                isOptimisticallyInCart ? "border-cyan-glow text-cyan-glow hover:bg-cyan-glow/10" : "shadow-glow-cyan-xs"
              )}
              onClick={handleAddToCartFromCard}
              aria-label={
                isOptimisticallyInCart
                  ? `Remove ${beat.title} from cart`
                  : `Add ${beat.title} to cart`
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
                  {beat.licenses && beat.licenses.length > 1 && <span className="ml-1">+</span>}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}; 