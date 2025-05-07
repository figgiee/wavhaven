import React from 'react';
import { TrackCard } from '@/components/track-card';
// Import the type definition from the Server Action
import type { SimilarTrackCardData } from '@/server-actions/trackActions';
// import type { Beat as OriginalBeatCardBeat } from '@/components/track-card'; // Remove this import
import type { Beat } from '@/types'; // Import Beat from global types
import type { License } from '@/components/license/license.types'; // Import License type for clarity

interface SlideOutBeatCardAdapterProps {
  // Accept the data structure returned by the server action
  beat: SimilarTrackCardData;
  className?: string;
}

export const SlideOutBeatCardAdapter: React.FC<SlideOutBeatCardAdapterProps> = ({ beat, className }) => {
  // Adapt the SimilarTrackCardData structure to the structure expected by BeatCard
  const adaptedBeat: Beat = {
    id: beat.id,
    title: beat.title,
    imageUrl: beat.artworkUrl, // Assuming artworkUrl is present on the input 'beat' object
    producerName: beat.producer ? `${beat.producer.firstName || ''} ${beat.producer.lastName || ''}`.trim() || 'Unknown Producer' : 'Unknown Producer',
    // producerProfileUrl: // Add if available in SimilarTrackCardData and needed by TrackCard
    // bpm: // Add if available in SimilarTrackCardData and needed by TrackCard
    // key: // Add if available in SimilarTrackCardData and needed by TrackCard
    audioSrc: `placeholder-audio-src-for-${beat.id}.mp3`, // TrackCard needs an audioSrc; provide a placeholder
    beatUrl: `/track/${beat.id}`, // Construct track URL. Assuming ID is used for slug or direct linking.
                                 // TODO: Ideally, use a slug if available from SimilarTrackCardData
    // Adapt licenses. TrackCard expects a more complete License structure.
    // SimilarTrackCardData only provides price. Provide minimal structure with placeholders.
    // This will likely not be fully functional in TrackCard's license modal.
    licenses: beat.licenses.map((l, index) => ({
      id: `similar-license-placeholder-${beat.id}-${index}`, // Generate placeholder ID
      name: 'License', // Placeholder name
      price: l.price,
      // These are required by the License type from license.types.ts but not available in SimilarTrackCardData
      includedFiles: ['Placeholder File'], // Placeholder
      usageTerms: [{ icon: React.createElement('div'), label: 'Placeholder Term' }], // Placeholder
      // description: 'License info unavailable in this view', // Description is not in target License type
      // downloadUrl: 'placeholder' // downloadUrl is not in target License type
    } as License)), // Assert as License type, acknowledging missing fields for full functionality
  };

  // Render the original TrackCard with adapted data and dummy list/index
  // The player functionality initiated by this card might not work correctly
  // without a real audioSrc or full track list integration.
  return (
    <TrackCard
      beat={adaptedBeat}
      fullTrackList={[adaptedBeat]} // Provide a minimal list containing only this beat
      index={0} // Index within the dummy list
      className={className}
    />
  );
}; 