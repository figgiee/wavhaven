'use client';

import React, { useState } from 'react';
import { Search, LayoutGrid, List, ChevronDown, Loader2, AlertCircle, X, Filter } from 'lucide-react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { TrackCardSkeleton } from '@/components/track-card-skeleton';
import { TrackGrid } from '@/components/explore/TrackGrid';
import { FilterOverlayPanel } from '@/components/explore/FilterOverlayPanel';
import { useExploreFilters } from '@/hooks/useExploreFilters';
import { useTrackSearch } from '@/hooks/useTrackSearch';
import type { SortOrder, LayoutMode } from '@/hooks/useExploreFilters';

// --- Constants ---
const ITEMS_PER_PAGE = 24;

// --- Helper Function for Pagination ---
const getPaginationRange = (totalPages: number, currentPage: number, siblingCount: number = 1): (number | '...')[] => {
    const totalPageNumbers = siblingCount + 5;

    if (totalPageNumbers >= totalPages) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
        let leftItemCount = 3 + 2 * siblingCount;
        let leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
        return [...leftRange, '...', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
        let rightItemCount = 3 + 2 * siblingCount;
        let rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + i + 1);
        return [firstPageIndex, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
        let middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
        return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
    }
    
    return [];
};

export const ExploreClientUIShadcn: React.FC = () => {
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const {
    filters,
    searchTerm,
    setSearchTerm,
    handleClearFilter,
    handleClearAllFilters,
    sortOrder,
    handleSortChange,
    layoutMode,
    handleLayoutChange,
    currentPage,
    handlePageChange,
    isPending,
    getActiveFilterItems,
    handleSearchInputChange,
    handleClearSearch
  } = useExploreFilters();

  const { displayedBeats, currentTotalCount, isLoading, error } = useTrackSearch();
  const totalPages = Math.ceil(currentTotalCount / ITEMS_PER_PAGE);
  const paginationRange = getPaginationRange(totalPages, currentPage);

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'newest', label: 'Newest First' },
    { value: 'popularity', label: 'Most Popular' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
  ];

  const toggleFilterPanel = () => {
    setIsFilterPanelOpen(!isFilterPanelOpen);
  };

  const renderContent = () => {
    if (isLoading && displayedBeats.length === 0) {
      return (
        <div className={cn(
            "grid gap-3 sm:gap-4",
            layoutMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" : "grid-cols-1"
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
    <div className="min-h-screen bg-background">
      <FilterOverlayPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
      />

      <div className="p-4 md:p-6">
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
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-700"
                >
                    <X className="w-4 h-4" />
                </Button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={toggleFilterPanel}
                variant="outline"
                className="h-10 px-4 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-200"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                 {getActiveFilterItems().length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                        {getActiveFilterItems().length}
                    </Badge>
                )}
              </Button>

              <div className="flex items-center gap-2 flex-wrap">
                {getActiveFilterItems().map(filter => (
                    <Badge key={filter.id} variant="secondary" className="pl-3 pr-1 py-1 text-sm bg-neutral-700/60 border-neutral-600/50">
                        <span>
                            <span className="font-normal text-neutral-400">{filter.label}: </span>
                            {filter.value}
                        </span>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 ml-1 rounded-full hover:bg-neutral-500/30"
                            onClick={() => handleClearFilter(filter.id as any)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </Badge>
                ))}
                {getActiveFilterItems().length > 1 && (
                     <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-xs text-neutral-400 hover:text-red-400"
                        onClick={handleClearAllFilters}
                    >
                        Clear All
                    </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center border border-neutral-700 rounded-md overflow-hidden">
                <Button
                  variant={layoutMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => handleLayoutChange('grid')}
                  className="rounded-none border-0 h-9 px-3"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={layoutMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => handleLayoutChange('list')}
                  className="rounded-none border-0 h-9 px-3 border-l border-neutral-700"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 min-w-[140px] justify-between"
                  >
                    {sortOptions.find(opt => opt.value === sortOrder)?.label || 'Sort by'}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-neutral-800 border-neutral-700 text-neutral-200"
                >
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-neutral-700" />
                  <DropdownMenuRadioGroup value={sortOrder} onValueChange={(value) => handleSortChange(value as SortOrder)}>
                    {sortOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                        className="focus:bg-neutral-700 focus:text-white"
                      >
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-neutral-400">
            <span>
              {isLoading && displayedBeats.length === 0 ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading tracks...</span>
                </div>
              ) : (
                <>Showing <span className="font-bold text-neutral-200">{(currentPage - 1) * ITEMS_PER_PAGE + 1}
                -{(currentPage - 1) * ITEMS_PER_PAGE + (displayedBeats.length ?? 0)}
                </span> of <span className="font-bold text-neutral-200">{currentTotalCount ?? 0}</span> tracks</>
              )}
            </span>
          </div>
        </div>

        {renderContent()}

        <div className="mt-8 flex justify-center">
         {totalPages > 1 && (
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                            className={cn({ 'pointer-events-none text-neutral-600': currentPage === 1 })}
                        />
                    </PaginationItem>

                    {paginationRange.map((page, index) => {
                        if (page === '...') {
                            return <PaginationItem key={`dots-${index}`}><PaginationEllipsis /></PaginationItem>;
                        }
                        return (
                            <PaginationItem key={page}>
                                <PaginationLink
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handlePageChange(page as number); }}
                                    isActive={currentPage === page}
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        );
                    })}

                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                             className={cn({ 'pointer-events-none text-neutral-600': currentPage === totalPages })}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
         )}
        </div>
      </div>
    </div>
  );
}; 