import TrackCard from './TrackCard';
import type { TrackSearchResult } from '@/server-actions/trackActions'; // Use the specific type

interface TrackGridProps {
  tracks: TrackSearchResult[];
}

export default function TrackGrid({ tracks }: TrackGridProps) {
  if (!tracks || tracks.length === 0) {
    // This case might be handled by the parent loader, but good fallback
    return <p className="text-center text-gray-500 mt-8">No tracks to display.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
      {tracks.map((track) => (
        <TrackCard key={track.id} track={track} />
      ))}
    </div>
  );
} 