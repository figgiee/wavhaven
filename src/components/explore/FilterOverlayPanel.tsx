'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useExploreFilters, FilterValues } from '@/hooks/useExploreFilters';

// Import filter components
import { GenreFilter } from '@/components/search/GenreFilter';
import { KeyFilter } from '@/components/search/KeyFilter';
import { MoodFilter } from '@/components/search/MoodFilter';
import { TagFilter } from '@/components/search/TagFilter';
import { BpmRangeFilter } from '@/components/search/BpmRangeFilter';
import { PriceRangeFilter } from '@/components/search/PriceRangeFilter';

interface FilterOverlayPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function FilterOverlayPanel({ 
  isOpen, 
  onClose,
  className 
}: FilterOverlayPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { 
    filters: appliedFilters, 
    handleSidebarFiltersApplied, 
    handleClearAllFilters 
  } = useExploreFilters();

  // Temporary local state to hold changes before applying
  const [localFilters, setLocalFilters] = useState<FilterValues>({
    genres: [],
    keys: [],
    moods: [],
    tags: [],
    bpm: [60, 180],
    price: [0, 200],
    keyword: ''
  });

  // Sync local state when applied filters change (e.g., from URL or other components)
  useEffect(() => {
    setLocalFilters({
      keyword: appliedFilters.q || '',
      genres: appliedFilters.genre ? [appliedFilters.genre] : [],
      keys: appliedFilters.key ? [appliedFilters.key] : [],
      moods: appliedFilters.mood ? [appliedFilters.mood] : [],
      tags: [], // Assuming tags are not in the main filter state yet
      bpm: [appliedFilters.minBpm ?? 60, appliedFilters.maxBpm ?? 180],
      price: [appliedFilters.minPrice ?? 0, appliedFilters.maxPrice ?? 200],
    });
  }, [appliedFilters, isOpen]); // Re-sync if panel is reopened

  const handleLocalFilterChange = (field: keyof FilterValues, value: any) => {
    setLocalFilters(prev => ({ ...prev, [field]: value }));
  };

  // Count active filters for badge based on LOCAL state
  const activeFilterCount =
    (localFilters.keyword ? 1 : 0) +
    localFilters.genres.length +
    localFilters.keys.length +
    localFilters.moods.length +
    localFilters.tags.length +
    (localFilters.bpm[0] !== 60 || localFilters.bpm[1] !== 180 ? 1 : 0) +
    (localFilters.price?.[0] !== 0 || localFilters.price?.[1] !== 200 ? 1 : 0);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent background scroll when panel is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleApplyFilters = () => {
    handleSidebarFiltersApplied(localFilters);
    onClose();
  };

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* Filter Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className={cn(
              "fixed left-0 top-0 h-full w-80 bg-neutral-900 border-r border-neutral-700 z-50 flex flex-col shadow-2xl",
              className
            )}
          >
            {/* Header */}
            <div className="p-4 border-b border-neutral-700 bg-neutral-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-neutral-300" />
                  <h2 className="font-semibold text-neutral-100">Filters</h2>
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="text-xs bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                      {activeFilterCount}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAllFilters}
                      className="h-8 text-neutral-400 hover:text-white hover:bg-neutral-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 text-neutral-400 hover:text-white hover:bg-neutral-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {/* Keyword Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300">
                    Keyword Search
                  </label>
                  <Input
                    placeholder="Search in titles, artists, tags..."
                    value={localFilters.keyword}
                    onChange={(e) => handleLocalFilterChange('keyword', e.target.value)}
                    className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500"
                  />
                </div>

                {/* Genres */}
                <div className="space-y-2">
                  <GenreFilter value={localFilters.genres} onChange={(v) => handleLocalFilterChange('genres', v)} />
                </div>

                {/* BPM Range */}
                <div className="space-y-2">
                  <BpmRangeFilter value={localFilters.bpm} onChange={(v) => handleLocalFilterChange('bpm', v)} />
                </div>

                {/* Musical Keys */}
                <div className="space-y-2">
                  <KeyFilter value={localFilters.keys} onChange={(v) => handleLocalFilterChange('keys', v)} />
                </div>

                {/* Moods & Vibes */}
                <div className="space-y-2">
                  <MoodFilter value={localFilters.moods} onChange={(v) => handleLocalFilterChange('moods', v)} />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <TagFilter value={localFilters.tags} onChange={(v) => handleLocalFilterChange('tags', v)} />
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <PriceRangeFilter value={localFilters.price as [number, number]} onChange={(v) => handleLocalFilterChange('price', v)} />
                </div>

                {/* Bottom padding to ensure content doesn't hide behind sticky button */}
                <div className="h-16" />
              </div>
            </ScrollArea>

            {/* Sticky Apply Button */}
            <div className="p-4 border-t border-neutral-700 bg-neutral-900/95 backdrop-blur-sm">
              <Button
                onClick={handleApplyFilters}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
                size="lg"
              >
                Apply Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 