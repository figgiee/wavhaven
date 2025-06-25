import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SlideOutTrackCardAdapter } from './SlideOutTrackCardAdapter';
import { getSimilarTracks, SimilarTrackCardData } from '@/server-actions/tracks/trackQueries';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from '@/components/ui/button';
import { Skeleton } from "@/components/ui/skeleton";
import { AlertMessage } from "../AlertMessage";

// Skeleton for the similar beats grid
const SimilarBeatsSkeleton = () => (
    <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-40 w-full rounded" />
        <Skeleton className="h-40 w-full rounded" />
        <Skeleton className="h-40 w-full rounded" />
        <Skeleton className="h-40 w-full rounded" />
    </div>
);

interface SimilarBeatsSectionProps {
  beatId: string | number;
  producerName: string;
}

export const SimilarBeatsSection: React.FC<SimilarBeatsSectionProps> = ({ beatId, producerName }) => {
  const [similarBeats, setSimilarBeats] = useState<SimilarTrackCardData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentTrackId = String(beatId);

    const loadSimilarBeats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getSimilarTracks({ trackId: currentTrackId, producerName, limit: 4 });
        setSimilarBeats(data);
      } catch (err) {
        console.error("Failed to fetch similar beats:", err);
        setError("Could not load similar beats.");
        setSimilarBeats([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentTrackId && producerName) {
        loadSimilarBeats();
    }

  }, [beatId, producerName]);

  const similarResultsLink = `/search?similarTo=${String(beatId)}&producer=${encodeURIComponent(producerName)}`;

  return (
    <Card className="bg-gray-800 border-gray-700 text-white">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <CardTitle className="text-lg font-medium text-white">Sounds Similar</CardTitle>
        <Button asChild variant="link" size="sm" className="text-purple-300 hover:text-purple-200 px-0">
            <Link href={similarResultsLink}>See more</Link>
        </Button>
      </CardHeader>
      <Separator className="bg-gray-700" />
      <CardContent className="p-6">
        {isLoading && <SimilarBeatsSkeleton />}
        {error && <AlertMessage title="Could Not Load Similar Beats" message={error} />}
        {!isLoading && !error && similarBeats.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {similarBeats.map(beat => (
              <SlideOutTrackCardAdapter key={beat.id} beat={beat} />
            ))}
          </div>
        )}
        {!isLoading && !error && similarBeats.length === 0 && (
          <p className="text-gray-400 text-center py-8">No similar beats found.</p>
        )}
      </CardContent>
    </Card>
  );
}; 
