import { getFeaturedTracks } from '@/server-actions/trackActions';
import type { TrackSearchResult } from '@/types';
// We will need to export FeaturedBeatsSectionClient from app/page.tsx or move it here.
// For now, assuming it will be exported from app/page.tsx or moved.
// This import path might need adjustment.
import { FeaturedBeatsSectionClient } from './featured-beats-section-client'; // Updated import path

export async function FeaturedBeatsDataFetcher() {
  let tracks: TrackSearchResult[] = [];
  let error: string | null = null;
  try {
    tracks = await getFeaturedTracks(8);
  } catch (err) {
    console.error("Failed to fetch featured beats for client component:", err);
    error = err instanceof Error ? err.message : "Failed to load featured beats.";
  }
  return <FeaturedBeatsSectionClient initialTracks={tracks} error={error} />;
} 