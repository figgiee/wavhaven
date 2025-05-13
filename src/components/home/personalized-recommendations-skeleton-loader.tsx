import { TrackCardSkeleton } from '@/components/track-card-skeleton';

export function PersonalizedRecommendationsSkeletonLoader() {
  return (
    <section className="py-24 sm:py-32 relative">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          {/* Placeholder for title */}
          <div className="h-8 w-64 bg-muted rounded animate-pulse">Personalized For You</div>
          {/* Placeholder for view all link */}
          <div className="h-6 w-20 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Placeholder for beat cards, e.g., 6 of them */}
          {Array.from({ length: 6 }).map((_, i) => <TrackCardSkeleton key={i} />)}
        </div>
      </div>
    </section>
  );
} 