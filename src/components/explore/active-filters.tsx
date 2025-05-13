'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Type for the filters, should match the one in ExplorePage/FilterSidebar
// TODO: Share this type definition properly
interface FilterValues {
  keyword?: string;
  genres?: string[];
  bpm?: [number, number];
  keys?: string[];
  tags?: string[];
  price?: [number, number];
}

interface ActiveFiltersProps {
  filters: FilterValues;
  onFiltersChange: (newFilters: Partial<FilterValues>) => void;
  defaultBpmRange: [number, number];
  defaultPriceRange: [number, number];
  className?: string;
}

export function ActiveFilters({ 
    filters, 
    onFiltersChange, 
    defaultBpmRange, 
    defaultPriceRange, 
    className 
}: ActiveFiltersProps) {
  const activeFilterItems: { type: keyof FilterValues; value: string | number | [number, number]; label: string }[] = [];

  if (filters.keyword) {
    activeFilterItems.push({ type: 'keyword', value: filters.keyword, label: `Search: "${filters.keyword}"` });
  }
  if (filters.genres && filters.genres.length > 0) {
    filters.genres.forEach(genre => {
      activeFilterItems.push({ type: 'genres', value: genre, label: `${genre}` });
    });
  }
  if (filters.bpm && (filters.bpm[0] !== defaultBpmRange[0] || filters.bpm[1] !== defaultBpmRange[1])) {
    activeFilterItems.push({ type: 'bpm', value: filters.bpm, label: `BPM: ${filters.bpm[0]}-${filters.bpm[1]}` });
  }
  if (filters.keys && filters.keys.length > 0) {
    filters.keys.forEach(key => {
      activeFilterItems.push({ type: 'keys', value: key, label: `${key}` });
    });
  }
  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach(tag => {
      activeFilterItems.push({ type: 'tags', value: tag, label: `${tag}` });
    });
  }
  if (filters.price && (filters.price[0] !== defaultPriceRange[0] || filters.price[1] !== defaultPriceRange[1])) {
    activeFilterItems.push({ type: 'price', value: filters.price, label: `Price: $${filters.price[0]}-$${filters.price[1]}` });
  }

  const handleRemove = (type: keyof FilterValues, value: any) => {
    let newFilters = { ...filters };
    switch (type) {
        case 'keyword':
            newFilters.keyword = '';
            break;
        case 'genres':
            newFilters.genres = filters.genres?.filter(g => g !== value);
            break;
        case 'bpm':
            newFilters.bpm = defaultBpmRange;
            break;
        case 'keys':
            newFilters.keys = filters.keys?.filter(k => k !== value);
            break;
        case 'tags':
            newFilters.tags = filters.tags?.filter(t => t !== value);
            break;
        case 'price':
            newFilters.price = defaultPriceRange;
            break;
    }
    onFiltersChange(newFilters);
  };

  const handleClearAll = () => {
    onFiltersChange({
        keyword: '',
        genres: [],
        bpm: defaultBpmRange,
        keys: [],
        tags: [],
        price: defaultPriceRange,
    });
  };

  if (activeFilterItems.length === 0) {
    return null;
  }

  return (
    <div className={cn("mb-6 md:mb-8 p-3 rounded-md bg-neutral-800/40 border border-neutral-700/60", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-neutral-400 mr-1">Active:</span>
        {activeFilterItems.map((item, index) => (
          <Badge
            key={`${item.type}-${index}-${typeof item.value === 'string' ? item.value : item.value.join('-')}`}
            variant="secondary"
            className="flex items-center gap-1.5 pl-2 pr-0.5 py-0.5 text-xs font-normal bg-cyan-glow/15 text-cyan-glow hover:bg-cyan-glow/25 border border-cyan-glow/30 shadow-sm transition-colors cursor-default"
          >
            {item.label}
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => handleRemove(item.type, item.value)}
              className="h-4 w-4 p-0 rounded-full text-cyan-glow/70 hover:text-cyan-glow hover:bg-cyan-glow/20 transition-all"
              aria-label={`Remove filter: ${item.label}`}
            >
              <X size={10} />
            </Button>
          </Badge>
        ))}
        {activeFilterItems.length > 0 && (
            <Button variant="link" onClick={handleClearAll} className="text-xs text-magenta-spark hover:text-magenta-spark/80 h-auto p-0 ml-auto">
                Clear All
            </Button>
        )}
      </div>
    </div>
  );
} 