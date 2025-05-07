'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, LayoutGrid, List, ChevronDown, Loader2, AlertCircle, ListFilter } from 'lucide-react';
import { TrackCard } from '@/components/track-card'; // Corrected import: TrackCard instead of BeatCard
import { FilterSidebar } from '@/components/explore/filter-sidebar';
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
import type { License } from '@/components/license/license.types';
import { Skeleton } from "@/components/ui/skeleton";
import { TrackCardSkeleton } from '@/components/track-card-skeleton'; // <-- Import the correct skeleton
import { SlideOutPanel } from '@/components/SlideOutPanel/SlideOutPanel';
import { TrackGrid } from "@/components/explore/TrackGrid"; // Reverted back to named import
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'; // Import VisuallyHidden

// --- Constants (Duplicated for now, consider moving to shared location) ---
const ITEMS_PER_PAGE = 9;
const DEFAULT_BPM_RANGE = [60, 180];
const DEFAULT_PRICE_RANGE = [0, 200];
type LayoutMode = 'grid' | 'list';
type SortOrder = 'relevance' | 'newest' | 'price_asc' | 'price_desc';
const sortOptions: { value: SortOrder; label: string }[] = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
];

// --- Types (Duplicated for now, consider sharing) ---
interface Beat {
  id: string | number;
  title: string;
  imageUrl?: string;
  coverImageUrl?: string;
  producerName: string;
  producerProfileUrl?: string;
  bpm?: number;
  key?: string;
  audioSrc?: string;
  previewAudioUrl?: string;
  beatUrl?: string;
  licenses: License[];
}
interface FilterValues {
  keyword?: string;
  genres?: string[];
  bpm?: [number, number];
  keys?: string[];
  tags?: string[];
  price?: [number, number];
}

// --- Props for the Client Component ---
interface ExploreClientUIProps {
  initialTracks: Beat[];
  totalCount: number;
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

// --- The Client Component ---
export const ExploreClientUI: React.FC<ExploreClientUIProps> = ({ initialTracks, totalCount }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from searchParams or defaults
  const [filters, setFilters] = useState<FilterValues>(() => {
    const params = new URLSearchParams(searchParams.toString());
    return {
      keyword: params.get('q') || '',
      genres: params.getAll('genre') || [],
      bpm: (params.get('bpm_min') && params.get('bpm_max'))
           ? [parseInt(params.get('bpm_min')!, 10), parseInt(params.get('bpm_max')!, 10)] as [number, number]
           : DEFAULT_BPM_RANGE,
      keys: params.getAll('key') || [],
      tags: params.getAll('tag') || [],
      price: (params.get('min_price') && params.get('max_price'))
                  ? [parseInt(params.get('min_price')!, 10), parseInt(params.get('max_price')!, 10)] as [number, number]
                  : DEFAULT_PRICE_RANGE,
    };
  });
  const [searchTerm, setSearchTerm] = useState(filters.keyword || '');
  const [contentType, setContentType] = useState(searchParams.get('type') || '');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [sortOrder, setSortOrder] = useState<SortOrder>(searchParams.get('sort') as SortOrder || 'relevance');
  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam, 10) : 1;
  });

  // Initialize displayedBeats state with initial server-fetched data
  const [displayedBeats, setDisplayedBeats] = useState<Beat[]>(initialTracks);
  const [currentTotalCount, setCurrentTotalCount] = useState(totalCount);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- Effect to update displayed beats when initialTracks prop changes --- 
  useEffect(() => {
    setDisplayedBeats(initialTracks);
  }, [initialTracks]); // Dependency array includes initialTracks
  // --- End Effect --- 

  // Effect to update URL when state changes (filters, sort, page)
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.keyword) params.set('q', filters.keyword);
    if (contentType) params.set('type', contentType);
    if (sortOrder && sortOrder !== 'relevance') params.set('sort', sortOrder);
    if (currentPage > 1) params.set('page', currentPage.toString());

    filters.genres?.forEach(g => params.append('genre', g));
    if (filters.bpm && (filters.bpm[0] !== DEFAULT_BPM_RANGE[0] || filters.bpm[1] !== DEFAULT_BPM_RANGE[1])) {
        params.set('bpm_min', filters.bpm[0].toString());
        params.set('bpm_max', filters.bpm[1].toString());
    }
    filters.keys?.forEach(k => params.append('key', k));
    filters.tags?.forEach(t => params.append('tag', t));
    if (filters.price && (filters.price[0] !== DEFAULT_PRICE_RANGE[0] || filters.price[1] !== DEFAULT_PRICE_RANGE[1])) {
      params.set('min_price', filters.price[0].toString());
      params.set('max_price', filters.price[1].toString());
    }

    // Use router.push to navigate, triggering Server Component refetch
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false }); // scroll: false prevents jumping to top

  }, [filters, sortOrder, currentPage, contentType, router]);

  // Event Handlers that update state (triggering the useEffect above)
  const debouncedSetFiltersKeyword = useCallback(
    debounce((term: string) => {
      setFilters(prevFilters => ({ ...prevFilters, keyword: term }));
      setCurrentPage(1);
    }, 500),
    []
  );

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setSearchTerm(term); // Update input immediately
    debouncedSetFiltersKeyword(term);
  };

  const handleFiltersChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
    setSearchTerm(newFilters.keyword || '');
    setCurrentPage(1);
  };

  const handleLayoutChange = (mode: LayoutMode) => {
    setLayoutMode(mode);
  };

  const handleSortChange = (order: SortOrder) => {
    setSortOrder(order);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    const totalPages = Math.ceil(currentTotalCount / ITEMS_PER_PAGE);
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Note: Scrolling handled by router.push default or useEffect dependency change
    }
  };

  // Render Logic
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className={cn(
            layoutMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6' : 'space-y-4'
        )}>
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => <TrackCardSkeleton key={i} />)}
        </div>
      );
    }
    if (error) {
      return <div className="text-center py-10 text-red-500">Error: {error}</div>;
    }
    if (displayedBeats.length === 0) {
      return <p className="text-center py-10 text-gray-400">No beats found matching your criteria.</p>;
    }
    return <TrackGrid tracks={displayedBeats} isLoading={false} layoutMode={layoutMode} />;
  };

  const totalPages = Math.ceil(currentTotalCount / ITEMS_PER_PAGE);
  const currentSortLabel = sortOptions.find(opt => opt.value === sortOrder)?.label || 'Relevance';

  // Main component return
  return (
    <>
      {/* Move controls outside the grid, place Filters button here */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          {/* Filter Trigger Button */}
          <Sheet>
               <SheetTrigger asChild>
                   <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
                       <ListFilter className="h-4 w-4" />
                       Filters
                   </Button>
               </SheetTrigger>
               <SheetContent side="left" className="w-full sm:max-w-xs p-0"> {/* Adjust width/padding as needed */}
                   {/* Add Visually Hidden Title for Accessibility */}
                   <VisuallyHidden asChild>
                     <SheetTitle>Track Filters</SheetTitle>
                   </VisuallyHidden>
                   {/* FilterSidebar likely has its own visible title */}
                   <FilterSidebar
                       initialFilters={filters}
                       onFiltersChange={handleFiltersChange}
                   />
               </SheetContent>
           </Sheet>

          {/* Search Bar (moved near controls) */}
          <div className="relative w-full max-w-xl sm:ml-auto"> {/* Adjust alignment as needed */}
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search sounds..."
              className="w-full rounded-lg bg-background pl-9 pr-4 py-2 text-sm focus:ring-primary focus:border-primary"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          {/* Sort & Layout Controls (kept separate or integrated near filters) */}
          <div className="flex items-center gap-4">
             <DropdownMenu>
                 {/* ... Sort Dropdown ... */}
                 <DropdownMenuTrigger asChild>
                     <Button variant="outline" size="sm" className="flex items-center gap-1 w-full sm:w-auto">
                         Sort by: {currentSortLabel}
                         <ChevronDown className="h-4 w-4 opacity-50" />
                     </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                     <DropdownMenuRadioGroup value={sortOrder} onValueChange={(value) => handleSortChange(value as SortOrder)}>
                         {sortOptions.map(option => (
                             <DropdownMenuRadioItem key={option.value} value={option.value}>
                                 {option.label}
                             </DropdownMenuRadioItem>
                         ))}
                     </DropdownMenuRadioGroup>
                 </DropdownMenuContent>
             </DropdownMenu>

             <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                {/* Layout Toggle Buttons */}
                <Button
                    variant={layoutMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => handleLayoutChange('grid')}
                    className="px-3"
                  >
                      <LayoutGrid className="h-4 w-4" />
                      <span className="sr-only">Grid view</span>
                  </Button>
                  <Button
                     variant={layoutMode === 'list' ? 'secondary' : 'ghost'}
                     size="sm"
                     onClick={() => handleLayoutChange('list')}
                     className="px-3"
                   >
                      <List className="h-4 w-4" />
                      <span className="sr-only">List view</span>
                  </Button>
             </div>
          </div>
      </div>

       {/* Active Filters Display (below controls) */}
       <ActiveFilters filters={filters} onRemoveFilter={handleFiltersChange} />

      {/* Main Content Area (Track Grid & Pagination) */}
      <div className="mt-6"> {/* Add margin separation */}
        {renderContent()}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination className="mt-8 md:mt-12">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                aria-disabled={currentPage <= 1}
                tabIndex={currentPage <= 1 ? -1 : undefined}
                className={cn(currentPage <= 1 && "pointer-events-none opacity-50")}
              />
            </PaginationItem>
            <PaginationItem><PaginationLink isActive>{currentPage}</PaginationLink></PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                aria-disabled={currentPage >= totalPages}
                tabIndex={currentPage >= totalPages ? -1 : undefined}
                className={cn(currentPage >= totalPages && "pointer-events-none opacity-50")}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Add the SlideOutPanel component here */}
      <SlideOutPanel />
    </>
  );
}; 