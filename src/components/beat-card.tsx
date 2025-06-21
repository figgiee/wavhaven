import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Play, Plus, Music, Pause, ShoppingCart, Loader2, Check, Clock, Layers, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming Shadcn UI utils path
import { usePlayerStore } from '@/stores/use-player-store'; // Import Zustand store
import { useCartStore } from '@/stores/use-cart-store'; // Import cart store
import type { CartItem } from '@/stores/use-cart-store'; // Import CartItem type
import type { License } from '@/components/license/license.types'; // Import License type
import { LicenseModal } from '@/components/license/LicenseModal'; // Import LicenseModal
import { toast } from 'sonner'; // Import toast
import { Skeleton } from '@/components/ui/skeleton'; // <-- Import Skeleton

// {/* TODO: Define more specific types, perhaps using Prisma-generated types? */}
interface Beat {
  id: string | number;
  title: string;
  imageUrl?: string; // Make optional if there's a fallback
  producerName: string;
  producerProfileUrl?: string; // Optional link to producer page
  bpm?: number; // Make optional
  key?: string; // Make optional
  audioSrc: string; // Renamed from audioPreviewUrl for consistency with store
  beatUrl?: string; // Link to the beat detail page
  licenses: License[]; // <-- Add licenses array
}

interface BeatCardProps {
  beat: Beat;
  className?: string;
}

export function BeatCard({ beat, className }: BeatCardProps) {
  const [isImageLoading, setIsImageLoading] = useState(true); // <-- State for image loading
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false); // <-- State for modal

  // Get player state and actions from Zustand
  const {
      currentTrack,
      isPlaying,
      isLoading, // <-- Get isLoading state
      playTrack,
      togglePlay,
  } = usePlayerStore();

  // Cart Store Actions & State
  const addItemToCart = useCartStore((state) => state.addItem);
  const removeItemFromCart = useCartStore((state) => state.removeItem);
  const cartItems = useCartStore((state) => state.items);

  const isCurrentlyPlaying = isPlaying && currentTrack?.id === beat.id;
  const isThisTrackLoading = isLoading && currentTrack?.id === beat.id; // <-- Check if THIS track is loading

  // Determine license details
  const availableLicenses = beat.licenses || [];
  const hasMultipleLicenses = availableLicenses.length > 1;
  const singleLicense = availableLicenses.length === 1 ? availableLicenses[0] : null;
  const lowestPrice = availableLicenses.length > 0 
      ? Math.min(...availableLicenses.map(l => l.price))
      : 0;

  // Check if *any* license for this track is in the cart
  const licenseInCart = cartItems.find(cartItem => 
      availableLicenses.some(license => license.id === cartItem.licenseId)
  );
  const isInCart = !!licenseInCart;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    e.preventDefault();

    if (isCurrentlyPlaying) {
        togglePlay(); // Pause the current track
    } else {
         // If this beat has a valid audio source
         if (beat.audioSrc) {
            // Create a track object matching the store's expected type
            const trackToPlay = {
                id: beat.id,
                title: beat.title,
                artist: beat.producerName, // Using producerName as artist here
                audioSrc: beat.audioSrc,
                coverImage: beat.imageUrl,
                url: beat.beatUrl,
            };
             playTrack(trackToPlay); // Play this track (store handles loading state)
         } else {
             console.warn("No audio source available for this beat:", beat.id);
         }
    }
    // TODO: Track PostHog event: track_preview_played
  };

  const handleCartActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isInCart && licenseInCart) {
      // Remove item from cart
      console.log('Removing item with licenseId:', licenseInCart.licenseId);
      removeItemFromCart(licenseInCart.licenseId);
      toast.info(`${beat.title} removed from cart.`);
    } else if (hasMultipleLicenses) {
      // Open the modal
      setIsLicenseModalOpen(true);
    } else if (singleLicense) {
      // Add the single available license directly
      const cartItem: CartItem = {
        id: beat.id,
        licenseId: singleLicense.id,
        title: beat.title,
        artist: beat.producerName,
        price: singleLicense.price,
        imageUrl: beat.imageUrl,
        licenseType: singleLicense.name,
      };
      addItemToCart(cartItem);
      toast.success(`${beat.title} (${singleLicense.name}) added to cart!`);
    } else {
      // No licenses available case
      toast.error("No licenses available for this track.");
      console.error("Attempted to add track with no licenses:", beat.id);
    }
  };

  // Fallback image if imageUrl is not provided
  const imageSrc = beat.imageUrl || 'https://via.placeholder.com/400x400/1f2937/818cf8?text=No+Image';

  return (
    <>
    <div 
      className={cn(
          "beat-card rounded-xl overflow-hidden group bg-gradient-to-br from-white/5 to-white/[.02] border border-transparent hover:border-white/10 transition-all duration-300 ease-in-out shadow-md hover:shadow-indigo-500/10",
          "hover:!scale-[1.02]",
          className
      )}>
      <div className="aspect-square relative overflow-hidden bg-gray-800/50">
        {/* Skeleton shown while image is loading */}
        {isImageLoading && (
            <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
        )}
         {/* Next/Image */}
        <Image 
          src={imageSrc}
          alt={`${beat.title} cover art`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isImageLoading ? "opacity-0" : "opacity-70 group-hover:opacity-100" // Fade in image, keep hover effect
          )}
          unoptimized // Keep or remove based on image source/optimization needs
          onLoad={() => setIsImageLoading(false)} // Set loading false when image loads
          onError={() => setIsImageLoading(false)} // Also set false on error to remove skeleton
        />
        <div className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity duration-300",
            isImageLoading ? "opacity-0" : "opacity-0 group-hover:opacity-100" // Hide overlay until image loaded
        )}>
          <button 
            onClick={handlePlayPause}
            disabled={!beat.audioSrc} // <-- Keep disabled only if no audio source
            className={cn(
                "play-button w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center",
                "transform scale-75 group-hover:scale-100 transition-transform duration-300",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-75", 
                // Remove cursor-not-allowed specifically during loading? No, just don't disable.
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
            )}
            aria-label={
                isThisTrackLoading ? `Loading ${beat.title}` :
                isCurrentlyPlaying ? `Pause ${beat.title}` : 
                `Play preview of ${beat.title}`
            }
           >
             {/* Conditional Icon: Loading > Pause > Play */}
             {isThisTrackLoading ? (
                 <Loader2 size={24} className="text-white animate-spin" /> // <-- Loading Spinner
             ) : isCurrentlyPlaying ? (
                 <Pause size={24} className="text-white fill-white" /> 
             ) : (
                 <Play size={24} className="text-white fill-white ml-1" />
             )}
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Link to beat detail page */}
            <Link 
                href={beat.beatUrl || '#'} 
                className="block group/link rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 focus-visible:ring-offset-black/30"
            >
              <h3 className="text-base font-medium text-white leading-tight truncate group-hover/link:text-indigo-400 transition-colors">
                  {beat.title}
              </h3>
            </Link>
            {/* Optional link to producer profile */}
            {beat.producerProfileUrl ? (
              <Link
                  href={beat.producerProfileUrl}
                  onClick={(e) => e.stopPropagation()} 
                  className="text-sm text-gray-400 truncate hover:text-gray-300 transition-colors inline-block rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 focus-visible:ring-offset-black/30"
              >
                  {beat.producerName}
              </Link>
            ) : (
               <p className="text-sm text-gray-400 truncate">{beat.producerName}</p>
            )}
          </div>
          <div className="flex flex-col items-end space-y-2">
            <button
              onClick={handleCartActionClick}
              disabled={availableLicenses.length === 0}
              className={cn(
                  "flex-shrink-0 h-8 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all duration-200",
                  "transform scale-90 group-hover:scale-100 opacity-70 group-hover:opacity-100",
                  isInCart
                      ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 hover:border-red-500/40"
                      : availableLicenses.length === 0
                          ? "bg-gray-500/10 border border-gray-500/20 cursor-not-allowed text-gray-500"
                          : "bg-white/5 hover:bg-indigo-500/20 border border-transparent hover:border-indigo-500/10 text-gray-300",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 focus-visible:ring-offset-black/30"
              )}
              aria-label={
                  isInCart ? `Remove ${beat.title} from cart` :
                  hasMultipleLicenses ? `View licenses for ${beat.title}` : 
                  singleLicense ? `Add ${beat.title} (${singleLicense.name}) to cart` : 
                  `No licenses available for ${beat.title}`
              }
            >
              {isInCart ? (
                <MinusCircle size={14} className="text-red-400" />
              ) : hasMultipleLicenses ? (
                <Layers size={14} className="text-white/70 group-hover:text-white" />
              ) : availableLicenses.length === 0 ? (
                <ShoppingCart size={14} className="text-gray-500" />
              ) : (
                <ShoppingCart size={14} className="text-white/70 group-hover:text-white" />
              )}
              <span className={cn(
                  "font-medium text-sm",
                  isInCart ? "text-red-400" :
                  availableLicenses.length === 0 ? "text-gray-500" : 
                  "text-gray-300"
              )}>
                {isInCart ? 'Remove' : 
                 availableLicenses.length === 0 ? 'N/A' : 
                 hasMultipleLicenses ? `From $${lowestPrice.toFixed(2)}` : 
                 `$${lowestPrice.toFixed(2)}`}
              </span>
            </button>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {beat.bpm && 
                <span className="flex items-center gap-1">
                    <Clock size={12} className="text-gray-500" />
                    {beat.bpm} BPM
                </span>
              }
              {beat.bpm && beat.key && <span className="opacity-50">•</span>}
              {beat.key && 
                <span className="flex items-center gap-1">
                    <Music size={12} className="text-gray-500"/> 
                    {beat.key}
                </span>
              }
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Render License Modal */} 
    <LicenseModal 
        trackId={beat.id}
        trackTitle={beat.title}
        trackArtist={beat.producerName}
        trackImageUrl={beat.imageUrl}
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
    />
    </>
  );
} 