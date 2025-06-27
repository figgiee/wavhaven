'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleLike } from '@/server-actions/interactionActions';
import { toast } from 'sonner';

interface LikeButtonProps {
    trackId: string;
    initialIsLiked: boolean;
    initialLikeCount: number;
    size?: 'sm' | 'md' | 'lg';
    showCount?: boolean;
    className?: string;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
    trackId,
    initialIsLiked,
    initialLikeCount,
    size = 'md',
    showCount = true,
    className = ""
}) => {
    const { userId, isSignedIn } = useAuth();
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [isLiking, startTransition] = useTransition();

    // Sync state if initial props change
    useEffect(() => {
        setIsLiked(initialIsLiked);
        setLikeCount(initialLikeCount);
    }, [initialIsLiked, initialLikeCount]);

    const handleLikeClick = () => {
        if (isLiking) return;

        if (!isSignedIn) {
            toast.error("Please sign in to like tracks.");
            return;
        }

        // Optimistic update
        const previousIsLiked = isLiked;
        const previousLikeCount = likeCount;
        
        setIsLiked(!previousIsLiked);
        setLikeCount(prev => previousIsLiked ? prev - 1 : prev + 1);

        startTransition(async () => {
            try {
                const result = await toggleLike(trackId);

                if (!result.success) {
                    console.error("Toggle like failed:", result.error);
                    toast.error(result.error || 'Failed to update like status.');
                    setIsLiked(previousIsLiked);
                    setLikeCount(previousLikeCount);
                } else {
                    console.log('Toggle like successful:', result);
                    if (result.isLiked !== undefined && result.newLikeCount !== undefined) {
                        setIsLiked(result.isLiked);
                        setLikeCount(result.newLikeCount);
                    }
                    toast.success(result.isLiked ? 'Added to favorites' : 'Removed from favorites');
                }
            } catch (error) {
                console.error("Error calling toggleLike action:", error);
                toast.error('An unexpected error occurred.');
                setIsLiked(previousIsLiked);
                setLikeCount(previousLikeCount);
            }
        });
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return {
                    button: 'h-8 px-2',
                    icon: 'w-4 h-4',
                    text: 'text-sm'
                };
            case 'lg':
                return {
                    button: 'h-12 px-4',
                    icon: 'w-6 h-6',
                    text: 'text-lg'
                };
            default:
                return {
                    button: 'h-10 px-3',
                    icon: 'w-5 h-5',
                    text: 'text-base'
                };
        }
    };

    const sizeClasses = getSizeClasses();

    return (
        <Button
            variant="outline"
            onClick={handleLikeClick}
            disabled={isLiking}
            className={cn(
                "flex items-center gap-2 transition-all duration-200",
                sizeClasses.button,
                isLiked 
                    ? "bg-pink-500/10 border-pink-500 text-pink-500 hover:bg-pink-500/20" 
                    : "hover:bg-pink-500/10 hover:border-pink-500 hover:text-pink-500",
                className
            )}
            aria-label={isLiked ? "Unlike track" : "Like track"}
        >
            <Heart 
                className={cn(
                    sizeClasses.icon,
                    "transition-all duration-200"
                )}
                fill={isLiked ? "currentColor" : "none"}
            />
            {showCount && (
                <span className={cn(sizeClasses.text, "font-medium")}>
                    {likeCount}
                </span>
            )}
        </Button>
    );
}; 