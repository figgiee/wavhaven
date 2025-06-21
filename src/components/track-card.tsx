"use client"; // Add this directive

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useMemo, useCallback } from 'react';
import { Play, Plus, Music, Pause, ShoppingCart, Loader2, Check, Clock, Layers, MinusCircle, ExternalLink, Heart } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming Shadcn UI utils path
import { usePlayerStore } from '@/stores/use-player-store'; // Import Zustand store
import { useCartStore, CartItem } from '@/stores/useCartStore'; // Import cart store and type
import type { License } from '@/components/license/license.types'; // Import License type
import { PlayerTrack } from '@/types'; // <-- Import PlayerTrack type
import { toast } from 'sonner'; // Import toast
import { Skeleton } from '@/components/ui/skeleton'; // <-- Import Skeleton
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { useUIStore } from '@/stores/use-ui-store'; // <-- Import useUIStore
import type { Beat } from '@/types'; // Ensure Beat is imported from global types
import { Share2Icon } from '@radix-ui/react-icons';
import { TrackCardSkeleton } from './track-card-skeleton'; // <-- Import renamed skeleton
import { LicenseModal } from '@/components/license/LicenseModal'; // <-- ADD Import
import { usePostHog } from 'posthog-js/react'; // Import PostHog hook
import { motion } from 'framer-motion';

// // {/* TODO: Define more specific types, perhaps using Prisma-generated types? */}
// interface Beat {
//   id: string | number;
//   title: string;
//   imageUrl?: string; // Make optional if there's a fallback
//   producerName: string;
//   producerProfileUrl?: string; // Optional link to producer page
//   bpm?: number; // Make optional
//   key?: string; // Make optional
//   audioSrc: string; // Renamed from audioPreviewUrl for consistency with store
//   beatUrl?: string; // Link to the beat detail page
//   licenses: License[]; // <-- Add licenses array
// }

// TODO: Rename this file to track-card.tsx

// --- Component Props ---
export interface TrackCardProps {
    beat: Beat;
    fullTrackList: Beat[]; // Add the full list prop
    index: number; // Add the index prop
    className?: string;
    /** @deprecated Prefer using the `variant` prop to control layout. */
    displayMode?: 'grid' | 'list'; // Optional display mode, can be deprecated if variant covers all cases
    variant?: 'default' | 'listitem' | 'compact' | 'detailPage'; // Added variant prop
}

// --- Main Component ---
const TrackCardComponent: React.FC<TrackCardProps> = ({ // Rename component function and EXPORT IT
    beat,
    fullTrackList, // Destructure the new prop
    index, // Destructure the new prop
    className,
    displayMode = 'grid', // Kept, used for conditional styling for now
    variant = 'default', // Destructure variant, default to 'default'
}) => { // Added '=>' here and will add ';' at the end of the component block
  const [isImageLoading, setIsImageLoading] = useState(true); // <-- State for image loading
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false); // Placeholder state, as in existing code
  // Optimistic UI for add to cart
  const [isOptimisticallyInCart, setIsOptimisticallyInCart] = useState(false);

  const posthog = usePostHog();

  const {
      currentTrack,
      isPlaying: playerIsPlaying,
      isLoading: playerIsLoading,
      togglePlay,
      playTrackFromList,
  } = usePlayerStore();

  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const openSlideOut = useUIStore((state) => state.openSlideOut); // <-- Use openSlideOut from useUIStore

  const isCurrentTrackPlaying = playerIsPlaying && currentTrack?.id === beat.id;
  const isThisTrackLoading = playerIsLoading && currentTrack?.id === beat.id;

  const availableLicenses = beat.licenses || [];
  const cheapestLicense = useMemo(() => {
    if (!availableLicenses || availableLicenses.length === 0) return null;
    return availableLicenses.reduce((lowest, current) =>
      (current.price < lowest.price ? current : lowest), availableLicenses[0]
    );
  }, [availableLicenses]);

  const licenseInCart = items.find(item => item.trackId === beat.id);
  const isInCart = !!licenseInCart; // General check if any license for this beat is in cart

  // Update optimistic state based on actual cart state
  React.useEffect(() => {
    setIsOptimisticallyInCart(isInCart);
  }, [isInCart]);

  const mappedFullList = useMemo(() => {
    const isListArray = Array.isArray(fullTrackList);
    if (!isListArray) {
      console.error("TrackCard received invalid fullTrackList prop:", fullTrackList);
      return [];
    }
    return fullTrackList.map((b, itemIndex): PlayerTrack => {
        if (!b) {
            return { id: `invalid-${itemIndex}`, title: 'Invalid Item', artist: 'Error', audioSrc: '', coverImage: '', url: '' };
        }
        return {
             id: String(b.id), // Ensure ID is string
             title: b.title,
             artist: b.producerName,
             audioSrc: b.audioSrc || '',
             coverImage: b.imageUrl ?? undefined,
             url: b.beatUrl,
        };
    });
  }, [fullTrackList]);

  const beatPageUrl = beat.beatUrl || `/track/${beat.slug || beat.id}`;
  const producerProfileUrl = beat.producerName ? `/u/${beat.producerName}` : '#';

  const PlayPauseIcon = useMemo(() => {
    if (isThisTrackLoading) return Loader2;
    return isCurrentTrackPlaying ? Pause : Play;
  }, [isThisTrackLoading, isCurrentTrackPlaying]);

  const handlePlayPauseClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      if (isCurrentTrackPlaying) {
          togglePlay();
      } else {
           if (currentTrack?.id === beat.id) {
               togglePlay();
           } else {
               if (beat.audioSrc) {
                   const trackData: PlayerTrack = {
                       id: String(beat.id),
                       title: beat.title,
                       artist: beat.producerName,
                       audioSrc: beat.audioSrc,
                       coverImage: beat.imageUrl ?? undefined,
                       url: beat.beatUrl,
                   };
                    playTrackFromList(trackData, mappedFullList, index);
               } else {
                   toast.error('No audio preview available for this beat.');
               }
           }
      }
      if (!isCurrentTrackPlaying && beat.audioSrc) {
        posthog?.capture('track_preview_played', {
            trackId: String(beat.id),
            trackTitle: beat.title,
            producerName: beat.producerName,
            origin: 'track-card'
        });
      }
  }, [isCurrentTrackPlaying, currentTrack, beat, togglePlay, playTrackFromList, mappedFullList, index, posthog]);

  // Placeholder for Like click
  const handleLikeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
    toast.info(isFavorited ? 'Removed from favorites' : 'Added to favorites (Feature WIP)');
    // TODO: Implement actual like/unlike logic
    posthog?.capture(isFavorited ? 'track_unliked' : 'track_liked', {
        trackId: String(beat.id),
        trackTitle: beat.title,
        origin: 'track-card'
    });
  }, [isFavorited, beat.id, beat.title, posthog]);

  // Updated Add to Cart from Card click
  const handleAddToCartFromCard = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOptimisticallyInCart && licenseInCart) { // If already in cart (optimistically or actually), remove it
        removeItem(String(licenseInCart.trackId), licenseInCart.licenseId);
        setIsOptimisticallyInCart(false);
        toast.success(`Removed from cart: ${licenseInCart.trackTitle}`);
        posthog?.capture('license_removed_from_cart', {
            trackId: String(licenseInCart.trackId),
            licenseId: licenseInCart.licenseId,
            removedFrom: 'track-card'
        });
    } else if (availableLicenses.length === 1 && availableLicenses[0]) {
        const singleLic = availableLicenses[0];
        const priceNumber = Number(singleLic.price || 0);
        const cartItemToAdd: CartItem = {
            trackId: String(beat.id),
            licenseId: singleLic.id,
            trackTitle: beat.title,
            producerName: beat.producerName,
            price: Math.round(priceNumber * 100),
            imageUrl: beat.imageUrl,
            licenseName: singleLic.name,
        };
        addItem(cartItemToAdd);
        setIsOptimisticallyInCart(true);
        toast.success(`Added to cart: ${beat.title} - ${singleLic.name}`);
        posthog?.capture('license_added_to_cart', {
            trackId: String(beat.id),
            licenseId: singleLic.id,
            price: Math.round(priceNumber * 100),
            addedFrom: 'track-card-direct'
        });
    } else {
        // If multiple licenses or no licenses, open slide out panel to choose
        openSlideOut(String(beat.id), 'pricing'); // <-- Call openSlideOut with tab
        posthog?.capture('license_options_viewed', {
            trackId: String(beat.id),
            viewedFrom: 'track-card-cart-icon'
        });
    }
  }, [isOptimisticallyInCart, licenseInCart, availableLicenses, beat, addItem, removeItem, openSlideOut, posthog]);

  const handleCardClick = useCallback(() => {
    openSlideOut(String(beat.id), 'overview'); // <-- Call openSlideOut with tab
    posthog?.capture('track_details_viewed', {
        trackId: String(beat.id),
        openedFrom: 'track-card'
    });
  }, [beat, openSlideOut, posthog]);

  const imageToDisplay = beat.imageUrl || beat.coverImageUrl; // New: only use actual URLs

  // If no image URL, set loading to false immediately.
  React.useEffect(() => {
    if (!imageToDisplay) {
      setIsImageLoading(false);
    }
  }, [imageToDisplay]);

  if (isThisTrackLoading) { // Or use a more specific isThisTrackCardLoading if needed
    return <TrackCardSkeleton displayMode={displayMode} variant={variant} />;
  }

  // Determine specific styles based on variant
  const isListItem = variant === 'listitem';
  const isDetailPage = variant === 'detailPage'; // For the sidebar card on track detail page

  // --- DETAIL PAGE VARIANT LAYOUT ---
  if (isDetailPage) {
    return (
      <div className={cn("w-full flex flex-col bg-neutral-800 rounded-lg shadow-lg", className)}>
        {/* Image Section */}
        <div className="relative aspect-square w-full overflow-hidden">
          {isImageLoading && <Skeleton className="absolute inset-0 w-full h-full bg-neutral-700" />}
          <Image 
            src={imageToDisplay || '/placeholder-image.svg'} // Fallback placeholder
            alt={beat.title || 'Track artwork'}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={cn(
              "object-cover transition-all duration-300 ease-in-out",
              isImageLoading ? 'opacity-0' : 'opacity-100'
            )}
            onLoad={() => setIsImageLoading(false)}
            onError={() => {
              setIsImageLoading(false);
              // Potentially set a flag to show a specific error/fallback for broken image
            }}
            priority // Important for LCP on detail pages
          />
          {/* Play/Pause Button Overlay - Centered */}
          <button 
            onClick={handlePlayPauseClick} 
            aria-label={isCurrentTrackPlaying ? "Pause" : "Play"}
            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity duration-200 group"
          >
            <PlayPauseIcon className={cn(
              "h-16 w-16 text-white drop-shadow-lg",
              isThisTrackLoading ? 'animate-spin' : ''
            )} />
          </button>
        </div>

        {/* Waveform Placeholder Section */}
        <div className="h-24 bg-neutral-700/50 my-4 mx-4 rounded flex items-center justify-center">
          <Music size={32} className="text-neutral-500" />
          <span className="ml-2 text-neutral-500 text-sm">Waveform loading...</span>
          {/* Later: <ActualWaveformComponent src={beat.waveformUrl} /> */}
        </div>

        {/* Info Section (Title, Producer) - Kept brief for detail page context */}
        <div className="p-4 text-center">
          <h3 className="text-lg font-semibold text-neutral-100 truncate" title={beat.title}>{beat.title}</h3>
          <Link href={producerProfileUrl} className="text-xs text-cyan-glow hover:underline truncate block" title={beat.producerName}>
            By {beat.producerName}
          </Link>
        </div>
        
        {/* Action Buttons (Like) */}
        <div className="p-4 border-t border-neutral-700/50 flex justify-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLikeClick} 
            aria-label={isFavorited ? "Unlike track" : "Like track"}
            className="text-muted-foreground hover:text-pink-500 data-[favorited=true]:text-pink-500"
            data-favorited={isFavorited}
          >
            <Heart fill={isFavorited ? "currentColor" : "none"} className="w-5 h-5" />
          </Button>
          {/* Other actions like Share could go here */}
        </div>
      </div>
    );
  }

  // --- DEFAULT/LISTITEM/COMPACT VARIANT LAYOUT ---
  // Wrap the main card content in a button for accessibility
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); // Prevent page scroll on space
      handleCardClick();
    }
  };

  // --- DEFAULT/GRID LAYOUT ---
  return (
    <motion.div
      onClick={handleCardClick}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-lg bg-neutral-800 shadow-lg transition-all duration-150 ease-linear hover:shadow-xl hover:shadow-cyan-glow/20",
        "transform-gpu will-change-transform", // Added for performance
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
      <div className={cn("p-3 sm:p-4", isListItem ? "flex-grow flex justify-between items-center" : "")}>
        <div className={cn("flex-grow", isListItem ? "mr-4" : "")}>
          {/* Track Title */}
          <h3 className={cn("font-semibold text-sm sm:text-base text-foreground truncate", isListItem ? "" : "mb-0.5")}>
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
        <div className={cn(
          "flex items-center flex-shrink-0", 
          isListItem ? "gap-2" : "gap-1 sm:gap-1.5 mt-3 justify-end"
        )}>
          {/* Like Button */}
          <Button
            variant="ghost"
            size={isListItem ? "icon" : "sm"}
            className={cn(
              "text-neutral-400 hover:text-pink-500 hover:bg-pink-500/10 focus-visible:ring-pink-500 rounded-full",
              isListItem ? "w-8 h-8" : "w-7 h-7 sm:w-8 sm:h-8",
              isFavorited && "text-pink-500"
            )}
            onClick={handleLikeClick}
            aria-label={isFavorited ? `Unlike ${beat.title}` : `Like ${beat.title}`}
          >
            <Heart size={isListItem ? 16 : 14} fill={isFavorited ? 'currentColor' : 'none'} />
          </Button>
          
          {/* Cart/License Button */}
          {cheapestLicense && (
            <Button
              variant={isOptimisticallyInCart ? "luminous-outline" : "default"}
              size={isListItem ? "sm" : "sm"}
              className={cn(
                "cart-button transition-all duration-150 ease-in-out",
                isListItem ? "px-3 py-1.5 h-8" : "px-2.5 py-1 h-7 sm:px-3 sm:py-1.5 sm:h-8 text-xs sm:text-sm",
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

      {/* Keyboard Navigation Hint */}
      <div className="absolute bottom-1 right-1 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200">
        <span className="text-xs text-neutral-400 px-1.5 py-0.5 bg-neutral-900/70 rounded">Tab</span>
      </div>
    </motion.div>
  );
};

export default TrackCardComponent;
