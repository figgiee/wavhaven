import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { searchTracks } from '@/server-actions/tracks/trackQueries';
import type { Beat } from '@/types';
import type { ExplorePageFilters, SortOrder } from './useExploreFilters';

// --- Constants ---
const ITEMS_PER_PAGE = 9;

interface UseTrackSearchReturn {
  displayedBeats: Beat[];
  currentTotalCount: number;
  isLoading: boolean;
  error: string | null;
}

// Helper function to parse filters from URL Search Params
const parseFiltersFromParams = (params: URLSearchParams): ExplorePageFilters => {
  const licenseTypes = params.getAll('license');
  return {
    q: params.get('q') || undefined,
    contentType: params.get('type') || undefined,
    genre: params.get('genre') || undefined,
    mood: params.get('mood') || undefined,
    key: params.get('key') || undefined,
    minBpm: params.has('bpm_min') ? parseInt(params.get('bpm_min')!, 10) : undefined,
    maxBpm: params.has('bpm_max') ? parseInt(params.get('bpm_max')!, 10) : undefined,
    minPrice: params.has('min_price') ? parseInt(params.get('min_price')!, 10) : undefined,
    maxPrice: params.has('max_price') ? parseInt(params.get('max_price')!, 10) : undefined,
    licenseTypes: licenseTypes.length > 0 ? licenseTypes : undefined,
  };
};

export function useTrackSearch(): UseTrackSearchReturn {
  const searchParams = useSearchParams();

  const [displayedBeats, setDisplayedBeats] = useState<Beat[]>([]);
  const [currentTotalCount, setCurrentTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- Search Effect ---
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const currentFilters = parseFiltersFromParams(searchParams);
    const currentSort = (searchParams.get('sort') as SortOrder) || 'relevance';
    const currentPageNum = parseInt(searchParams.get('page') || '1', 10);

    const actionParams = {
      ...currentFilters,
      sort: currentSort,
      page: currentPageNum,
      limit: ITEMS_PER_PAGE,
    };

    searchTracks(actionParams)
      .then(({ tracks: searchResultTracks, totalCount }) => {
        const mappedTracks: Beat[] = searchResultTracks.map(track => ({
          id: track.id,
          title: track.title,
          slug: track.slug,
          description: track.description ?? undefined,
          bpm: track.bpm ?? undefined,
          key: track.key ?? undefined,
          imageUrl: (track.coverImageUrl && track.coverImageUrl.trim() !== '') ? track.coverImageUrl : undefined,
          coverImageUrl: (track.coverImageUrl && track.coverImageUrl.trim() !== '') ? track.coverImageUrl : undefined,
          audioSrc: (track.previewAudioUrl && track.previewAudioUrl.trim() !== '') ? track.previewAudioUrl : undefined,
          previewAudioUrl: (track.previewAudioUrl && track.previewAudioUrl.trim() !== '') ? track.previewAudioUrl : undefined,
          beatUrl: `/track/${track.slug}`,
          producer: track.producer ? {
            id: track.producer.id,
            username: track.producer.username,
            profileImageUrl: track.producer.profileImageUrl ?? undefined,
          } : undefined,
          producerName: track.producer?.username || "Unknown Producer",
          producerProfileUrl: track.producer?.username ? `/u/${track.producer.username}` : undefined,
          licenses: (track.licenses as { id: string; name: string; price: number; filesIncluded?: string[]; usageTerms?: unknown[] }[]) || [],
          tags: track.tags ? track.tags.map(tag => ({ id: tag.id, name: tag.name })) : [],
          playCount: track.playCount,
          likeCount: track.likeCount,
          commentCount: track._count?.comments ?? 0,
          createdAt: track.createdAt,
        }));
        setDisplayedBeats(mappedTracks);
        setCurrentTotalCount(totalCount);
      })
      .catch((err) => {
        console.error("Error fetching tracks:", err);
        setError("Failed to load tracks. Please try again.");
        setDisplayedBeats([]);
        setCurrentTotalCount(0);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [searchParams]);

  return {
    displayedBeats,
    currentTotalCount,
    isLoading,
    error,
  };
} 