import { useState, useEffect, useCallback, useTransition } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

// --- Types ---
export interface ExplorePageFilters {
  q?: string; // Keyword from search bar
  genre?: string;
  mood?: string;
  minBpm?: number;
  maxBpm?: number;
  key?: string;
  minPrice?: number;
  maxPrice?: number;
  licenseTypes?: string[];
  contentType?: string;
}

export type SortOrder = 'relevance' | 'newest' | 'price_asc' | 'price_desc';
export type LayoutMode = 'grid' | 'list';

interface FilterValues {
  keyword?: string;
  genres: string[];
  bpm: [number, number];
  keys: string[];
  tags: string[];
  moods: string[];
  price?: [number, number];
  licenseTypes?: string[];
}

interface UseExploreFiltersReturn {
  filters: ExplorePageFilters;
  setFilters: React.Dispatch<React.SetStateAction<ExplorePageFilters>>;
  sortOrder: SortOrder;
  setSortOrder: React.Dispatch<React.SetStateAction<SortOrder>>;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  layoutMode: LayoutMode;
  setLayoutMode: React.Dispatch<React.SetStateAction<LayoutMode>>;
  isPending: boolean;
  handleSidebarFiltersApplied: (sidebarFilters: FilterValues) => void;
  handleSearchInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleClearFilter: (filterKey: keyof ExplorePageFilters) => void;
  handleClearAllFilters: () => void;
  handleLayoutChange: (mode: LayoutMode) => void;
  handleSortChange: (order: SortOrder) => void;
  handlePageChange: (newPage: number) => void;
  handleClearSearch: () => void;
  getActiveFilterItems: () => { id: string; label: string; value: string }[];
}

// --- Debounce Function ---
const debounce = <T extends unknown[]>(func: (...args: T) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

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

export function useExploreFilters(): UseExploreFiltersReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<ExplorePageFilters>(() => parseFiltersFromParams(searchParams));
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => (searchParams.get('sort') as SortOrder) || 'relevance');
  const [currentPage, setCurrentPage] = useState<number>(() => parseInt(searchParams.get('page') || '1', 10));
  const [searchTerm, setSearchTerm] = useState<string>(() => searchParams.get('q') || '');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [isPending, startTransition] = useTransition();

  // --- URL Synchronization Effect ---
  useEffect(() => {
    const currentParams = new URLSearchParams(searchParams.toString());
    const newParams = new URLSearchParams();

    if (filters.q) newParams.set('q', filters.q);
    if (filters.contentType) newParams.set('type', filters.contentType);
    if (filters.genre) newParams.set('genre', filters.genre);
    if (filters.mood) newParams.set('mood', filters.mood);
    if (filters.minBpm !== undefined) newParams.set('bpm_min', filters.minBpm.toString());
    if (filters.maxBpm !== undefined) newParams.set('bpm_max', filters.maxBpm.toString());
    if (filters.key) newParams.set('key', filters.key);
    if (filters.minPrice !== undefined) newParams.set('min_price', filters.minPrice.toString());
    if (filters.maxPrice !== undefined) newParams.set('max_price', filters.maxPrice.toString());
    filters.licenseTypes?.forEach(lt => newParams.append('license', lt));
    if (sortOrder !== 'relevance') newParams.set('sort', sortOrder);
    if (currentPage > 1) newParams.set('page', currentPage.toString());

    const newParamsString = newParams.toString();
    const currentParamsString = currentParams.toString();

    if (newParamsString !== currentParamsString) {
      startTransition(() => {
        router.push(`${pathname}?${newParamsString}`, { scroll: false });
      });
    }
  }, [filters, sortOrder, currentPage, router, pathname, searchParams]);

  // --- Sync State with URL Params ---
  useEffect(() => {
    const parsedFilters = parseFiltersFromParams(searchParams);
    const parsedSort = (searchParams.get('sort') as SortOrder) || 'relevance';
    const parsedPage = parseInt(searchParams.get('page') || '1', 10);
    const parsedSearchTerm = searchParams.get('q') || '';

    if (JSON.stringify(parsedFilters) !== JSON.stringify(filters)) {
      setFilters(parsedFilters);
    }
    if (parsedSort !== sortOrder) {
      setSortOrder(parsedSort);
    }
    if (parsedPage !== currentPage) {
      setCurrentPage(parsedPage);
    }
    if (parsedSearchTerm !== searchTerm) {
      setSearchTerm(parsedSearchTerm);
    }
  }, [searchParams, filters, sortOrder, currentPage, searchTerm]);

  // --- Debounced Search ---
  const debouncedSetSearchKeyword = useCallback(
    debounce((term: string) => {
      setFilters(prevFilters => ({ ...prevFilters, q: term || undefined }));
      setCurrentPage(1);
    }, 500),
    []
  );

  // --- Event Handlers ---
  const handleSidebarFiltersApplied = useCallback((sidebarFilters: FilterValues) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      genre: sidebarFilters.genres?.[0], // Assuming single genre selection
      mood: sidebarFilters.moods?.[0], // Assuming single mood selection
      minBpm: sidebarFilters.bpm?.[0],
      maxBpm: sidebarFilters.bpm?.[1],
      key: sidebarFilters.keys?.[0], // Assuming single key selection
      minPrice: sidebarFilters.price?.[0],
      maxPrice: sidebarFilters.price?.[1],
      licenseTypes: sidebarFilters.licenseTypes,
    }));
    setCurrentPage(1);
  }, []);

  const handleSearchInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setSearchTerm(term);
    debouncedSetSearchKeyword(term);
  }, [debouncedSetSearchKeyword]);

  const handleClearFilter = useCallback((filterKey: keyof ExplorePageFilters) => {
    setFilters(prevFilters => {
      const newFilters = { ...prevFilters };
      if (filterKey !== 'q' && filterKey !== 'contentType') {
        newFilters[filterKey] = undefined;
      }
      if (filterKey === 'licenseTypes') {
        newFilters.licenseTypes = undefined;
      }
      return newFilters;
    });
    setCurrentPage(1);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setFilters(prevFilters => ({
      q: prevFilters.q,
      contentType: prevFilters.contentType,
      genre: undefined,
      mood: undefined,
      minBpm: undefined,
      maxBpm: undefined,
      key: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      licenseTypes: undefined,
    }));
    setCurrentPage(1);
  }, []);

  const handleLayoutChange = useCallback((mode: LayoutMode) => {
    setLayoutMode(mode);
  }, []);

  const handleSortChange = useCallback((order: SortOrder) => {
    setSortOrder(order);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    // This will be used by the UI component to validate against totalPages
    setCurrentPage(newPage);
    window.scrollTo(0, 0);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setFilters(prevFilters => ({ ...prevFilters, q: undefined }));
    setCurrentPage(1);
  }, []);

  // --- Get Active Filter Items ---
  const getActiveFilterItems = useCallback(() => {
    return Object.entries(filters)
      .map(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return null;
        let label = '';
        let displayValue = '';
        if (key === 'q') { label = 'Keyword'; displayValue = String(value); }
        else if (key === 'genre') { label = 'Genre'; displayValue = String(value); }
        else if (key === 'mood') { label = 'Mood'; displayValue = String(value); }
        else if (key === 'key') { label = 'Key'; displayValue = String(value); }
        else if (key === 'minBpm' && filters.maxBpm) { label = 'BPM'; displayValue = `${filters.minBpm}-${filters.maxBpm}`; }
        else if (key === 'minPrice' && filters.maxPrice) { label = 'Price'; displayValue = `$${filters.minPrice}-$${filters.maxPrice}`; }
        else if (key === 'licenseTypes') { label = 'Licenses'; displayValue = (value as string[]).join(', '); }
        else if (key === 'contentType') { label = 'Type'; displayValue = String(value); }
        else if ((key === 'minBpm' && !filters.maxBpm) || (key === 'maxBpm' && !filters.minBpm)) { return null; }
        else if ((key === 'minPrice' && !filters.maxPrice) || (key === 'maxPrice' && !filters.minPrice)) { return null; }

        if (label && displayValue) {
          return { id: key, label, value: displayValue };
        }
        return null;
      })
      .filter(item => item !== null) as { id: string; label: string; value: string }[];
  }, [filters]);

  return {
    filters,
    setFilters,
    sortOrder,
    setSortOrder,
    currentPage,
    setCurrentPage,
    searchTerm,
    setSearchTerm,
    layoutMode,
    setLayoutMode,
    isPending,
    handleSidebarFiltersApplied,
    handleSearchInputChange,
    handleClearFilter,
    handleClearAllFilters,
    handleLayoutChange,
    handleSortChange,
    handlePageChange,
    handleClearSearch,
    getActiveFilterItems,
  };
} 