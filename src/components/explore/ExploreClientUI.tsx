'use client';

import { Search, LayoutGrid, List, ChevronDown, Loader2, AlertCircle, ListFilter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FilterSidebar } from '@/components/explore/filter-sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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
import { TrackCardSkeleton } from '@/components/track-card-skeleton';
import { TrackGrid } from "@/components/explore/TrackGrid";
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useExploreFilters } from '@/hooks/useExploreFilters';
import { useTrackSearch } from '@/hooks/useTrackSearch';
import { useUIStore } from '@/stores/use-ui-store';
import type { SortOrder, LayoutMode } from '@/hooks/useExploreFilters';

// --- Constants ---
const ITEMS_PER_PAGE = 9;

const sortOptions: { value: SortOrder; label: string }[] = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
];

// --- Props for the Client Component ---
interface ExploreClientUIProps {
  serverSearchParams: { [key: string]: string | string[] | undefined };
}

// --- The Client Component ---
export const ExploreClientUI: React.FC<ExploreClientUIProps> = ({ serverSearchParams }) => {
  // Use custom hooks for filter management and track search
  const {
    filters,
    sortOrder,
    currentPage,
    searchTerm,
    layoutMode,
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
  } = useExploreFilters();

  // UI store for filter panel state
  const { isFilterPanelOpen, openFilterPanel, closeFilterPanel } = useUIStore();

  const {
    displayedBeats,
    currentTotalCount,
    isLoading,
    error,
  } = useTrackSearch();

  // Calculate pagination
  const totalPages = Math.ceil(currentTotalCount / ITEMS_PER_PAGE);
  const activeFilterItems = getActiveFilterItems();

  // UI event handlers
  const handleRemoveFilter = (filterId: string) => {
    handleClearFilter(filterId as keyof typeof filters);
  };

  const handlePageChangeWithValidation = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      handlePageChange(newPage);
    }
  };

  // --- Render Functions ---
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
    <div className="min-h-screen">      
      {/* Main Layout with Sidebar */}
      <div className="flex">
        {/* Filter Sidebar - Static positioned */}
        {isFilterPanelOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '320px', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ 
              type: 'spring',
              stiffness: 300,
              damping: 30,
              duration: 0.4
            }}
            className="flex-shrink-0 bg-neutral-900 border-r border-neutral-700 overflow-hidden"
          >
            <div className="w-80 h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-700">
                <h2 className="text-xl font-semibold text-white">Filters</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeFilterPanel}
                  className="text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Filter Content */}
              <div className="h-[calc(100vh-120px)] overflow-hidden">
                <FilterSidebar 
                  onFiltersApplied={handleSidebarFiltersApplied}
                  isOverlay={false}
                />
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Main Content Area */}
        <div className="flex-1 min-w-0 p-6">
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
          
          {/* Active Filters */}
          {activeFilterItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-neutral-400 mr-1">Active:</span>
                {activeFilterItems.map((item) => (
                  <Badge
                    key={item.id}
                    variant="secondary"
                    className="flex items-center gap-1.5 pl-2 pr-0.5 py-0.5 text-xs font-normal bg-cyan-glow/15 text-cyan-glow hover:bg-cyan-glow/25 border border-cyan-glow/30 shadow-sm transition-colors cursor-default"
                  >
                    {item.label}: {item.value}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFilter(item.id)}
                      className="h-4 w-4 p-0 rounded-full text-cyan-glow/70 hover:text-cyan-glow hover:bg-cyan-glow/20 transition-all"
                      aria-label={`Remove filter: ${item.label}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
                <Button 
                  variant="link" 
                  onClick={handleClearAllFilters} 
                  className="text-xs text-magenta-spark hover:text-magenta-spark/80 h-auto p-0 ml-2"
                >
                  Clear All
                </Button>
              </div>
            </div>
          )}

          {/* Controls Row: Filter, Sort & Layout */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Filter Button */}
              <Button 
                variant="outline" 
                onClick={openFilterPanel}
                className="flex items-center gap-2 bg-neutral-800 border-neutral-700 hover:bg-neutral-700"
              >
                <ListFilter className="w-4 h-4" />
                Filters
                {activeFilterItems.length > 0 && (
                  <span className="ml-1 bg-cyan-glow text-black text-xs px-1.5 py-0.5 rounded-full font-medium">
                    {activeFilterItems.length}
                  </span>
                )}
              </Button>

              <span className="text-sm text-neutral-400">
                {currentTotalCount} track{currentTotalCount !== 1 ? 's' : ''}
              </span>
              
              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-neutral-800 border-neutral-700 hover:bg-neutral-700">
                    Sort: {sortOptions.find(opt => opt.value === sortOrder)?.label || 'Relevance'}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-neutral-800 border-neutral-700">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-neutral-700" />
                  <DropdownMenuRadioGroup value={sortOrder} onValueChange={(value) => handleSortChange(value as SortOrder)}>
                    {sortOptions.map((option) => (
                      <DropdownMenuRadioItem key={option.value} value={option.value} className="hover:bg-neutral-700">
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center gap-1 bg-neutral-800 rounded-lg p-1">
              <Button
                variant={layoutMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => handleLayoutChange('grid')}
                className={cn(
                  "w-8 h-8",
                  layoutMode === 'grid' 
                    ? "bg-cyan-glow text-black hover:bg-cyan-glow/90" 
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700"
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={layoutMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => handleLayoutChange('list')}
                className={cn(
                  "w-8 h-8",
                  layoutMode === 'list' 
                    ? "bg-cyan-glow text-black hover:bg-cyan-glow/90" 
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700"
                )}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${sortOrder}-${currentPage}-${JSON.stringify(activeFilterItems)}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="mb-8"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChangeWithValidation(currentPage - 1);
                    }}
                    className={cn(
                      currentPage <= 1 && "pointer-events-none opacity-50",
                      "bg-neutral-800 border-neutral-700 hover:bg-neutral-700"
                    )}
                  />
                </PaginationItem>
                
                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  const shouldShow = 
                    pageNum === 1 || 
                    pageNum === totalPages || 
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                  
                  if (!shouldShow) return null;
                  
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChangeWithValidation(pageNum);
                        }}
                        isActive={pageNum === currentPage}
                        className={cn(
                          "bg-neutral-800 border-neutral-700 hover:bg-neutral-700",
                          pageNum === currentPage && "bg-cyan-glow text-black hover:bg-cyan-glow/90"
                        )}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChangeWithValidation(currentPage + 1);
                    }}
                    className={cn(
                      currentPage >= totalPages && "pointer-events-none opacity-50",
                      "bg-neutral-800 border-neutral-700 hover:bg-neutral-700"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}; 