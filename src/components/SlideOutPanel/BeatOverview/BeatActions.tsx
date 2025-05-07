import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  HeartIcon,
  PlusIcon,
  ShareIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils';
import { toggleLike } from '@/server-actions/interactionActions';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';

interface BeatActionsProps {
  likes: number;
  commentCount: number;
  beatId: string | number;
  title: string;
  producerName: string; // Used for find similar query?
  beatUrl: string; // For sharing
  initialIsLiked: boolean; // Pass initial state if known
  // TODO: Add handlers from props later
  // onLikeToggle: (beatId: string | number, isLiked: boolean) => void;
  // onAddToPlaylist: (beatId: string | number) => void;
  // onShare: (beatUrl: string) => void;
  // onFindSimilar: (producerName: string, beatId: string | number) => void;
  className?: string;
}

export const BeatActions: React.FC<BeatActionsProps> = ({
  likes,
  commentCount,
  beatId,
  title,
  producerName,
  beatUrl,
  initialIsLiked,
  className,
}) => {
  const { userId } = useAuth();
  const router = useRouter();

  // State for optimistic updates
  const [optimisticIsLiked, setOptimisticIsLiked] = useState(initialIsLiked);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(likes);
  const [isLiking, setIsLiking] = useState(false);

  // Sync state if initial props change (e.g., navigating between beats in panel)
  useEffect(() => {
    setOptimisticIsLiked(initialIsLiked);
    setOptimisticLikeCount(likes);
  }, [initialIsLiked, likes]);

  const handleLikeClick = async () => {
    if (isLiking) return;

    if (!userId) {
        toast.error("Please sign in to like beats.");
        return;
    }

    const currentTrackId = String(beatId);

    // --- Optimistic Update --- 
    const previousIsLiked = optimisticIsLiked;
    const previousLikeCount = optimisticLikeCount;
    
    setOptimisticIsLiked(!previousIsLiked);
    setOptimisticLikeCount(prev => previousIsLiked ? prev - 1 : prev + 1);
    setIsLiking(true);
    // ------------------------

    try {
        const result = await toggleLike(currentTrackId);

        if (!result.success) {
            console.error("Toggle like failed:", result.error);
            toast.error(result.error || 'Failed to update like status.');
            setOptimisticIsLiked(previousIsLiked);
            setOptimisticLikeCount(previousLikeCount);
        } else {
            console.log('Toggle like successful:', result);
            if (result.isLiked !== undefined && result.newLikeCount !== undefined) {
                setOptimisticIsLiked(result.isLiked);
                setOptimisticLikeCount(result.newLikeCount);
            }
        }
    } catch (error) {
        console.error("Error calling toggleLike action:", error);
        toast.error('An unexpected error occurred.');
        setOptimisticIsLiked(previousIsLiked);
        setOptimisticLikeCount(previousLikeCount);
    } finally {
        setIsLiking(false);
    }
  };

  const handleAddToPlaylistClick = () => {
    console.log(`Add beat ${beatId} to playlist`);
    toast.info('Add to playlist functionality not yet implemented.');
    // TODO: Implement Add to Playlist logic (e.g., open modal, call action)
  };

  const handleShareClick = async () => {
    // Construct the full URL to share
    // Ensure this uses the correct base URL of your deployed site
    const fullBeatUrl = `${window.location.origin}${beatUrl}`;
    const shareData = {
      title: `Check out this beat: ${title}`,
      text: `${title} by ${producerName} on Wavhaven`,
      url: fullBeatUrl,
    };

    try {
      if (navigator.share) {
        // Use Web Share API if available
        await navigator.share(shareData);
        console.log('Beat shared successfully via Web Share API');
        // toast.success('Shared successfully!'); // Optional: Toast on successful share
      } else {
        // Fallback: Copy URL to clipboard
        await navigator.clipboard.writeText(fullBeatUrl);
        console.log('Beat URL copied to clipboard');
        toast.success('Beat URL copied to clipboard!');
      }
    } catch (error) {
      // Handle errors (e.g., user cancelling share, clipboard access denied)
      console.error('Error sharing beat:', error);
      if (error instanceof Error && error.name !== 'AbortError') { // Don't show error if user simply cancelled
         toast.error('Could not share beat.');
      }
    }
  };

  const handleFindSimilarClick = () => {
    // Construct search URL (similar logic to SimilarBeatsSection)
    // You might want to refine the query parameters based on your search page capabilities
    const similarSearchUrl = `/search?similarTo=${String(beatId)}&producer=${encodeURIComponent(producerName)}`;
    console.log(`Navigating to find similar: ${similarSearchUrl}`);
    router.push(similarSearchUrl);
    // Optional: Close slide-out panel after navigation?
    // const closeSlideOut = useUIStore.getState().closeSlideOut; // Get action if needed
    // closeSlideOut();
  };

  const handleCommentsClick = () => {
    console.log(`Scroll to comments for beat ${beatId}`);
    // TODO: Implement scroll logic or open comments modal/section
    toast.info('View comments functionality not yet implemented.');
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex items-center justify-center sm:justify-start gap-x-3 text-gray-400 mt-4', className)}>
        {/* Like Button - Use optimistic state */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-1 px-2 hover:text-white disabled:opacity-50"
              onClick={handleLikeClick}
              disabled={isLiking}
              aria-pressed={optimisticIsLiked}
              aria-label={optimisticIsLiked ? "Unlike beat" : "Like beat"}
            >
              {optimisticIsLiked ? (
                <HeartIconSolid className="h-5 w-5 text-red-500" />
              ) : (
                <HeartIcon className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">{optimisticLikeCount}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{optimisticIsLiked ? 'Unlike' : 'Like'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Add to Playlist Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hover:text-white"
              onClick={handleAddToPlaylistClick}
              aria-label="Add to playlist"
            >
              <PlusIcon className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add to playlist</p>
          </TooltipContent>
        </Tooltip>

        {/* Find Similar Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hover:text-white"
              onClick={handleFindSimilarClick}
              aria-label="Find similar beats"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Find similar</p>
          </TooltipContent>
        </Tooltip>

        {/* Share Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hover:text-white"
              onClick={handleShareClick}
              aria-label="Share beat"
            >
              <ShareIcon className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Share</p>
          </TooltipContent>
        </Tooltip>

        {/* Comment Count/Link */}
        <Tooltip>
          <TooltipTrigger asChild>
             <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-1 px-2 hover:text-white"
                onClick={handleCommentsClick}
                aria-label={`View comments (${commentCount})`}
              >
                  <ChatBubbleLeftIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">{commentCount}</span>
              </Button>
            </TooltipTrigger>
          <TooltipContent>
            <p>View comments</p>
          </TooltipContent>
        </Tooltip>

      </div>
    </TooltipProvider>
  );
}; 