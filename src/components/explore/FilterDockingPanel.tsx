'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/use-ui-store';
import { FilterSidebar } from './filter-sidebar';

interface FilterDockingPanelProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  onFiltersApplied: (filters: any) => void;
}

export function FilterDockingPanel({
  filters,
  onFiltersChange,
  onFiltersApplied,
}: FilterDockingPanelProps) {
  const { isFilterPanelOpen, closeFilterPanel } = useUIStore();

  const handleApplyFilters = () => {
    onFiltersApplied(filters);
    closeFilterPanel();
  };

  return (
    <AnimatePresence>
      {isFilterPanelOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
          className="absolute left-0 top-full w-80 bg-neutral-900/95 backdrop-blur-sm border border-neutral-700 rounded-lg shadow-xl z-40 flex flex-col overflow-hidden"
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-700">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-neutral-400" />
              <h2 className="text-lg font-semibold text-neutral-100">Filters</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeFilterPanel}
              className="h-8 w-8 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <FilterSidebar
              isOverlay={true}
              onFiltersChange={onFiltersChange}
              onFiltersApplied={onFiltersApplied}
            />
          </div>

          {/* Panel Footer */}
          <div className="p-4 border-t border-neutral-700">
            <Button
              onClick={handleApplyFilters}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Apply Filters
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 