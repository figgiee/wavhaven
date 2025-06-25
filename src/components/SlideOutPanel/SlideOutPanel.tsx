'use client'; // Add this directive

import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/use-ui-store'; // Import the UI store
import { SlideOutHeader } from './SlideOutHeader';
import { SlideOutBody } from './SlideOutBody';
import { SlideOutPanelContent } from './SlideOutPanelContent';
import type { AdaptedBeatData, FullTrackDetails } from '@/types';
import { cn } from "@/lib/utils";
import { Prisma } from '@prisma/client';

// Import the server action for data fetching
import { getBeatDetails } from '@/server-actions/tracks/trackQueries';

interface SlideOutPanelProps {
    width?: string; // e.g., 'w-full sm:max-w-md md:max-w-lg'
}

// Helper function to adapt FullTrackDetails to AdaptedBeatData
// Ensure this accurately reflects the structure returned by getBeatDetails
// and the structure needed by child components.
const adaptBeatData = (details: FullTrackDetails): AdaptedBeatData => {
    console.log("[adaptBeatData] Adapting data (raw input):", JSON.stringify(details, null, 2)); // Log input to adapter

    if (!details) {
         console.error("[adaptBeatData] Received null details object!");
         // Handle this case gracefully, maybe return a default/error structure
         // For now, let's throw to make it obvious during debugging
         throw new Error("adaptBeatData received null details");
    }

    const parsePrice = (price: any): number => {
        if (price instanceof Prisma.Decimal) {
            return price.toNumber();
        }
        if (typeof price === 'number') {
            return price;
        }
        // Try converting string, handle NaN
        const num = Number(price);
        return isNaN(num) ? 0 : num; // Default to 0 if conversion fails
    };

     console.log("[adaptBeatData] Raw producer object from details:", JSON.stringify(details.producer, null, 2)); // Log the producer object specifically
     // Use username as the primary display name for the producer
     const producerDisplayName = details.producer?.username || 'Unknown Producer';
     // const producerUsername = details.producer?.username ?? null; // Already captured in producerDisplayName if available

    const adapted: AdaptedBeatData = {
        id: details.id,
        title: details.title,
        producer: {
            name: producerDisplayName, // Use the username here
            // Optionally, if AdaptedBeatData's producer type also has a 'username' field and you want to store it separately:
            // username: details.producer?.username ?? undefined, 
        },
        // Ensure artworkUrl comes from the correct field (coverImageUrl or a dedicated artworkUrl)
        artworkUrl: details.coverImageUrl || details.artworkUrl || '/default-artwork.png', // Provide a fallback
        previewAudioUrl: details.previewAudioUrl,
         // Use optional chaining and provide defaults
         duration: details.duration ?? 0,
         packageDiscountAvailable: details.packageDiscountAvailable ?? false,
         url: details.url || `/track/${details.slug || details.id}`, // Construct URL
        // Set likes/comments to 0 since _count is removed from the query
        likes: 0, // details._count?.likes ?? 0,
        commentCount: 0, // details._count?.comments ?? 0,
        initialIsLiked: details.currentUserHasLiked ?? false,
        // Extract genre/moods/tags safely
        genre: /* details.genres?.[0]?.name ?? */ 'Unknown', // Adjust based on how Genre/Mood/Tag are structured
         tempo: details.bpm ?? 0,
         moods: details.moods?.map(mood => mood.name) ?? [], // Map moods to their names
         tags: details.tags?.map(tag => tag.name) ?? [], // Map tags to their names
        // isForSale might depend on whether licenses exist and have prices > 0
        isForSale: !!details.licenses?.some(l => parsePrice(l.price) > 0),
        licenses: (details.licenses ?? []).map((lic) => ({
            id: lic.id,
            name: lic.name || lic.type, // Use type as fallback name
            price: parsePrice(lic.price),
            description: lic.description || '', // Default description
        })),
        description: details.description || null, // Map the description field
    };
     console.log("[adaptBeatData] Resulting adapted data:", adapted); // Log output
    return adapted;
};

export const SlideOutPanel: React.FC<SlideOutPanelProps> = ({ width = 'w-full sm:max-w-md md:max-w-lg' }) => {
    // Get state and actions from Zustand store
    const isSlideOutOpen = useUIStore((state) => state.isSlideOutOpen);
    const currentSlideOutBeatId = useUIStore((state) => state.currentSlideOutBeatId); // This should be string | null
    const closeSlideOut = useUIStore((state) => state.closeSlideOut);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentBeatData, setCurrentBeatData] = useState<AdaptedBeatData | null>(null);

    const panelRef = useRef<HTMLDivElement>(null); // Ref for the panel container
    const overlayRef = useRef<HTMLDivElement>(null); // Ref for the overlay
    const previousFocusRef = useRef<HTMLElement | null>(null); // Ref to store element that had focus before opening

    // Effect for fetching data when beatId changes or panel opens
    useEffect(() => {
        const beatIdToFetch = currentSlideOutBeatId; // Capture ID for this effect run
        console.log(`[Effect Run] isOpen: ${isSlideOutOpen}, currentSlideOutBeatId: ${beatIdToFetch}`);

        // Define the async function *inside* the useEffect hook
        // This avoids needing useCallback for loadBeatData if it's only used here
        const loadBeatData = async (id: string) => {
            if (!id || isLoading) return;
            console.log(`[SlideOutPanel] Fetching details for beatId: ${id}`);
            setIsLoading(true);
            setError(null); // Clear previous errors
            setCurrentBeatData(null); // Clear previous data

            try {
                const details = await getBeatDetails(id);

                if (!details) {
                    // Throw the specific error here based on finding null
                    throw new Error(`Beat details not found or unavailable for ID: ${id}`);
                }

                console.log(`[SlideOutPanel] Received raw details for ${id}:`, details);
                const adapted = adaptBeatData(details); // Ensure adaptBeatData handles the structure correctly
                console.log(`[SlideOutPanel] Adapted data for ${id}:`, adapted);
                setCurrentBeatData(adapted);

            } catch (err: any) { // Catch specific error type if possible
                console.error(`[SlideOutPanel] Error in loadBeatData for ${id}:`, err); // Log the actual error object
                // Set a more informative error message
                setError(err.message || "An unexpected error occurred while loading beat details.");
                setCurrentBeatData(null); // Ensure beat data is cleared on error
            } finally {
                setIsLoading(false);
            }
        };

        // Run the effect ONLY if the panel is open AND there's a valid beatId string
        if (isSlideOutOpen && typeof beatIdToFetch === 'string' && beatIdToFetch.length > 0) {
            console.log('[Effect Condition Met] Calling loadBeatData...');
            loadBeatData(beatIdToFetch);
        } else {
            // If panel is closed or ID is invalid/null, reset state immediately
            // Prevents showing stale data or loading state when not applicable
            console.log('[Effect Condition NOT Met] Resetting state.');
            setIsLoading(false);
            setError(null);
            setCurrentBeatData(null);
        }

        // Dependencies: Run when panel opens/closes or the beatId changes
    }, [isSlideOutOpen, currentSlideOutBeatId]); // Correct dependencies

    // Effect for focus management and Escape key
    useEffect(() => {
        if (isSlideOutOpen) {
            // Store the previously focused element
            previousFocusRef.current = document.activeElement as HTMLElement;

            // Focus the panel or the first focusable element inside it after transition
            const timer = setTimeout(() => {
                // Attempt to focus the close button first, then the panel itself
                const closeButton = panelRef.current?.querySelector('button[aria-label="Close panel"]');
                if (closeButton instanceof HTMLElement) {
                    closeButton.focus();
                } else {
                    panelRef.current?.focus(); // Fallback to panel container
                }
            }, 300); // Match transition duration (adjust if needed)

            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    closeSlideOut();
                    return; // Stop processing if Escape is pressed
                }
                // Basic Tab trapping (can be improved with more robust logic or library)
                if (event.key === 'Tab' && panelRef.current) {
                    const focusableElements = Array.from(
                        panelRef.current.querySelectorAll<HTMLElement>(
                            'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), details:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
                        )
                    ).filter(el => el.offsetParent !== null); // Filter only visible elements

                    if (!focusableElements.length) return;

                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];

                    if (event.shiftKey) {
                        // Shift + Tab
                        if (document.activeElement === firstElement) {
                            lastElement.focus();
                            event.preventDefault();
                        }
                    } else {
                        // Tab
                        if (document.activeElement === lastElement) {
                            firstElement.focus();
                            event.preventDefault();
                        }
                    }
                }
            };

            document.addEventListener('keydown', handleKeyDown);
            return () => {
                clearTimeout(timer);
                document.removeEventListener('keydown', handleKeyDown);
                // Restore focus to the previously focused element when closed
                // Check if the element is still focusable/exists
                if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
                    previousFocusRef.current.focus();
                }
                previousFocusRef.current = null; // Clear ref
            };
        }
    }, [isSlideOutOpen, closeSlideOut]);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Close only if the click is directly on the overlay, not on the panel content
        if (e.target === overlayRef.current) {
            closeSlideOut();
        }
    };

    // Content component handles all conditional rendering logic
    const bodyContent = (
        <SlideOutPanelContent
            isLoading={isLoading}
            error={error}
            currentBeatData={currentBeatData}
            isSlideOutOpen={isSlideOutOpen}
            currentSlideOutBeatId={currentSlideOutBeatId}
        />
    );

    // Use Portal if needed for stacking context, otherwise render inline
    return (
        <>
            {/* Overlay */}
            <div
                ref={overlayRef}
                data-testid="slideout-overlay" // Added data-testid
                className={cn(
                    "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out",
                    isSlideOutOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
                onClick={handleOverlayClick}
                aria-hidden={!isSlideOutOpen}
            />

            {/* Panel Container */}
            <div
                ref={panelRef}
                data-testid="slideout-panel-container" // Added data-testid
                className={cn(
                    "fixed top-0 right-0 h-full bg-background shadow-xl z-50",
                    "transition-transform duration-300 ease-in-out",
                    width, // Apply dynamic width
                    isSlideOutOpen ? 'transform translate-x-0' : 'transform translate-x-full'
                )}
                role="dialog" // Role for accessibility
                aria-modal="true" // Indicates it's a modal dialog
                aria-labelledby="slideout-panel-title" // Link to header title
                aria-hidden={!isSlideOutOpen}
                tabIndex={-1} // Make the panel container focusable
            >
                <SlideOutHeader
                    title={currentBeatData?.title ?? 'Beat Details'} // Dynamic title
                    producerName={currentBeatData?.producer?.name}
                    onClose={closeSlideOut} // Pass the close action
                />
                <SlideOutBody>
                    {bodyContent}
                </SlideOutBody>
            </div>
        </>
    );
};

// Consider adding PropTypes or using TypeScript interfaces for better type safety 
