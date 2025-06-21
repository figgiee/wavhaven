'use client'; // This page needs state for controls

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams
import { Search, LayoutGrid, List, ChevronDown, Loader2, AlertCircle, ListFilter } from 'lucide-react';
import { BeatCard } from '@/components/beat-card'; // Adjust path if needed
import { FilterSidebar } from '@/components/explore/filter-sidebar'; // Import the new component
import { ActiveFilters } from '@/components/explore/active-filters'; // <-- Import ActiveFilters
import { Button } from '@/components/ui/button'; // For sort/layout buttons
import { Input } from '@/components/ui/input'; // For search input
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"; // <-- Import Sheet components
import { searchTracks } from '@/server-actions/trackActions'; // Import server action
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
import type { License } from '@/components/license/license.types'; // Import License type
// import { Beat } from '@/types/beat'; // Assuming type definition exists - Defining locally for now

// Get the Supabase URL from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// --- Updated Beat Type Definition (includes licenses) ---
interface Beat {
  id: string | number;
  title: string;
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
  genres?: string[];
  bpmRange?: { min: number; max: number }; // Example structure, adjust as needed
  key?: string; // Example structure, adjust as needed
  tags?: string[];
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
      tags: []
  });
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [contentType, setContentType] = useState(initialType); // <-- State for type
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [sortOrder, setSortOrder] = useState<SortOrder>('relevance');

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
        const tracksResult = await searchTracks({
          query: searchParams.get('q') || '', // Use current search term
          type: searchParams.get('type') || '', // <-- Pass contentType
          // TODO: Pass filters, sortOrder, pagination info here
        });

        if (!isMounted) return;

        console.log('Tracks Result (should include licenses):', tracksResult);

        // Map the tracks to match our Beat interface, including licenses
        const beats: Beat[] = tracksResult.map(track => ({
          id: track.id,
          title: track.title,
          imageUrl: getStorageUrl(track.coverImageUrl),
          coverImageUrl: getStorageUrl(track.coverImageUrl),
          producerName: track.producer?.username || 'Unknown Producer',
          // price: track.licenses?.[0]?.price || 0, // Removed, use licenses array directly
          bpm: track.bpm || undefined,
          key: track.key || undefined,
          audioSrc: getStorageUrl(track.previewAudioUrl),
          previewAudioUrl: getStorageUrl(track.previewAudioUrl),
          beatUrl: `/track/${track.id}`,
          licenses: track.licenses || [], // <-- Map licenses array
        }));

        setDisplayedBeats(beats);
        setTotalBeats(beats.length); // TODO: Get total count from API response

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

  const handleFiltersChange = useCallback((newFilters: FilterValues) => {
    console.log('Filters applied in ExplorePage:', newFilters);
    // TODO: Update URL with filters
    setFilters(newFilters);
    setCurrentPage(1); // Reset pagination
  }, []);

  const handleRemoveFilter = useCallback((filterType: keyof FilterValues, valueToRemove: string | number | [number, number]) => {
    console.log('Removing filter:', filterType, valueToRemove);
    setFilters(currentFilters => {
        const newFilters = { ...currentFilters };

        switch (filterType) {
            case 'genres':
                newFilters.genres = (newFilters.genres || []).filter(g => g !== valueToRemove);
                break;
            case 'bpm':
                // Reset BPM to default when the badge is removed
                // TODO: Get default from shared config
                newFilters.bpm = [60, 180];
                break;
            case 'keys':
                newFilters.keys = (newFilters.keys || []).filter(k => k !== valueToRemove);
                break;
            case 'tags':
                newFilters.tags = (newFilters.tags || []).filter(t => t !== valueToRemove);
                break;
        }
        // Trigger re-fetch by updating state
        // handleFiltersChange(newFilters); // Re-use existing logic to apply and reset page
        return newFilters; // Return the updated filters object
    });
    setCurrentPage(1); // Reset pagination after filter removal
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
    // Consistent Page Container
    <div className="min-h-screen text-white">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="mb-10 sm:mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-2">
            Explore {contentType ? contentType.charAt(0).toUpperCase() + contentType.slice(1) + 's' : 'Sounds'}
          </h1>
          <p className="text-lg text-gray-400">
            Discover your next hit sound.
          </p>
        </header>

        {/* Flex Container for Sidebar and Main Content */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Sidebar */}
          <div className="hidden lg:block w-full lg:w-1/4 xl:w-1/5 flex-shrink-0">
             <FilterSidebar
                className="sticky top-24" // Add sticky positioning for desktop
                onFiltersChange={handleFiltersChange}
                initialFilters={filters} 
             />
           </div>

          {/* Mobile Filter Trigger Button & Sheet */} 
          <div className="mb-6 lg:hidden flex justify-end">
              <Sheet>
                  <SheetTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 bg-white/5 border-white/10 hover:bg-white/10">
                          <ListFilter size={18} />
                          Filters
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="bg-black/90 backdrop-blur-xl border-r border-white/10 text-white w-full max-w-xs p-6 overflow-y-auto">
                      <SheetHeader className="mb-4">
                          <SheetTitle className="text-xl font-semibold flex items-center">
                              <ListFilter size={20} className="mr-2 text-gray-400" />
                              Filters
                          </SheetTitle>
                      </SheetHeader>
                      {/* Render FilterSidebar inside the sheet for mobile */}
                      <FilterSidebar
                          onFiltersChange={handleFiltersChange}
                          initialFilters={filters}
                          // Optionally add a prop to hide the outer sticky container logic if needed
                      />
                      {/* TODO: Consider adding a close button or Apply button inside SheetFooter? */}
                      {/* SheetClose could be used, or rely on the Apply button within FilterSidebar */} 
                  </SheetContent>
              </Sheet>
          </div>

          {/* Main Content Area */}
          <main className="w-full lg:flex-1"> {/* Changed lg:w-3/4 xl:w-4/5 to lg:flex-1 for better flex behavior */}
            {/* Active Filters Display */}
            <ActiveFilters filters={filters} onRemoveFilter={handleRemoveFilter} />

            {/* Search & Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
              <div className="relative w-full sm:max-w-xs">
                <Input
                  type="text"
                  placeholder={`Search ${contentType ? contentType + 's' : 'sounds'}...`}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2.5 text-sm text-white bg-white/5 backdrop-blur-sm border border-white/10 rounded-full focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-transparent"
                />
                 <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>

              {/* Visually Group Layout Toggle and Sort Dropdown */}
              <div className="flex items-center gap-3 p-1 bg-white/5 rounded-full border border-white/10">
                 {/* Layout Toggle (Inner div removed, adjusted styling) */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleLayoutChange('grid')} // Use handler
                    className={cn(
                        "rounded-full w-8 h-8",
                        layoutMode === 'grid' ? 'bg-indigo-500/50 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
                    )}
                    aria-label="Grid view"
                    >
                    <LayoutGrid size={18} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleLayoutChange('list')} // Use handler
                    className={cn(
                        "rounded-full w-8 h-8",
                        layoutMode === 'list' ? 'bg-indigo-500/50 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
                    )}
                    aria-label="List view"
                    >
                    <List size={18} />
                </Button>

                {/* Separator (Optional) */}
                <div className="h-5 w-px bg-white/10 mx-1"></div>

                {/* Sort Dropdown (Adjusted styling) */}
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        {/* Remove default button border/bg, rely on outer container */}
                        <Button variant="ghost" className="flex items-center gap-1 text-sm text-gray-300 hover:text-white px-3 h-8 hover:bg-transparent">
                             <span>{currentSortLabel}</span>
                             <ChevronDown size={16} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48 bg-black/90 backdrop-blur-xl border-white/10 text-gray-300">
                        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10"/>
                        <DropdownMenuRadioGroup value={sortOrder} onValueChange={(value) => handleSortChange(value as SortOrder)}> // Use handler
                             {sortOptions.map((option) => (
                                <DropdownMenuRadioItem key={option.value} value={option.value} className="focus:bg-white/10 cursor-pointer">
                                    {option.label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                 </DropdownMenu>
              </div>
            </div> {/* End Search & Sort Controls */}

            {/* --- Conditional Rendering Section --- */}

            {/* Loading State */}
            {isLoading && (
                <div className="flex justify-center items-center min-h-[300px]">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-400" />
                </div>
            )}

            {/* Error State */}
            {!isLoading && error && (
                <div className="flex flex-col items-center justify-center min-h-[300px] bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
                    <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
                    <p className="text-red-400 font-semibold mb-2">Failed to load beats</p>
                    <p className="text-sm text-gray-400">{error}</p>
                    {/* Optional: Add a retry button if you implement refetch logic */}
                    {/* <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>Retry</Button> */} 
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
                            {displayedBeats.map((beat) => (
                                <BeatCard
                                    key={beat.id}
                                    beat={beat}
                                    // Pass layoutMode if BeatCard needs to adapt its internal style
                                    // layout={layoutMode}
                                />
                            ))}
                        </div>
                    ) : (
                        // Empty State
                        <div className="flex justify-center items-center min-h-[200px]">
                             <p className="text-gray-400 text-center mt-10">
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

          </main> {/* Closing Main Content Area */}
        </div> {/* Closing Flex Container */}
      </div> {/* Closing Page Container */}
    </div> // Closing Root Element
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