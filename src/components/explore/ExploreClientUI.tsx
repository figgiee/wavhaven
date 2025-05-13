'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, LayoutGrid, List, ChevronDown, Loader2, AlertCircle, ListFilter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrackCard } from '@/components/track-card';
import { FilterSidebar, AppliedFilters as FilterSidebarAppliedFilters } from '@/components/explore/FilterSidebar';
import { ActiveFilters } from '@/components/explore/active-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from '@/lib/utils';
import { Skeleton } from "@/components/ui/skeleton";
import { TrackCardSkeleton } from '@/components/track-card-skeleton';
import { SlideOutPanel } from '@/components/SlideOutPanel/SlideOutPanel';
import { TrackGrid } from "@/components/explore/TrackGrid";
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { searchTracks } from '@/server-actions/trackActions';
import type { TrackSearchResult } from '@/server-actions/trackActions';
import type { Beat } from '@/types';

// --- Constants ---
const ITEMS_PER_PAGE = 9;
const DEFAULT_BPM_RANGE: [number, number] = [60, 180];
const DEFAULT_PRICE_RANGE: [number, number] = [0, 200];
type LayoutMode = 'grid' | 'list';
type SortOrder = 'relevance' | 'newest' | 'price_asc' | 'price_desc';
const sortOptions: { value: SortOrder; label: string }[] = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
];

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
  licenseTypes?: string[]; // Assuming LicenseType enum values are strings
  contentType?: string; // Example other filter
}

// --- Props for the Client Component ---
interface ExploreClientUIProps {
  serverSearchParams: { [key: string]: string | string[] | undefined };
}

// --- Debounce Function (Consider moving to utils) ---
const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
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

// --- The Client Component ---
export const ExploreClientUI: React.FC<ExploreClientUIProps> = ({ serverSearchParams }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<ExplorePageFilters>(() => parseFiltersFromParams(searchParams));
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => (searchParams.get('sort') as SortOrder) || 'relevance');
  const [currentPage, setCurrentPage] = useState<number>(() => parseInt(searchParams.get('page') || '1', 10));
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState<string>(() => searchParams.get('q') || '');

  const [displayedBeats, setDisplayedBeats] = useState<Beat[]>([]);
  const [currentTotalCount, setCurrentTotalCount] = useState(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');

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
            licenses: (track.licenses as any[]) || [],
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

  const handleSidebarFiltersApplied = useCallback((sidebarFilters: FilterSidebarAppliedFilters) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      genre: sidebarFilters.genre,
      mood: sidebarFilters.mood,
      minBpm: sidebarFilters.minBpm,
      maxBpm: sidebarFilters.maxBpm,
      key: sidebarFilters.key,
      minPrice: sidebarFilters.minPrice,
      maxPrice: sidebarFilters.maxPrice,
      licenseTypes: sidebarFilters.licenseTypes as string[],
    }));
    setCurrentPage(1);
  }, []);

  const debouncedSetSearchKeyword = useCallback(
    debounce((term: string) => {
      setFilters(prevFilters => ({ ...prevFilters, q: term || undefined }));
      setCurrentPage(1);
    }, 500),
    []
  );

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setSearchTerm(term);
    debouncedSetSearchKeyword(term);
  };

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

  const handleLayoutChange = (mode: LayoutMode) => setLayoutMode(mode);
  const handleSortChange = (order: SortOrder) => {
    setSortOrder(order);
    setCurrentPage(1);
  };
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= Math.ceil(currentTotalCount / ITEMS_PER_PAGE)) {
      setCurrentPage(newPage);
      window.scrollTo(0, 0);
    }
  };

  const totalPages = Math.ceil(currentTotalCount / ITEMS_PER_PAGE);

  const activeFilterItems = Object.entries(filters)
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

  const handleRemoveFilter = (filterId: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (filterId === 'minBpm' || filterId === 'maxBpm' || filterId === 'bpm') {
        delete newFilters.minBpm;
        delete newFilters.maxBpm;
      } else if (filterId === 'minPrice' || filterId === 'maxPrice' || filterId === 'price') {
        delete newFilters.minPrice;
        delete newFilters.maxPrice;
      } else if (filterId === 'licenseTypes') {
        newFilters.licenseTypes = [];
      }
      else {
        delete (newFilters as any)[filterId];
      }
      return newFilters;
    });
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setFilters(prevFilters => ({ ...prevFilters, q: undefined }));
    setCurrentPage(1);
  };

  const renderContent = () => {
    if (isLoading && displayedBeats.length === 0) {
      return (
        <div className={cn(
            "grid gap-4 sm:gap-5",
            layoutMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3" : "grid-cols-1"
        )}>
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                <TrackCardSkeleton key={index} displayMode={layoutMode === 'grid' ? 'grid' : 'list'} />
            ))}
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-xl font-semibold text-neutral-300 mb-2">Oops! Something went wrong.</p>
          <p className="text-neutral-400 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      );
    }
    if (displayedBeats.length === 0) {
      return (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-neutral-300">No tracks found.</p>
          <p className="text-neutral-400">Try adjusting your filters or search term.</p>
        </div>
      );
    }
    return (
        <TrackGrid 
            tracks={displayedBeats} 
            layoutMode={layoutMode} 
            isLoading={isPending || (isLoading && displayedBeats.length > 0)}
        />
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-x-8 gap-y-6 relative">
      <div className="hidden lg:flex lg:flex-col space-y-4 sticky top-[calc(var(--site-header-height,4rem)+1rem)] h-fit self-start">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsDesktopFilterOpen(!isDesktopFilterOpen)}
          className="self-start" 
          aria-label={isDesktopFilterOpen ? "Close filters" : "Open filters"}
          aria-expanded={isDesktopFilterOpen}
        >
          <ListFilter className="h-5 w-5" />
        </Button>
        <AnimatePresence>
          {isDesktopFilterOpen && (
            <motion.div
              key="desktop-filter-sidebar"
              className="w-full lg:w-[280px] xl:w-[320px]"
              initial={{ opacity: 0, width: 0, x: "-100%" }}
              animate={{ opacity: 1, width: "auto", x: "0%" }}
              exit={{ opacity: 0, width: 0, x: "-100%", transition: { duration: 0.25 } }}
              transition={{ duration: 0.35, ease: "circOut" }}
              style={{ overflow: 'hidden' }}
            >
              <FilterSidebar
                initialFilters={filters}
                onApplyFilters={handleSidebarFiltersApplied}
                allGenres={[]}
                allMoods={[]}
                allKeys={[]}
                defaultBpmRange={DEFAULT_BPM_RANGE}
                currentBpmRange={[filters.minBpm ?? DEFAULT_BPM_RANGE[0], filters.maxBpm ?? DEFAULT_BPM_RANGE[1]]}
                defaultPriceRange={DEFAULT_PRICE_RANGE}
                currentPriceRange={[filters.minPrice ?? DEFAULT_PRICE_RANGE[0], filters.maxPrice ?? DEFAULT_PRICE_RANGE[1]]}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-base py-3">
              <ListFilter className="mr-2 h-5 w-5" />
              Filters & Sort
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[320px] sm:w-[380px] p-0 flex flex-col">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="flex-grow overflow-y-auto">
              <FilterSidebar
                initialFilters={filters}
                onApplyFilters={(appliedFilters) => {
                  handleSidebarFiltersApplied(appliedFilters);
                }}
                allGenres={[]}
                allMoods={[]}
                allKeys={[]}
                defaultBpmRange={DEFAULT_BPM_RANGE}
                currentBpmRange={[filters.minBpm ?? DEFAULT_BPM_RANGE[0], filters.maxBpm ?? DEFAULT_BPM_RANGE[1]]}
                defaultPriceRange={DEFAULT_PRICE_RANGE}
                currentPriceRange={[filters.minPrice ?? DEFAULT_PRICE_RANGE[0], filters.maxPrice ?? DEFAULT_PRICE_RANGE[1]]}
                isSheetContext={true}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className={cn(
          "flex-1 min-w-0",
      )}>
        <div className="mb-6 space-y-4">
          <div className="relative">
            <VisuallyHidden>
                <label htmlFor="search-tracks">Search tracks</label>
            </VisuallyHidden>
            <Input
              id="search-tracks"
              type="search"
              placeholder="Search tracks, sounds, artists..."
              value={searchTerm}
              onChange={handleSearchInputChange}
              className="pl-10 pr-10 h-12 text-base rounded-full bg-neutral-800 border-neutral-700 focus:border-cyan-glow focus-visible:ring-0"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
            {searchTerm && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-7 w-7 rounded-full" 
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <ActiveFilters 
                filters={activeFilterItems} 
                onRemoveFilter={handleRemoveFilter} 
                onClearAll={handleClearAllFilters}
            />
            <div className="flex items-center gap-2 self-end sm:self-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9">
                    Sort: {sortOptions.find(opt => opt.value === sortOrder)?.label || 'Relevance'}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={sortOrder} onValueChange={(value) => handleSortChange(value as SortOrder)}>
                    {sortOptions.map(option => (
                      <DropdownMenuRadioItem key={option.value} value={option.value}>
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {renderContent()}

        {totalPages > 1 && (
          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                  disabled={currentPage === 1 || isLoading}
                  aria-disabled={currentPage === 1 || isLoading}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => { e.preventDefault(); handlePageChange(page); }}
                    isActive={currentPage === page}
                    aria-current={currentPage === page ? "page" : undefined}
                    disabled={isLoading}
                    aria-disabled={isLoading}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                  disabled={currentPage === totalPages || isLoading}
                  aria-disabled={currentPage === totalPages || isLoading}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
      <SlideOutPanel />
    </div>
  );
}; 