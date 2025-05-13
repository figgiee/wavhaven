'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GenreFilter } from '@/components/search/GenreFilter';
import { MoodFilter } from '@/components/search/MoodFilter';
import { BpmRangeFilter } from '@/components/search/BpmRangeFilter';
import { KeyFilter } from '@/components/search/KeyFilter';
import { PriceRangeFilter } from '@/components/search/PriceRangeFilter';
import { LicenseTypeFilter } from '@/components/search/LicenseTypeFilter';
import { LicenseType } from '@prisma/client';

interface FilterSidebarProps {
  // TODO: Pass initial filter values from search params if needed
  onApplyFilters: (filters: AppliedFilters) => void; // Callback when Apply is clicked
  onClose?: () => void; // Optional callback to close the Sheet/Drawer
}

export interface AppliedFilters {
  genre?: string;
  mood?: string;
  minBpm?: number;
  maxBpm?: number;
  key?: string;
  minPrice?: number;
  maxPrice?: number;
  licenseTypes?: LicenseType[];
}

// Default values for range filters (match component defaults)
const DEFAULT_BPM_RANGE: [number, number] = [60, 180];
const DEFAULT_PRICE_RANGE: [number, number] = [0, 200];

export function FilterSidebar({ onApplyFilters, onClose }: FilterSidebarProps) {
  // State for each filter
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [mood, setMood] = useState<string | undefined>(undefined);
  const [bpmRange, setBpmRange] = useState<[number, number] | undefined>(undefined);
  const [key, setKey] = useState<string | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<[number, number] | undefined>(undefined);
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[] | undefined>(undefined);

  // Handler for applying filters
  const handleApply = useCallback(() => {
    const appliedFilters: AppliedFilters = {
      genre,
      mood,
      minBpm: bpmRange?.[0],
      maxBpm: bpmRange?.[1],
      key,
      minPrice: priceRange?.[0],
      maxPrice: priceRange?.[1],
      licenseTypes,
    };
    // Remove undefined properties before calling callback
    Object.keys(appliedFilters).forEach(key => {
        if ((appliedFilters as any)[key] === undefined) {
            delete (appliedFilters as any)[key];
        }
    });
    console.log('Applying Filters:', appliedFilters); // Log for now
    onApplyFilters(appliedFilters);
    onClose?.(); // Close the sheet after applying
  }, [genre, mood, bpmRange, key, priceRange, licenseTypes, onApplyFilters, onClose]);

  // Handler for clearing filters
  const handleClear = useCallback(() => {
    setGenre(undefined);
    setMood(undefined);
    setBpmRange(undefined);
    setKey(undefined);
    setPriceRange(undefined);
    setLicenseTypes(undefined);
    // Optionally call onApplyFilters({}) immediately or require explicit Apply
    console.log('Filters Cleared');
     // Apply empty filters immediately
    onApplyFilters({});
    // onClose?.(); // Maybe don't close on clear? User might want to set new filters.
  }, [onApplyFilters]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Filters</h2>
      </div>

      {/* Filters Content */}
      <ScrollArea className="flex-grow p-4">
        <div className="space-y-6">
          <GenreFilter value={genre} onChange={setGenre} />
          <MoodFilter value={mood} onChange={setMood} />
          <BpmRangeFilter value={bpmRange} onChange={setBpmRange} />
          <KeyFilter value={key} onChange={setKey} />
          <PriceRangeFilter value={priceRange} onChange={setPriceRange} />
          <LicenseTypeFilter value={licenseTypes} onChange={setLicenseTypes} />
        </div>
      </ScrollArea>

      {/* Footer with Buttons */}
      <div className="p-4 border-t border-border mt-auto">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClear} className="w-full">Clear All</Button>
          <Button onClick={handleApply} className="w-full bg-cyan-glow text-abyss-blue hover:bg-cyan-glow/90 active:bg-cyan-glow/80 shadow-glow-cyan-sm font-semibold">Apply Filters</Button>
        </div>
      </div>
    </div>
  );
} 