'use client'; // This page needs state for controls

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams
import { Search, LayoutGrid, List, ChevronDown, Loader2, AlertCircle, ListFilter } from 'lucide-react';
import { TrackCard } from '@/components/track-card';
import { FilterSidebar } from '@/components/explore/filter-sidebar'; // Import the new component
import { ActiveFilters } from '@/components/explore/active-filters'; // <-- Import ActiveFilters
import { Button } from '@/components/ui/button'; // For sort/layout buttons
import { Input } from '@/components/ui/input'; // For search input
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"; // <-- Import Sheet components
import { searchTracks } from '@/server-actions/tracks/trackQueries'; // Import server action
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
  // PaginationEllipsis, // Keep if needed later for ellipsis logic
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from '@/lib/utils';
import type { License } from '@/types'; // Import License type
import { Skeleton } from '@/components/ui/skeleton';
import { TrackCardSkeleton } from '@/components/track-card-skeleton';
import { useUIStore } from '@/stores/use-ui-store';
import { SlideOutPanel } from '@/components/SlideOutPanel/SlideOutPanel';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { Beat } from '@/types/beat'; // Assuming type definition exists - Defining locally for now

// Get the Supabase URL from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// --- Updated Beat Type Definition (includes licenses) ---
interface Beat {
  id: string;
  title: string;
  slug: string; // Added missing slug field
  imageUrl?: string;
  coverImageUrl?: string;
  producerName: string;
  producerProfileUrl?: string;
  // price: number; // Removed, use licenses
  bpm?: number;
  key?: string;
  audioSrc?: string;
  previewAudioUrl?: string;
  beatUrl?: string;
  licenses: License[]; // <-- Added licenses array
}
// --- End Updated Beat Type Definition ---

// Define FilterValues type (mirroring the one in FilterSidebar)
// TODO: Share this type definition properly
interface FilterValues {
  keyword?: string;
  genres?: string[];
  bpm?: [number, number];
  keys?: string[];
  tags?: string[];
  price?: [number, number];
}

type LayoutMode = 'grid' | 'list';
type SortOrder = 'relevance' | 'newest' | 'price_asc' | 'price_desc';

// Map SortOrder values to human-readable labels
const sortOptions: { value: SortOrder; label: string }[] = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
];

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || ''; // <-- Get initial type

  const [filters, setFilters] = useState<FilterValues>({
      // Initialize with empty arrays/defaults to match ActiveFilters expectations
      genres: [],
      bpm: [60, 180], // Use the same default as FilterSidebar
      keys: [],
      tags: [],
      price: [0, 200] // Add default price range
  });
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [contentType, setContentType] = useState(initialType); // <-- State for type
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [sortOrder, setSortOrder] = useState<SortOrder>('relevance');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // Or get from settings/config
  const [totalBeats, setTotalBeats] = useState(0); // Total count matching filters

  // --- Loading/Error State ---
  const [displayedBeats, setDisplayedBeats] = useState<Beat[]>([]); // Initialize as empty
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading initially
  const [error, setError] = useState<string | null>(null);

  // Helper function to create full Supabase Storage URLs (Simplified)
  const getStorageUrl = (path: string | null | undefined): string => {
    // If path is already a full URL (starts with http) or is empty/null, return it as is.
    if (!path || path.startsWith('http')) {
      return path || '';
    }
    
    // In the future, if you store relative paths, add logic here to construct the full URL.
    // For now, assume paths are either full URLs or null/undefined.
    console.warn(`Unexpected path format for getStorageUrl: ${path}. Returning empty string.`);
    return ''; // Return empty string for unexpected formats
  };

  // Effect to fetch data when dependencies change
  useEffect(() => {
    let isMounted = true;

    // Update searchTerm and contentType from URL on initial load or change
    setSearchTerm(searchParams.get('q') || '');
    setContentType(searchParams.get('type') || '');

    const fetchData = async () => {
      if (!isMounted) return;

      setIsLoading(true);
      setError(null);
      console.log('Fetching Data with:', { searchTerm: searchParams.get('q') || '', contentType: searchParams.get('type') || '', filters, sortOrder, currentPage });

      try {
        // Use searchTracks server action, passing the current state
        const searchResult = await searchTracks({
          query: searchParams.get('q') || '', // Use current search term
          type: searchParams.get('type') || undefined, // <-- Pass contentType (undefined if empty)
          // TODO: Pass filters, sortOrder, pagination info here
        });

        if (!isMounted) return;

        console.log('Search Result:', searchResult);

        // Map the tracks to match our Beat interface, including licenses
        const beats: Beat[] = searchResult.tracks.map(track => ({
          id: track.id,
          title: track.title,
          slug: track.slug,
          imageUrl: getStorageUrl(track.coverImageUrl),
          coverImageUrl: getStorageUrl(track.coverImageUrl),
          producerName: track.producer?.username || 'Unknown Producer',
          // price: track.licenses?.[0]?.price || 0, // Removed, use licenses array directly
          bpm: track.bpm || undefined,
          key: track.key || undefined,
          audioSrc: getStorageUrl(track.previewAudioUrl),
          previewAudioUrl: getStorageUrl(track.previewAudioUrl),
          beatUrl: `/track/${track.slug}`,
          licenses: track.licenses?.map(license => ({
            id: license.id,
            name: license.name,
            price: license.price,
            includedFiles: license.filesIncluded || [],
            usageTerms: [], // Placeholder for usage terms
          })) || [], // <-- Map licenses array with proper structure
        }));

        setDisplayedBeats(beats);
        setTotalBeats(searchResult.totalCount); // Use the actual total count from search result

      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to fetch beats:", err);
        const message = err instanceof Error ? err.message : "An unexpected error occurred while fetching beats.";
        setError(message);
        setDisplayedBeats([]);
        setTotalBeats(0);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
    // Depend on searchParams directly to react to URL changes
  }, [searchParams, filters, sortOrder, currentPage, itemsPerPage]);

  // --- Handlers --- 

  const handleFiltersChange = useCallback((newFilters: Partial<FilterValues>) => {
    console.log('Filters applied in ExplorePage:', newFilters);
    // TODO: Update URL with filters
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
    setCurrentPage(1); // Reset pagination
  }, []);

  // Debounced search term update and URL push
  const debounce = (func: Function, delay: number) => {
      let timeoutId: NodeJS.Timeout;
      return (...args: any[]) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
              func(...args);
          }, delay);
      };
  };

  const updateSearchUrl = useCallback((newSearchTerm: string) => {
    const currentParams = new URLSearchParams(window.location.search);
    if (newSearchTerm) {
        currentParams.set('q', newSearchTerm);
    } else {
        currentParams.delete('q');
    }
    // Push the new state to the URL without full page reload
    // Requires Next.js router or window.history API
    // Using window.history for simplicity here, consider Next router for better integration
    window.history.pushState({}, '', `${window.location.pathname}?${currentParams.toString()}`);
    // No need to call fetchData here, the useEffect watching searchParams will handle it
  }, []);

  const debouncedUpdateSearchUrl = useCallback(debounce(updateSearchUrl, 500), [updateSearchUrl]); // Memoize debounced function

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      const newSearchTerm = event.target.value;
      setSearchTerm(newSearchTerm); // Update local state immediately for input responsiveness
      debouncedUpdateSearchUrl(newSearchTerm); // Debounce the URL update
      setCurrentPage(1); // Reset pagination
  }, [debouncedUpdateSearchUrl]);

  const handleSortChange = useCallback((newSortOrder: SortOrder) => {
      // TODO: Update URL with sort order
      setSortOrder(newSortOrder);
      setCurrentPage(1); // Reset pagination
  }, []);

  const handleLayoutChange = useCallback((newLayout: LayoutMode) => {
      // TODO: Persist layout preference (e.g., localStorage)
      setLayoutMode(newLayout);
  }, []);

  // --- Pagination Handler ---
  const handlePageChange = useCallback((page: number) => {
      // TODO: Update URL with page number
      setCurrentPage(page);
      // Optional: Scroll to top
  }, []);

  // Find the label for the current sort order
  const currentSortLabel = sortOptions.find(opt => opt.value === sortOrder)?.label || 'Relevance';

  // --- Calculate Total Pages ---
  const totalPages = Math.ceil(totalBeats / itemsPerPage);

  // --- JSX Structure ---
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* MODIFICATION: Added lg:justify-between to center the main content between the sidebar and a new spacer div. */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:gap-8">
          {/* --- Filter Sidebar (Desktop) --- */}
          <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 mb-6 lg:mb-0">
            <div className="sticky top-24">
              <div className="flex justify-between items-center mb-4 lg:hidden">
                <h2 className="text-xl font-bold">Filters</h2>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                      <ListFilter className="h-4 w-4" />
                      <span className="sr-only">Open filters</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
                    <SheetHeader className="p-4 border-b">
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100%-4.5rem)]">
                        <div className="p-4">
                        <FilterSidebar
                          initialFilters={filters}
                          onFiltersChange={handleFiltersChange}
                        />
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              </div>
              <div className="hidden lg:block">
                <FilterSidebar
                  initialFilters={filters}
                  onFiltersChange={handleFiltersChange}
                />
              </div>
            </div>
          </aside>

          {/* --- Main Content --- */}
          <main className="flex-1 min-w-0">
            <h1 className="text-4xl font-bold tracking-tight text-center mb-2">Explore Sounds</h1>
            <p className="text-center text-muted-foreground mb-8">Discover your next hit sound.</p>

            {/* Search and controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="relative w-full sm:w-auto sm:flex-grow max-w-lg mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search sounds, genres, moods..."
                  className="pl-9 w-full"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={layoutMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => handleLayoutChange('grid')}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={layoutMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => handleLayoutChange('list')}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-[150px] justify-between">
                      <span>{sortOptions.find(o => o.value === sortOrder)?.label}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[150px]">
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
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
            
            <ActiveFilters filters={filters} onFiltersChange={handleFiltersChange} defaultBpmRange={[60, 180]} defaultPriceRange={[0, 200]} className="mb-6"/>

            {/* --- Conditional Rendering Section --- */}

            {/* Loading State */}
            {isLoading && (
                <div className="flex justify-center items-center min-h-[300px]">
                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Error State */}
            {!isLoading && error && (
                <div className="flex flex-col items-center justify-center min-h-[300px] bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
                    <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                    <p className="text-destructive font-semibold mb-2">Failed to load beats</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                </div>
            )}

            {/* Content Display (Not Loading, No Error) */}
            {!isLoading && !error && (
                 <> {/* React Fragment to wrap multiple elements */}
                    {/* Check if there are beats to display */}
                    {displayedBeats.length > 0 ? (
                        // Beats Grid/List
                        <div className={cn(
                            "grid gap-5",
                            layoutMode === 'grid'
                                ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" // Adjusted grid cols slightly
                                : "grid-cols-1" // List view takes full width
                        )}>
                            {displayedBeats.map((beat, index) => (
                                <TrackCard
                                    key={beat.id}
                                    beat={beat}
                                    fullTrackList={displayedBeats}
                                    index={index}
                                    displayMode={layoutMode}
                                />
                            ))}
                        </div>
                    ) : (
                        // Empty State
                        <div className="flex justify-center items-center min-h-[200px]">
                             <p className="text-muted-foreground text-center mt-10">
                                No beats found matching your criteria.
                            </p>
                        </div>
                    )}

                    {/* Pagination (Show only if needed, within the no-loading/no-error block) */}
                    {totalPages > 1 && (
                        <div className="mt-12 flex justify-center">
                             <Pagination>
                                 <PaginationContent>
                                     {generatePaginationItems(currentPage, totalPages, handlePageChange)}
                                 </PaginationContent>
                             </Pagination>
                         </div>
                    )}
                </> // Closing React Fragment
            )} {/* End Content Display Block */}

          </main>

          {/* MODIFICATION: Added spacer div. This is invisible but takes up the same width as the sidebar on desktop, pushing the main content to the center. */}
          <div className="hidden lg:block w-64 xl:w-72 flex-shrink-0" aria-hidden="true"></div>
        </div>
      </div>
      <SlideOutPanel />
    </div>
  );
} 

// --- Helper Function for Pagination Logic ---

function generatePaginationItems(currentPage: number, totalPages: number, onPageChange: (page: number) => void) {
  const items = [];
  const pageNeighbours = 1; // How many pages to show on each side of the current page

  // Previous Button
  items.push(
    <PaginationItem key="prev">
      <PaginationPrevious
        href="#"
        onClick={(e) => { e.preventDefault(); if (currentPage > 1) onPageChange(currentPage - 1); }}
        className={cn(
          'hover:bg-white/10 hover:text-white',
          currentPage === 1 ? 'pointer-events-none opacity-50' : ''
        )}
        aria-disabled={currentPage === 1}
      />
    </PaginationItem>
  );

  // Page Number Logic
  const totalNumbers = (pageNeighbours * 2) + 3; // current + neighbours + first + last
  const totalBlocks = totalNumbers + 2; // Add blocks for ellipsis

  if (totalPages > totalBlocks) {
    const startPage = Math.max(2, currentPage - pageNeighbours);
    const endPage = Math.min(totalPages - 1, currentPage + pageNeighbours);
    let pages: (number | string)[] = range(startPage, endPage);

    const hasLeftSpill = startPage > 2;
    const hasRightSpill = (totalPages - endPage) > 1;
    const spillOffset = totalNumbers - (pages.length + 1); // How many extra pages to show due to lack of spill

    switch (true) {
      // Handle: (1) ... {5 6} 7 ... (10)
      case (hasLeftSpill && !hasRightSpill):
        const extraPagesLeft = range(startPage - spillOffset, startPage - 1);
        pages = ['...', ...extraPagesLeft, ...pages];
        break;
      // Handle: (1) ... 4 {5 6} ... (10)
      case (!hasLeftSpill && hasRightSpill):
        const extraPagesRight = range(endPage + 1, endPage + spillOffset);
        pages = [...pages, ...extraPagesRight, '...'];
        break;
      // Handle: (1) ... 4 {5} 6 ... (10)
      case (hasLeftSpill && hasRightSpill):
      default:
        pages = ['...', ...pages, '...'];
        break;
    }
    pages = [1, ...pages, totalPages];

    pages.forEach((page, index) => {
      if (page === '...') {
        items.push(<PaginationItem key={`ellipsis-${index}`}><span className="px-3 py-1.5 text-gray-500">...</span></PaginationItem>);
      } else {
        items.push(
          <PaginationItem key={page as number}>
            <PaginationLink
              href="#"
              onClick={(e) => { e.preventDefault(); onPageChange(page as number); }}
              isActive={currentPage === page}
              className={cn(
                'hover:bg-white/10 hover:text-white',
                currentPage === page ? 'bg-indigo-600/70 border-indigo-500 text-white pointer-events-none' : ''
              )}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        );
      }
    });

  } else {
    // Less than totalBlocks pages, show all
    range(1, totalPages).forEach(page => {
      items.push(
        <PaginationItem key={page}>
          <PaginationLink
            href="#"
            onClick={(e) => { e.preventDefault(); onPageChange(page); }}
            isActive={currentPage === page}
            className={cn(
              'hover:bg-white/10 hover:text-white',
              currentPage === page ? 'bg-indigo-600/70 border-indigo-500 text-white pointer-events-none' : ''
            )}
          >
            {page}
          </PaginationLink>
        </PaginationItem>
      );
    });
  }

  // Next Button
  items.push(
    <PaginationItem key="next">
      <PaginationNext
        href="#"
        onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) onPageChange(currentPage + 1); }}
        className={cn(
          'hover:bg-white/10 hover:text-white',
          currentPage === totalPages ? 'pointer-events-none opacity-50' : ''
        )}
        aria-disabled={currentPage === totalPages}
      />
    </PaginationItem>
  );

  return items;
}

// Helper function to generate a range of numbers
function range(from: number, to: number): number[] {
  let i = from;
  const rangeArr: number[] = [];
  while (i <= to) {
    rangeArr.push(i);
    i += 1;
  }
  return rangeArr;
} 
