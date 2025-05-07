'use client';

import React, { useState, Suspense, useEffect, use } from 'react';
import { getTrackBySlug } from "@/server-actions/trackActions";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { TrackLicenseClientWrapper } from '@/components/track/TrackLicenseClientWrapper';
import TrackDetailSkeleton from '@/components/track/TrackDetailSkeleton';
import type { TrackDetails } from '@/server-actions/trackActions';
import { Music } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TrackSidebar } from './_components/TrackSidebar';

// TODO: Add error handling UI for fetchError more gracefully
// TODO: Consider Suspense boundary if loading takes time

type Props = {
  params: { slug: string };
};

export default function TrackPage({ params: paramsProp }: Props) {
  // Resolve the params promise using React.use()
  const params = use(paramsProp);
  
  // State for track data and loading/error
  const [track, setTrack] = useState<TrackDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for selected license ID - lifted up
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | undefined>();

  useEffect(() => {
    async function loadData() {
      try {
        // Now use the resolved params object
        console.log(`[TrackPage Client] Fetching track data for: ${params.slug}`);
        const fetchedTrack = await getTrackBySlug(params.slug);
        console.log(`[TrackPage Client] Received track data: ${fetchedTrack ? 'Found' : 'Not Found'}`);
        if (!fetchedTrack) {
          setError("Track not found.");
        } else {
          setTrack(fetchedTrack);
          if (fetchedTrack.licenses && fetchedTrack.licenses.length > 0) {
              const firstLicenseId = fetchedTrack.licenses[0].id;
              console.log(`[TrackPage Client] Setting default selected license ID: ${firstLicenseId}`);
              setSelectedLicenseId(firstLicenseId); 
          }
        }
      } catch (err) {
        console.error("[TrackPage Client] Error fetching track:", err);
        setError("Failed to load track details.");
      } finally {
        setIsLoading(false);
      }
    }
    // Use the resolved params.slug in the dependency array
    if (params.slug) {
        loadData();
    }
  }, [params.slug]); // Re-fetch if slug changes

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 pt-8 pb-8 md:pt-12 md:pb-12">
         <TrackDetailSkeleton />
      </div>
    );
  }

  if (error) {
     return (
      <div className="container mx-auto px-4 pt-8 pb-8 md:pt-12 md:pb-12">
         <p className="text-center text-destructive">{error}</p>
         {/* Optionally add a link back or retry button */}
      </div>
    );
  }

  // Should have track data by now if no error
  if (!track) {
    // This case might occur if fetch completed but track was null (e.g., notFound was called server-side conceptually)
     return (
      <div className="container mx-auto px-4 pt-8 pb-8 md:pt-12 md:pb-12">
         <p className="text-center text-muted-foreground">Track could not be loaded.</p>
      </div>
    );
  }

  console.log(`[TrackPage Client] Rendering page for track: ${track.title}, selectedLicenseId: ${selectedLicenseId}`);

  return (
    <div className="container mx-auto px-4 pt-8 pb-8 md:pt-12 md:pb-12">
      {/* Main Layout: Flex container for Sidebar + Main Content */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-12 lg:gap-16">

        {/* --- Pass selectedLicenseId to TrackSidebar --- */}
        <TrackSidebar track={track} selectedLicenseId={selectedLicenseId} />
        {/* --- End Left Sidebar --- */}

        {/* --- Right Main Content Area --- */}
        <div className="w-full md:flex-1">
          <div className="flex flex-col gap-8"> 
            {/* Licensing Section */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">Purchase a License</CardTitle>
              </CardHeader>
              <CardContent>
                <TrackLicenseClientWrapper
                  producerName={track.producer?.username || "Unknown Producer"}
                  licenses={track.licenses}
                  trackId={track.id}
                  trackTitle={track.title}
                  imageUrl={track.coverImageUrl ?? undefined}
                  selectedLicenseId={selectedLicenseId}
                  onLicenseChange={setSelectedLicenseId}
                />
              </CardContent>
            </Card>

            {/* Placeholder for Usage Terms (could be linked to selected license) */}
            {/* Placeholder for "More From Artist" Carousel */}
            {/* Placeholder for Comments Section */}

          </div>
        </div>
        {/* --- End Right Main Content Area --- */}
      </div>
    </div>
  );
} 