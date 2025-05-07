"use client"; // Add this directive

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useMemo, useCallback } from 'react';
import { Play, Plus, Music, Pause, ShoppingCart, Loader2, Check, Clock, Layers, MinusCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming Shadcn UI utils path
import { usePlayerStore } from '@/stores/use-player-store'; // Import Zustand store
import { useCartStore, CartItem } from '@/stores/useCartStore'; // Import cart store and type
import type { License } from '@/components/license/license.types'; // Import License type
import { PlayerTrack } from '@/types'; // <-- Import PlayerTrack type
import { toast } from 'sonner'; // Import toast
import { Skeleton } from '@/components/ui/skeleton'; // <-- Import Skeleton
import { useUIStore } from '@/stores/use-ui-store'; // Import the UI store
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPrice } from '@/lib/utils';
import { useAudioPlayer } from '@/stores/useAudioPlayer';
import { useSlideOutPanel } from '@/stores/useSlideOutPanel';
import { adaptBeatData } from '@/components/features/slide-out-panel/SlideOutPanel';
import type { Beat } from '@/types';
import { Share2Icon, HeartIcon } from '@radix-ui/react-icons';
import { useToast } from "@/components/ui/use-toast"
import { TrackCardSkeleton } from './track-card-skeleton'; // <-- Import renamed skeleton
import { LicenseModal } from '@/components/license/LicenseModal'; // <-- ADD Import

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
    onPlay?: (beatId: string) => void; // Callback when play is clicked
    isPlaying?: boolean; // Is this track currently playing?
    isLoading?: boolean; // Is the audio for this track loading?
    isAuthenticated?: boolean; // Is the user logged in?
    displayMode?: 'grid' | 'list'; // Optional display mode
    tags?: string[]; // Optional tags to display
    // Add other props as needed, e.g., for handling different actions
    showAddToPlaylist?: boolean;
    showAddToCart?: boolean;
    showShare?: boolean;
}

// --- Main Component ---
export function TrackCard({ // Rename component function
    beat,
    fullTrackList, // Destructure the new prop
    index, // Destructure the new prop
    className,
    onPlay,
    isPlaying = false,
    isLoading = false,
    isAuthenticated = false,
    displayMode = 'grid',
    tags,
    showAddToPlaylist = true, // Default to true for core features
    showAddToCart = true,
    showShare = true,
}: TrackCardProps) {
  const [isImageLoading, setIsImageLoading] = useState(true); // <-- State for image loading
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false); // <-- UNCOMMENT this line

  // Get player state and actions from Zustand
  const {
      currentTrack,
      isPlaying: playerIsPlaying,
      isLoading: playerIsLoading,
      togglePlay,
      playTrackFromList, // <-- ADDED new action
  } = usePlayerStore();

  // Explicitly select store state and actions
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);

  // Get UI Store action
  const openSlideOut = useUIStore((state) => state.openSlideOut);

  const isCurrentlyPlaying = playerIsPlaying && currentTrack?.id === beat.id;
  const isThisTrackLoading = playerIsLoading && currentTrack?.id === beat.id; // <-- Check if THIS track is loading

  // Determine license details
  const availableLicenses = beat.licenses || [];
  const hasMultipleLicenses = availableLicenses.length > 1;
  const singleLicense = availableLicenses.length === 1 ? availableLicenses[0] : null;
  // Calculate lowest price in CENTS first
  const lowestPriceCents = availableLicenses.length > 0
      ? Math.min(...availableLicenses.map(l => Number(l.price || 0) * 100)) // Ensure price is number, handle null/undefined
      : 0;
  // Format the lowest price for display
  const formattedLowestPrice = formatPrice(lowestPriceCents / 100);

  // Recalculate based on selected items
  const licenseInCart = items.find(item => item.trackId === beat.id);
  const isInCart = !!licenseInCart;

  // Memoize the mapped list to avoid re-mapping on every render/click
  const mappedFullList = useMemo(() => {
    // Add a check to ensure fullTrackList is an array before mapping
    const isListArray = Array.isArray(fullTrackList);
    if (!isListArray) {
      console.error("TrackCard received invalid fullTrackList prop:", fullTrackList); // Add logging
      return []; // Return empty array if prop is not valid
    }
    return fullTrackList.map((b, itemIndex) => {
        if (!b) {
            // Decide how to handle invalid item: skip, return default, etc.
            // Returning a default structure to prevent crash, but logs error.
            return { id: `invalid-${itemIndex}`, title: 'Invalid Item', artist: 'Error', audioSrc: '', coverImage: '', url: '' };
        }
        return {
             id: b.id,
             title: b.title,
             artist: b.producerName,
             audioSrc: b.audioSrc || '', // Ensure audioSrc exists and provide fallback
             coverImage: b.imageUrl,
             url: b.beatUrl,
        };
    });
  }, [fullTrackList]); // Removed beat.id as it's not directly used in the mapping

  // --- Consistent isInCart check: Check if the SINGLE license (if applicable) is in cart ---
  // This helps if we only allow removing the single license type from the card
  const isSingleLicenseInCart = useMemo(() => {
      if (!singleLicense) return false;
      return items.some(item => item.trackId === beat.id && item.licenseId === singleLicense.id);
  }, [items, beat.id, singleLicense]);

  // Determine overall cart status (any license for this track)
  // Used to potentially disable adding if *any* version is already added,
  // preventing confusion if user tries to add while modal/panel should be used.
  const isAnyLicenseInCart = useMemo(() => {
      return items.some(item => item.trackId === beat.id);
  }, [items, beat.id]);

  // --- Event Handlers ---

  const handlePlayPause = useCallback((e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent triggering card click

      if (isCurrentlyPlaying) {
          togglePlay(); // Pause the currently playing track
      } else {
           // Check if the clicked beat is the one currently loaded (but paused)
           if (currentTrack?.id === beat.id) {
               togglePlay(); // Resume the paused current track
           } else {
               // Otherwise, play this track (it's either new or different)
               if (beat.audioSrc) {
                   // Map current beat to PlayerTrack format
                   const trackData: PlayerTrack = {
                       id: beat.id,
                       title: beat.title,
                       artist: beat.producerName,
                       audioSrc: beat.audioSrc, // Pass the existing audioSrc
                       coverImage: beat.imageUrl,
                       url: beat.beatUrl,
                   };

                    // Call the store action to load and play this track from the list
                    playTrackFromList(trackData, mappedFullList, index);
               } else {
                   toast.error('No audio preview available for this beat.');
               }
           }
      }
      // TODO: Track PostHog event: track_preview_played
  }, [isCurrentlyPlaying, currentTrack, beat, togglePlay, playTrackFromList, mappedFullList, index]);

  const handleCartActionClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();

      if (isInCart && licenseInCart) {
          removeItem(String(licenseInCart.trackId), licenseInCart.licenseId); // Pass trackId as string
      } else if (hasMultipleLicenses) {
          setIsLicenseModalOpen(true);
      } else if (singleLicense) {
           // Ensure price is converted to number before using
          const priceNumber = Number(singleLicense.price || 0);
          const cartItem: CartItem = {
              trackId: String(beat.id), // Ensure trackId is string
              licenseId: singleLicense.id,
              trackTitle: beat.title,
              producerName: beat.producerName,
              price: Math.round(priceNumber * 100), // Ensure price is number before multiplying
              imageUrl: beat.imageUrl,
              licenseName: singleLicense.name,
          };
          addItem(cartItem);
          toast.success(`License added to cart: ${singleLicense.name}`);
          // TODO: Track PostHog event: license_added_from_modal
          setIsLicenseModalOpen(false); // Close the modal
      } else {
          toast.error("No licenses available for this track.");
      }
  }, [isInCart, licenseInCart, removeItem, addItem, hasMultipleLicenses, singleLicense, beat.id, beat.title, beat.producerName, beat.imageUrl]);

  // Handler for opening the slide-out panel
  const handleOpenSlideOut = useCallback(() => {
      // Ensure beat.id is a string, as expected by the store/panel
      const beatIdString = String(beat.id); // Ensure it's a string
      if (beatIdString.length > 0) {
          openSlideOut(beatIdString);
      } else {
          toast.error("Could not load beat details. Invalid ID.");
      }
  }, [beat.id, openSlideOut]);

  const imageSrc = beat.imageUrl || 'https://via.placeholder.com/400x400/cccccc/9ca3af?text=No+Image'; // Use lighter placeholder for light mode potentially

  // TODO: Track PostHog event: favorite_added / favorite_removed
  const handleFavoriteClick = useCallback(() => {
      // Implementation of handleFavoriteClick
  }, [beat.id]); // Add dependencies if needed

  // Handler for when a license is selected *within* the modal
  const handleLicenseSelectInModal = useCallback((license: License) => {
      const priceNumber = Number(license.price || 0);
      const cartItem: CartItem = {
          trackId: String(beat.id),
          licenseId: license.id,
          name: beat.title,
          artist: beat.producerName,
          imageUrl: beat.imageUrl,
          price: priceNumber, // Store price in cents if store expects that, otherwise already divided
          licenseName: license.name,
      };
      addItem(cartItem);
      toast.success(`License added to cart: ${license.name}`);
      // TODO: Track PostHog event: license_added_from_modal
      setIsLicenseModalOpen(false); // Close the modal
  }, [addItem, beat.id, beat.title, beat.producerName, beat.imageUrl]);

  // --- Component Rendering ---
  if (isLoading) { // <-- Use the passed isLoading prop
    return (
      <TrackCardSkeleton />
    );
  }

  return (
    <>
    <div
      onClick={handleOpenSlideOut} // Add onClick handler here
      className={cn(
          // Use themed background and border
          "beat-card rounded-xl overflow-hidden group cursor-pointer", // Add cursor-pointer
          "bg-card border border-border hover:border-primary/20", // Base card style
          // "bg-gradient-to-br from-white/5 to-white/[.02]", // Remove old gradient
          "transition-all duration-300 ease-in-out shadow-md hover:shadow-lg hover:shadow-primary/10", // Consistent shadow
          "hover:!scale-[1.02] transform-gpu will-change-transform",
          className
      )}>
      {/* Use themed background for image area */}
      <div className="aspect-square relative overflow-hidden bg-secondary/30">
        {isImageLoading && (
            <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
        )}
        <Image
          src={imageSrc}
          alt={`${beat.title} cover art`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isImageLoading ? "opacity-0" : "opacity-70 group-hover:opacity-100" // Fade in image, keep hover effect
          )}
          // unoptimized // Keep or remove based on image source/optimization needs
          priority={index < 3} // Add priority to first few images for LCP
          onLoad={() => setIsImageLoading(false)} // Set loading false when image loads
          onError={() => setIsImageLoading(false)} // Also set false on error to remove skeleton
        />
        {/* Play button overlay - Use themed background */}
        <div className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/30 dark:bg-black/50 transition-opacity duration-300",
            isImageLoading ? "opacity-0" : "opacity-0 group-hover:opacity-100"
        )}>
          <button
            onClick={handlePlayPause}
            disabled={!beat.audioSrc}
            className={cn(
                // Use themed button colors
                "play-button w-14 h-14 rounded-full bg-background/60 dark:bg-white/20 backdrop-blur-sm flex items-center justify-center",
                "transform scale-75 group-hover:scale-100 transition-transform duration-300",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-75",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background/50"
            )}
            aria-label={
                isThisTrackLoading ? `Loading ${beat.title}` :
                isCurrentlyPlaying ? `Pause ${beat.title}` :
                `Play preview of ${beat.title}`
            }
           >
             {/* Conditional Icon - Use themed text color */}
             {isThisTrackLoading ? (
                 <Loader2 size={24} className="text-foreground animate-spin" />
             ) : isCurrentlyPlaying ? (
                 <Pause size={24} className="text-foreground fill-foreground" />
             ) : (
                 <Play size={24} className="text-foreground fill-foreground ml-1" />
             )}
          </button>
        </div>
      </div>
      {/* Use themed padding and background for info area */}
      <div className="p-4 bg-card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div
                // Optionally make title clickable for slideout too, though card click handles it
                // onClick={(e) => { e.stopPropagation(); handleOpenSlideOut(); }}
                className="block group/link rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
             >
                <h3 className="text-base font-medium text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                    {beat.title}
                </h3>
            </div>
            {beat.producerProfileUrl ? (
              <Link
                href={beat.producerProfileUrl}
                onClick={(e) => e.stopPropagation()} // Prevent card click when clicking producer link
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-block mt-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              >
                {beat.producerName}
              </Link>
            ) : (
                // Use themed text color
               <p className="text-sm text-muted-foreground truncate">{beat.producerName}</p>
            )}
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex-shrink-0 h-8 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all duration-200 transform active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-black/50",
                isInCart
                  ? 'text-red-400 hover:bg-red-900/50' // Style for remove action
                  : 'text-gray-400 hover:bg-indigo-600/20 hover:text-white' // Style for add action
              )}
              onClick={handleCartActionClick}
              aria-label={isInCart ? `Remove ${beat.title} from cart` : `Add ${beat.title} to cart for ${formattedLowestPrice}`}
            >
              {isInCart ? <MinusCircle size={16} /> : <ShoppingCart size={16} />}
              <span className="text-xs whitespace-nowrap">
                {isInCart ? 'Remove' : formattedLowestPrice}
              </span>
            </Button>

            {/* Use themed text color for BPM/Key */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {beat.bpm &&
                <span className="flex items-center gap-1">
                     {/* Use themed icon color */}
                    <Clock size={12} className="text-muted-foreground/70" />
                    {beat.bpm} BPM
                </span>
              }
              {beat.bpm && beat.key && <span className="opacity-50">•</span>}
              {beat.key &&
                <span className="flex items-center gap-1">
                     {/* Use themed icon color */}
                    <Music size={12} className="text-muted-foreground/70"/>
                    {beat.key}
                </span>
              }
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* License Modal (Conditionally Rendered outside the main card div) */}
    {hasMultipleLicenses && (
      <LicenseModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        beat={beat} // Pass the beat data
        onLicenseSelect={handleLicenseSelectInModal} // Pass the handler
      />
    )}
    </>
  );
}
