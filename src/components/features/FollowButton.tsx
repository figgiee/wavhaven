'use client';

import React, { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { toggleFollow } from '@/server-actions/socialActions';
import { UserPlus, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
    targetUserId: string;
    isInitiallyFollowing: boolean;
}

export function FollowButton({ targetUserId, isInitiallyFollowing }: FollowButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [isFollowing, setIsFollowing] = React.useState(isInitiallyFollowing);

    const handleFollowClick = () => {
        startTransition(async () => {
            // Optimistic update
            setIsFollowing(current => !current);

            const result = await toggleFollow({ targetUserId });

            if (!result.success) {
                // Revert on failure
                setIsFollowing(current => !current);
                toast.error("An error occurred", { description: result.error });
            }
        });
    };
    
    return (
        <Button
            onClick={handleFollowClick}
            disabled={isPending}
            variant={isFollowing ? 'secondary' : 'default'}
            className="min-w-[120px]"
        >
            {isFollowing ? (
                <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Following
                </>
            ) : (
                <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Follow
                </>
            )}
        </Button>
    );
} 