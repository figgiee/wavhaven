import { Skeleton } from "@/components/ui/skeleton"; // <-- Import Skeleton
import { cn } from '@/lib/utils';

export function TrackCardSkeleton({ displayMode = 'grid', variant = 'default', className }: { displayMode?: 'grid' | 'list', variant?: string, className?: string }) {
    const isListItem = displayMode === 'list' || variant === 'listitem';
    return (
        // Use themed background and border for consistency
        <div className={cn("track-card-skeleton rounded-xl overflow-hidden bg-card border border-[hsl(var(--border))]", className)}>
            <div className={cn("flex", isListItem ? "flex-row items-center p-2.5 gap-3 h-24" : "flex-col p-3")}>
                <Skeleton className={cn(
                    "aspect-square group",
                    isListItem ? "rounded-none" : "rounded-none"
                )} />
                <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex justify-between items-center gap-2 pt-2">
                        <Skeleton className="h-8 w-16 rounded-md" /> {/* Placeholder for price/button */}
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-10" />
                            <Skeleton className="h-4 w-10" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}