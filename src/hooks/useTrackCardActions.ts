'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { usePlayerStore } from '@/stores/use-player-store';
import { useCartStore, CartItem } from '@/stores/useCartStore';
import { useUIStore } from '@/stores/use-ui-store';
import { usePostHog } from 'posthog-js/react';
import type { Beat, PlayerTrack } from '@/types';

interface UseTrackCardActionsProps {
  beat: Beat;
  fullTrackList: Beat[];
  index: number;
}

export const useTrackCardActions = ({ beat, fullTrackList, index }: UseTrackCardActionsProps) => {
  const [isFavorited, setIsFavorited] = useState(false); // Placeholder state
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
  const openSlideOut = useUIStore((state) => state.openSlideOut);

  // Derived states
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
  const isInCart = !!licenseInCart;

  // Map full track list for player
  const mappedFullList = useMemo(() => {
    const isListArray = Array.isArray(fullTrackList);
    if (!isListArray) {
      console.error("TrackCard received invalid fullTrackList prop:", fullTrackList);
      return [];
    }
    return fullTrackList.map((b, itemIndex): PlayerTrack => {
      if (!b) {
        return { 
          id: `invalid-${itemIndex}`, 
          title: 'Invalid Item', 
          artist: 'Error', 
          audioSrc: '', 
          coverImage: '', 
          url: '' 
        };
      }
      return {
        id: String(b.id),
        title: b.title,
        artist: b.producerName,
        audioSrc: b.audioSrc || '',
        coverImage: b.imageUrl ?? undefined,
        url: b.beatUrl,
      };
    });
  }, [fullTrackList]);

  // URLs
  const beatPageUrl = beat.beatUrl || `/track/${beat.slug || beat.id}`;
  const producerProfileUrl = beat.producerName ? `/u/${beat.producerName}` : '#';

  // Update optimistic state based on actual cart state
  useEffect(() => {
    setIsOptimisticallyInCart(isInCart);
  }, [isInCart]);

  // Action handlers
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

  const handleLikeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
    toast.info(isFavorited ? 'Removed from favorites' : 'Added to favorites (Feature WIP)');
    posthog?.capture(isFavorited ? 'track_unliked' : 'track_liked', {
      trackId: String(beat.id),
      trackTitle: beat.title,
      origin: 'track-card'
    });
  }, [isFavorited, beat.id, beat.title, posthog]);

  const handleAddToCartFromCard = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOptimisticallyInCart && licenseInCart) {
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
      openSlideOut(String(beat.id), 'pricing');
      posthog?.capture('license_options_viewed', {
        trackId: String(beat.id),
        viewedFrom: 'track-card-cart-icon'
      });
    }
  }, [isOptimisticallyInCart, licenseInCart, availableLicenses, beat, addItem, removeItem, openSlideOut, posthog]);

  const handleCardClick = useCallback(() => {
    openSlideOut(String(beat.id), 'overview');
    posthog?.capture('track_details_viewed', {
      trackId: String(beat.id),
      openedFrom: 'track-card'
    });
  }, [beat, openSlideOut, posthog]);

  return {
    // States
    isFavorited,
    isOptimisticallyInCart,
    isCurrentTrackPlaying,
    isThisTrackLoading,
    
    // Computed values
    availableLicenses,
    cheapestLicense,
    licenseInCart,
    isInCart,
    beatPageUrl,
    producerProfileUrl,
    
    // Action handlers
    handlePlayPauseClick,
    handleLikeClick,
    handleAddToCartFromCard,
    handleCardClick,
  };
}; 