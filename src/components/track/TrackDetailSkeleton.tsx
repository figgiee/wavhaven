import { Skeleton } from "@/components/ui/skeleton";

export default function TrackDetailSkeleton() {
  return (
    // Adjust Skeleton Container Padding (already matches page.tsx)
    <div className="container mx-auto px-4 py-12 md:py-16 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
        {/* Image Column Skeleton */}
        <div className="lg:col-span-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
        </div>
        {/* Details Column Skeleton */}
        <div className="lg:col-span-3 flex flex-col space-y-6 md:space-y-8">
          {/* Title/Artist Skeleton */}
          <div>
            <Skeleton className="h-10 w-3/4 mb-2 rounded" />
            <Skeleton className="h-6 w-1/2 rounded" />
          </div>
          {/* Badges Skeleton */}
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          {/* Description Skeleton */}
          <div className="space-y-3">
              <Skeleton className="h-5 w-1/4 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-5/6 rounded" />
          </div>
           {/* License Skeleton */}
           <div className="space-y-3">
               <Skeleton className="h-5 w-1/3 rounded" />
               <Skeleton className="h-16 w-full rounded" />
               <Skeleton className="h-16 w-full rounded" />
               <Skeleton className="h-10 w-full rounded-lg mt-2" />
           </div>
        </div>
      </div>
    </div>
  );
} 