'use client'; // This component will likely need state for filters

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListFilter, RotateCcw, X, Check, ChevronsUpDown, Search, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { GenreFilter } from '@/components/search/GenreFilter';
import { KeyFilter } from '@/components/search/KeyFilter';
import { MoodFilter } from '@/components/search/MoodFilter';
import { TagFilter } from '@/components/search/TagFilter';
import { BpmRangeFilter } from '@/components/search/BpmRangeFilter';
import { PriceRangeFilter } from '@/components/search/PriceRangeFilter';

// {/* TODO: Define more specific types for filters */}
interface FilterValues {
  keyword?: string;
  genres: string[];
  bpm: [number, number];
  keys: string[];
  tags: string[];
  moods: string[];
  price?: [number, number];
}

interface FilterSidebarProps {
  initialFilters?: Partial<FilterValues>;
  onFiltersChange?: (filters: FilterValues) => void;
  onFiltersApplied?: (filters: FilterValues) => void;
  className?: string;
  isOverlay?: boolean;
  // {/* TODO: Add available options (genres, keys, tags) as props? Fetch them here? */}
}

// Default ranges for sliders
const defaultBpmRange: [number, number] = [60, 180];
const defaultPriceRange: [number, number] = [0, 200];

export function FilterSidebar({ initialFilters, onFiltersChange, onFiltersApplied, className, isOverlay = false }: FilterSidebarProps) {
  // Sidebar collapse state - defaults to closed
  const [isOpen, setIsOpen] = useState(false);

  // {/* TODO: Initialize state properly from props and manage updates */}
  const [keyword, setKeyword] = useState<string>(initialFilters?.keyword || '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialFilters?.genres || []);
  const [bpmRange, setBpmRange] = useState<[number, number]>(initialFilters?.bpm || defaultBpmRange);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initialFilters?.keys || []);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialFilters?.tags || []);
  const [selectedMoods, setSelectedMoods] = useState<string[]>(initialFilters?.moods || []);
  const [priceRange, setPriceRange] = useState<[number, number]>(initialFilters?.price || defaultPriceRange);


  // Helper to get current filter state
  const getCurrentFilters = (): FilterValues => ({
    keyword: keyword,
    genres: selectedGenres,
    bpm: bpmRange,
    keys: selectedKeys,
    tags: selectedTags,
    moods: selectedMoods,
    price: priceRange,
  });

  // --- Change Handlers (Update local state only) ---
  const handleKeywordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(event.target.value);
  };



  // --- Apply and Reset Handlers ---
  const handleApplyFilters = () => {
    const currentFilters = getCurrentFilters();
    console.log('Applying Filters:', currentFilters);
    onFiltersChange?.(currentFilters); // Call the prop function passed from parent
    onFiltersApplied?.(currentFilters); // Also call the applied handler for overlay mode
  };

  const handleResetFilters = () => {
    setKeyword('');
    setSelectedGenres([]);
    setBpmRange(defaultBpmRange);
    setSelectedKeys([]);
    setSelectedTags([]);
    setSelectedMoods([]);
    setPriceRange(defaultPriceRange);
    // Immediately apply these reset filters
    onFiltersChange?.({
        keyword: '',
        genres: [],
        bpm: defaultBpmRange,
        keys: [],
        tags: [],
        moods: [],
        price: defaultPriceRange,
    });
  };





  // Animation variants
  const sidebarVariants = {
    closed: {
      width: "48px",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        duration: 0.6
      }
    },
    open: {
      width: "320px",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        duration: 0.6
      }
    }
  };

  const contentVariants = {
    closed: {
      opacity: 0,
      y: -30,
      scale: 0.95,
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    },
    open: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        delay: 0.2,
        ease: "easeOut"
      }
    }
  };

  // Render different structure for overlay vs standalone mode
  if (isOverlay) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        {/* Scrollable Filter Area */}
        <ScrollArea className="flex-grow p-4">
          {/* Reset Button */}
          <div className="flex justify-end mb-4">
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-neutral-400 hover:text-magenta-spark px-2 py-1">
              <RotateCcw size={13} className="mr-1.5" />
              Reset All
            </Button>
          </div>

          <Accordion type="multiple" defaultValue={['keyword', 'genres', 'bpm', 'keys', 'moods', 'tags', 'price']} className="w-full space-y-3">
            {/* Keyword Search */}
            <AccordionItem value="keyword" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
              <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">
                Keyword Search
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                <Input 
                  type="text"
                  placeholder="Search in titles, artists, tags..."
                  value={keyword}
                  onChange={handleKeywordChange}
                  className="h-9 text-sm bg-neutral-700/70 border-neutral-600 placeholder:text-neutral-500 text-neutral-200 focus:ring-cyan-glow focus:border-cyan-glow"
                />
              </AccordionContent>
            </AccordionItem>

            {/* Genre Filter */}
            <AccordionItem value="genres" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
              <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">
                Genres
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                <GenreFilter value={selectedGenres} onChange={setSelectedGenres} />
              </AccordionContent>
            </AccordionItem>

            {/* BPM Filter */}
            <AccordionItem value="bpm" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
              <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">
                BPM Range
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                <BpmRangeFilter value={bpmRange} onChange={setBpmRange} />
              </AccordionContent>
            </AccordionItem>

            {/* Key Filter */}
            <AccordionItem value="keys" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
              <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">
                Musical Keys
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                <KeyFilter value={selectedKeys} onChange={setSelectedKeys} />
              </AccordionContent>
            </AccordionItem>

            {/* Mood Filter */}
            <AccordionItem value="moods" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
              <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">
                Moods & Vibes
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                <MoodFilter value={selectedMoods} onChange={setSelectedMoods} />
              </AccordionContent>
            </AccordionItem>

            {/* Tag Filter */}
            <AccordionItem value="tags" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
              <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">
                Tags
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                <TagFilter value={selectedTags} onChange={setSelectedTags} />
              </AccordionContent>
            </AccordionItem>

            {/* Price Filter */}
            <AccordionItem value="price" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
              <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">
                Price Range
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                <PriceRangeFilter value={priceRange} onChange={setPriceRange} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>

        {/* Apply Button */}
        <div className="p-4 border-t border-neutral-700/50 bg-neutral-800/30 backdrop-blur-sm">
          <Button 
            onClick={handleApplyFilters}
            className="w-full bg-cyan-glow hover:bg-cyan-glow/90 text-abyss-blue font-medium"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    );
  }

  // Standalone mode with animations and toggle button
  return (
    <motion.div 
      className={cn("relative flex flex-col h-full bg-neutral-900/50 border-r border-neutral-700", className)}
      variants={sidebarVariants}
      animate={isOpen ? "open" : "closed"}
      initial="closed"
    >
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-4 z-10 bg-neutral-800 border border-neutral-700 rounded-full p-1.5 hover:bg-neutral-700 transition-colors"
        whileHover={{ scale: 1.15, y: -1 }}
        whileTap={{ scale: 0.9 }}
        animate={{ 
          rotate: isOpen ? 180 : 0,
          y: isOpen ? 2 : 0
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {isOpen ? (
          <ChevronLeft size={16} className="text-neutral-300" />
        ) : (
          <ChevronRight size={16} className="text-neutral-300" />
        )}
      </motion.button>

      {/* Collapsed State - Show only icon */}
      {!isOpen && (
        <div className="flex flex-col items-center py-4">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 hover:bg-neutral-700/50 rounded-lg transition-colors"
          >
            <ListFilter size={20} className="text-cyan-glow" />
          </button>
        </div>
      )}

      {/* Expanded Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="flex flex-col h-full"
            variants={contentVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-neutral-700">
                <h2 className="text-lg font-semibold text-neutral-100 flex items-center">
                    <ListFilter size={18} className="mr-2.5 text-cyan-glow" />
                    Filter Sounds
                </h2>
                <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-neutral-400 hover:text-magenta-spark px-2 py-1">
                    <RotateCcw size={13} className="mr-1.5" />
                    Reset All
                </Button>
            </div>

            {/* Scrollable Filter Area */}
            <ScrollArea className="flex-grow p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <Accordion type="multiple" defaultValue={['keyword', 'genres', 'bpm', 'keys', 'moods', 'tags', 'price']} className="w-full space-y-3">
                    {/* Keyword Search */}
                    <AccordionItem value="keyword" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
                      <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">
                        Keyword Search
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                        <Input 
                          type="text"
                          placeholder="Search in titles, artists, tags..."
                          value={keyword}
                          onChange={handleKeywordChange}
                          className="h-9 text-sm bg-neutral-700/70 border-neutral-600 placeholder:text-neutral-500 text-neutral-200 focus:ring-cyan-glow focus:border-cyan-glow"
                        />
                      </AccordionContent>
                    </AccordionItem>

                    {/* Genre Filter */}
                    <AccordionItem value="genres" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
                      <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">
                        Genres
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                        <GenreFilter value={selectedGenres} onChange={setSelectedGenres} />
                      </AccordionContent>
                    </AccordionItem>

                    {/* BPM Filter */}
                    <AccordionItem value="bpm" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
                      <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">
                        BPM Range
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                        <BpmRangeFilter value={bpmRange} onChange={setBpmRange} />
                      </AccordionContent>
                    </AccordionItem>

                    {/* Key Filter */}
                    <AccordionItem value="keys" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
                      <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">
                        Musical Keys
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                        <KeyFilter value={selectedKeys} onChange={setSelectedKeys} />
                      </AccordionContent>
                    </AccordionItem>

                    {/* Mood Filter */}
                    <AccordionItem value="moods" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
                      <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">
                        Moods & Vibes
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                        <MoodFilter value={selectedMoods} onChange={setSelectedMoods} />
                      </AccordionContent>
                    </AccordionItem>

                    {/* Tag Filter */}
                    <AccordionItem value="tags" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
                      <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">
                        Tags
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                        <TagFilter value={selectedTags} onChange={setSelectedTags} />
                      </AccordionContent>
                    </AccordionItem>

                    {/* Price Filter */}
                    <AccordionItem value="price" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
                      <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">
                        Price Range
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                        <PriceRangeFilter value={priceRange} onChange={setPriceRange} />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </motion.div>
            </ScrollArea>

            {/* Footer with Apply Button */}
            <div className="p-4 border-t border-neutral-700 mt-auto">
                <Button onClick={handleApplyFilters} className="w-full bg-cyan-glow text-abyss-blue hover:bg-cyan-glow/80 shadow-glow-cyan-md text-sm font-semibold">
                    Apply Filters
                </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 