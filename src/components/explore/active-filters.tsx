'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Type for the filters, should match the one in ExplorePage/FilterSidebar
// TODO: Share this type definition properly
interface FilterValues {
  genres?: string[];
  bpm?: [number, number];
  keys?: string[];
  tags?: string[];
}

interface ActiveFiltersProps {
  filters: FilterValues;
  onRemoveFilter: (filterType: keyof FilterValues, valueToRemove: string | number | [number, number]) => void;
  className?: string;
}

export function ActiveFilters({ filters, onRemoveFilter, className }: ActiveFiltersProps) {
  const activeFilterItems: { type: keyof FilterValues; value: string | number | [number, number]; label: string }[] = [];

  // Collect active genres
  if (filters.genres && filters.genres.length > 0) {
    filters.genres.forEach(genre => {
      activeFilterItems.push({ type: 'genres', value: genre, label: `Genre: ${genre}` });
    });
  }

  // Collect active BPM range (if different from default)
  // Assuming default BPM range is not explicitly passed, we define it here
  // TODO: Get default from a shared config or pass it as prop
  const defaultBpm: [number, number] = [60, 180]; // Example default
  if (filters.bpm && (filters.bpm[0] !== defaultBpm[0] || filters.bpm[1] !== defaultBpm[1])) {
    activeFilterItems.push({ type: 'bpm', value: filters.bpm, label: `BPM: ${filters.bpm[0]}-${filters.bpm[1]}` });
  }

  // Collect active keys
  if (filters.keys && filters.keys.length > 0) {
    filters.keys.forEach(key => {
      activeFilterItems.push({ type: 'keys', value: key, label: `Key: ${key}` });
    });
  }

  // Collect active tags
  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach(tag => {
      activeFilterItems.push({ type: 'tags', value: tag, label: `Tag: ${tag}` });
    });
  }

  if (activeFilterItems.length === 0) {
    return null; // Don't render anything if no filters are active
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2 mb-4", className)}>
      <span className="text-sm font-medium text-gray-400 mr-2">Active Filters:</span>
      {activeFilterItems.map((item, index) => (
        <Badge
          key={`${item.type}-${index}`}
          variant="secondary"
          className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 text-xs bg-white/10 border border-white/15 text-gray-200"
        >
          {item.label}
          <Button
            variant="ghost"
            size="xs" // Custom small size might be needed
            onClick={() => onRemoveFilter(item.type, item.value)}
            className="h-5 w-5 p-0 rounded-full hover:bg-white/20 text-gray-400 hover:text-white"
            aria-label={`Remove filter: ${item.label}`}
          >
            <X size={12} />
          </Button>
        </Badge>
      ))}
      {/* TODO: Add a "Clear All" button? */}
    </div>
  );
} 