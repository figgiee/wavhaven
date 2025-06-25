'use client';

import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { AlertMessage } from "./AlertMessage";
import { BeatOverviewSection } from './BeatOverview/BeatOverviewSection';
import { PricingSection } from './Pricing/PricingSection';
import { SimilarBeatsSection } from './SimilarBeats/SimilarBeatsSection';
import { CommentsSection } from './Comments/CommentsSection';
import type { AdaptedBeatData } from '@/types';

// Simple Skeleton for the panel content
const PanelSkeleton = () => (
  <div className="space-y-6 p-6">
    {/* Overview Skeleton */}
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <Skeleton className="h-36 w-36 sm:h-48 sm:w-48 rounded-md flex-shrink-0" />
      <div className="space-y-3 flex-grow w-full">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex space-x-3 pt-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-12" />
        </div>
      </div>
    </div>
    <Skeleton className="h-1 w-full bg-gray-700" /> {/* Separator */}
    <div className="space-y-3">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
    </div>

    {/* Pricing Skeleton */}
    <div className="space-y-3 pt-4">
      <Skeleton className="h-6 w-1/3 mb-3" />
      <Skeleton className="h-12 w-full rounded" />
      <Skeleton className="h-12 w-full rounded" />
    </div>

    {/* Similar Beats Skeleton */}
    <div className="space-y-3 pt-4">
      <Skeleton className="h-6 w-1/3 mb-3" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-40 w-full rounded" />
        <Skeleton className="h-40 w-full rounded" />
      </div>
    </div>
  </div>
);

interface SlideOutPanelContentProps {
  isLoading: boolean;
  error: string | null;
  currentBeatData: AdaptedBeatData | null;
  isSlideOutOpen: boolean;
  currentSlideOutBeatId: string | null;
}

export const SlideOutPanelContent: React.FC<SlideOutPanelContentProps> = ({
  isLoading,
  error,
  currentBeatData,
  isSlideOutOpen,
  currentSlideOutBeatId,
}) => {
  // Determine body content based on state
  if (isLoading) {
    return <PanelSkeleton />;
  }

  if (error) {
    return (
      <AlertMessage 
        variant="error" 
        title="Error Loading Beat" 
        message={error} 
        className="m-6" 
      />
    );
  }

  if (currentBeatData) {
    return (
      <>
        <BeatOverviewSection beat={currentBeatData} />
        <PricingSection beat={currentBeatData} />
        <CommentsSection beatId={currentBeatData.id.toString()} />
        <SimilarBeatsSection currentBeatId={currentBeatData.id.toString()} />
      </>
    );
  }

  if (isSlideOutOpen && !currentSlideOutBeatId) {
    // Handle the case where the panel is open but no ID is set
    return (
      <AlertMessage 
        variant="info" 
        title="No Beat Selected" 
        message="Please select a beat to view details." 
        className="m-6" 
      />
    );
  }

  // Default state when closed or initializing (should not be visible)
  return null;
}; 