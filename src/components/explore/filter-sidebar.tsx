'use client'; // This component will likely need state for filters

import { useState } from 'react';
import { ListFilter, RotateCcw, X, Check, ChevronsUpDown, Search, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
    Command, 
    CommandEmpty, 
    CommandGroup, 
    CommandInput, 
    CommandItem, 
    CommandList 
} from "@/components/ui/command";

// {/* TODO: Define more specific types for filters */}
interface FilterValues {
  keyword?: string;
  genres: string[];
  bpm: [number, number];
  keys: string[];
  tags: string[];
  price?: [number, number];
}

interface FilterSidebarProps {
  initialFilters?: Partial<FilterValues>;
  onFiltersChange?: (filters: FilterValues) => void;
  className?: string;
  // {/* TODO: Add available options (genres, keys, tags) as props? Fetch them here? */}
}

// Example data - replace with actual fetched or passed data
const availableGenres = ['Hip Hop', 'Trap', 'R&B', 'Lo-Fi', 'Pop', 'Electronic'];
const availableKeys = ['Cmaj', 'Cmin', 'Gmaj', 'Gmin', 'Dmaj', 'Dmin', 'Amaj', 'Amin', 'Emaj', 'Emin', 'Bmaj', 'Bmin', 'F#maj', 'F#min', 'C#maj', 'C#min', 'Fmaj', 'Fmin', 'Bbmaj', 'Bbmin', 'Ebmaj', 'Ebmin', 'Abmaj', 'Abmin'];
const availableTags = ['Dark', 'Smooth', 'Energetic', 'Chill', 'Melodic', 'Hard', 'Wavy', 'Ambient'];
const defaultBpmRange: [number, number] = [60, 180];
const defaultPriceRange: [number, number] = [0, 200];

export function FilterSidebar({ initialFilters, onFiltersChange, className }: FilterSidebarProps) {
  // {/* TODO: Initialize state properly from props and manage updates */}
  const [keyword, setKeyword] = useState<string>(initialFilters?.keyword || '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialFilters?.genres || []);
  const [bpmRange, setBpmRange] = useState<[number, number]>(initialFilters?.bpm || defaultBpmRange);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initialFilters?.keys || []);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialFilters?.tags || []);
  const [priceRange, setPriceRange] = useState<[number, number]>(initialFilters?.price || defaultPriceRange);
  // State for filter inputs
  const [keySearchTerm, setKeySearchTerm] = useState('');
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  // Filtered options based on search terms
  const filteredKeys = availableKeys.filter(key => 
    key.toLowerCase().includes(keySearchTerm.toLowerCase())
  );

  // Helper to get current filter state
  const getCurrentFilters = (): FilterValues => ({
    keyword: keyword,
    genres: selectedGenres,
    bpm: bpmRange,
    keys: selectedKeys,
    tags: selectedTags,
    price: priceRange,
  });

  // --- Change Handlers (Update local state only) ---
  const handleKeywordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(event.target.value);
  };

  const handleGenreChange = (genre: string, checked: boolean) => {
    const newGenres = checked
      ? [...selectedGenres, genre]
      : selectedGenres.filter(g => g !== genre);
    setSelectedGenres(newGenres);
    // console.log('Genre changed:', newGenres); // Keep for debugging if needed
  };

  const handleBpmChange = (value: [number, number]) => {
    setBpmRange(value);
    // console.log('BPM changed:', value); // Keep for debugging if needed
    // No immediate call to onFiltersChange
  };

  // Use onValueCommit for Slider to trigger Apply only when user finishes sliding
  // OR rely on the Apply button entirely
  const handleBpmCommit = (value: [number, number]) => {
      // We could potentially trigger apply here, but sticking to explicit button for now
      console.log('BPM commit:', value);
      setBpmRange(defaultBpmRange);
      setSelectedKeys([]);
      setSelectedTags([]);
      setPriceRange(defaultPriceRange);
      setKeyword('');
      console.log('Filters reset, applying empty filters');
      // Also apply the reset immediately
      onFiltersChange?.({ genres: [], bpm: defaultBpmRange, keys: [], tags: [], price: defaultPriceRange });
  };

   const handleKeyChange = (key: string, checked: boolean) => {
    const newKeys = checked
      ? [...selectedKeys, key]
      : selectedKeys.filter(k => k !== key);
    setSelectedKeys(newKeys);
    // console.log('Key changed:', newKeys);
  };

   const handleTagChange = (tag: string, add: boolean) => {
    let newTags;
    if (add) {
        // Add tag only if it's not already selected
        newTags = selectedTags.includes(tag) ? selectedTags : [...selectedTags, tag];
    } else {
        // Remove tag
        newTags = selectedTags.filter(t => t !== tag);
    }
    setSelectedTags(newTags);
    console.log('Tag selection changed:', newTags);
  };

  const handleTagSelect = (tag: string) => {
      // Add the tag if it's not already selected
      if (!selectedTags.includes(tag)) {
          handleTagChange(tag, true); // Use existing handler to add
      }
      setTagSearchTerm(''); // Clear search input after selection
      setTagPopoverOpen(false); // Close popover after selection
  };

  // --- Apply and Reset Handlers ---
  const handleApplyFilters = () => {
    const currentFilters = getCurrentFilters();
    console.log('Applying Filters:', currentFilters);
    onFiltersChange?.(currentFilters); // Call the prop function passed from parent
  };

  const handleBpmInputChange = (index: number, value: string) => {
    const newValue = parseInt(value, 10);
    // Basic validation: Ensure it's a number and within overall min/max
    if (!isNaN(newValue) && newValue >= 40 && newValue <= 220) {
      const newBpmRange = [...bpmRange] as [number, number];
      newBpmRange[index] = newValue;
      // Ensure min doesn't exceed max and vice-versa
      if (index === 0 && newValue > newBpmRange[1]) {
        newBpmRange[1] = newValue; // Adjust max if min exceeds it
      }
      if (index === 1 && newValue < newBpmRange[0]) {
        newBpmRange[0] = newValue; // Adjust min if max is less than it
      }
      setBpmRange(newBpmRange);
    }
  };

  const handlePriceInputChange = (index: number, value: string) => {
    const newValue = parseInt(value, 10);
    // Basic validation: Ensure it's a number and >= 0
    if (!isNaN(newValue) && newValue >= 0) {
      const newPriceRange = [...priceRange] as [number, number];
      newPriceRange[index] = newValue;
      // Ensure min doesn't exceed max and vice-versa
      if (index === 0 && newValue > newPriceRange[1]) {
        newPriceRange[1] = newValue; // Adjust max if min exceeds it
      }
      if (index === 1 && newValue < newPriceRange[0]) {
        newPriceRange[0] = newValue; // Adjust min if max is less than it
      }
      setPriceRange(newPriceRange);
    }
  };

  return (
    <aside className={cn("w-full", className)}>
      <div>
        {/* Header and Reset Button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <ListFilter size={20} className="mr-2 text-gray-400" />
            Filters
          </h2>
          <Button variant="ghost" size="sm" onClick={handleApplyFilters} className="text-xs text-gray-400 hover:text-white">
            <RotateCcw size={14} className="mr-1" />
            Reset
          </Button>
        </div>

        {/* Filters Accordion */}
        <div className="bg-gradient-to-br from-white/5 to-white/[.02] rounded-lg p-4 backdrop-blur-md border border-white/10 space-y-4">
          {/* Keyword Search - Placed outside accordion for prominence */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              type="text"
              placeholder="Search by keyword..."
              value={keyword}
              onChange={handleKeywordChange}
              className="h-10 text-sm pl-10 bg-white/5 border-white/10 focus:ring-indigo-500/60 focus:border-indigo-500/30"
            />
          </div>

          <Accordion type="multiple" defaultValue={['item-1', 'item-2', 'item-3', 'item-4', 'item-5']} className="w-full">
            {/* Genre Filter */}
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-base hover:no-underline">Genre</AccordionTrigger>
              <AccordionContent className="pt-3 space-y-2 max-h-60 overflow-y-auto pr-2">
                {availableGenres.map((genre) => (
                  <div key={genre} className="flex items-center space-x-2">
                    <Checkbox
                        id={`genre-${genre}`}
                        checked={selectedGenres.includes(genre)}
                        onCheckedChange={(checked) => handleGenreChange(genre, !!checked)}
                        className="border-gray-600 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                    />
                    <Label htmlFor={`genre-${genre}`} className="text-sm font-normal text-gray-200 cursor-pointer">
                      {genre}
                    </Label>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* BPM Filter */}
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-base hover:no-underline">BPM</AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <Slider
                  value={bpmRange}
                  onValueChange={handleBpmChange} // Updates state while sliding
                  onValueCommit={handleBpmCommit} // Can use this later if needed
                  min={40}
                  max={220}
                  step={1}
                  minStepsBetweenThumbs={5}
                  className="[&>span:first-child]:h-1 [&>span>span]:bg-indigo-500 [&>span>span]:h-1.5 [&>span>span]:w-1.5 [&>span>span]:border-0 [&>span>span:focus-visible]:ring-0 [&>span>span:focus-visible]:ring-offset-0 [&>span>span:focus-visible]:shadow-[0_0_0_3px_rgba(99,102,241,0.5)]"
                 />
                 <div className="flex justify-between items-center gap-3">
                    <div className="flex-1 space-y-1">
                        <Label htmlFor="min-bpm" className="text-xs text-gray-400">Min BPM</Label>
                        <Input 
                            id="min-bpm"
                            type="number"
                            value={bpmRange[0]}
                            onChange={(e) => handleBpmInputChange(0, e.target.value)}
                            min={40}
                            max={bpmRange[1]} // Dynamic max based on the other thumb
                            step={1}
                            className="h-8 text-sm bg-white/5 border-white/10 focus:ring-indigo-500/60 focus:border-indigo-500/30"
                         />
                     </div>
                     <div className="flex-1 space-y-1">
                        <Label htmlFor="max-bpm" className="text-xs text-gray-400">Max BPM</Label>
                         <Input 
                            id="max-bpm"
                            type="number"
                            value={bpmRange[1]}
                            onChange={(e) => handleBpmInputChange(1, e.target.value)}
                            min={bpmRange[0]} // Dynamic min based on the other thumb
                            max={220}
                            step={1}
                            className="h-8 text-sm bg-white/5 border-white/10 focus:ring-indigo-500/60 focus:border-indigo-500/30"
                         />
                    </div>
                 </div>
              </AccordionContent>
            </AccordionItem>

            {/* Key Filter */}
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-base hover:no-underline">Key</AccordionTrigger>
              <AccordionContent className="pt-3 space-y-3">
                {/* Key Search Input */}
                <Input 
                  type="text"
                  placeholder="Search keys..."
                  value={keySearchTerm}
                  onChange={(e) => setKeySearchTerm(e.target.value)}
                  className="h-8 text-sm bg-white/10 border-white/15 focus:ring-indigo-500/60 focus:border-indigo-500/30"
                />
                {/* Key List (Scrollable) */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {filteredKeys.length > 0 ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {filteredKeys.map((key) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox 
                              id={`key-${key}`}
                              checked={selectedKeys.includes(key)}
                              onCheckedChange={(checked) => handleKeyChange(key, !!checked)}
                              className="border-gray-600 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                          />
                          <Label htmlFor={`key-${key}`} className="text-sm font-normal text-gray-200 cursor-pointer">
                            {key}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-2">No keys found.</p>
                  )}
                 </div>
              </AccordionContent>
            </AccordionItem>

            {/* Tags Filter */}
            <AccordionItem value="item-4" className="border-b-0">
              <AccordionTrigger className="text-base hover:no-underline">Tags</AccordionTrigger>
              <AccordionContent className="pt-3 space-y-3">
                {/* Tag Combobox using Command and Popover */}
                <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={tagPopoverOpen}
                      className="w-full justify-between h-9 bg-white/10 border-white/15 hover:bg-white/15 text-gray-300 font-normal"
                    >
                      {selectedTags.length > 0 
                        ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected` 
                        : "Select tags..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-gray-900 border-gray-700">
                    <Command>
                      <CommandInput 
                        placeholder="Search tags..." 
                        value={tagSearchTerm} 
                        onValueChange={setTagSearchTerm} // Update search term state
                        className="h-9 text-white border-0 ring-0 focus:ring-0 bg-transparent placeholder:text-gray-500"
                      />
                      <CommandList>
                        <CommandEmpty className="py-6 text-center text-sm text-gray-400">No tags found.</CommandEmpty>
                        <CommandGroup>
                          {availableTags.map((tag) => (
                            <CommandItem
                              key={tag}
                              value={tag} // Used for filtering by CommandInput
                              onSelect={() => handleTagSelect(tag)} // Call handler on select
                              className="text-gray-200 aria-selected:bg-indigo-600/50 aria-selected:text-white cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedTags.includes(tag) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {tag}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Display Selected Tags */}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {selectedTags.map(tag => (
                      <Badge 
                        key={tag} 
                        variant="secondary"
                        className="flex items-center gap-1 pl-2 pr-0.5 py-0.5 text-xs bg-indigo-500/20 border-indigo-500/30 text-indigo-200"
                      >
                        {tag}
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleTagChange(tag, false)}
                          className="h-4 w-4 p-0 rounded-full hover:bg-indigo-500/40 text-indigo-300 hover:text-white"
                          aria-label={`Remove tag: ${tag}`}
                        >
                          <X size={10} />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Price Filter */}
            <AccordionItem value="item-5">
              <AccordionTrigger className="text-base hover:no-underline">Price Range</AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <Slider
                  value={priceRange}
                  onValueChange={handlePriceInputChange}
                  min={0}
                  max={500}
                  step={5}
                  minStepsBetweenThumbs={1}
                  className="[&>span:first-child]:h-1 [&>span>span]:bg-indigo-500 [&>span>span]:h-1.5 [&>span>span]:w-1.5 [&>span>span]:border-0 [&>span>span:focus-visible]:ring-0 [&>span>span:focus-visible]:ring-offset-0 [&>span>span:focus-visible]:shadow-[0_0_0_3px_rgba(99,102,241,0.5)]"
                 />
                 <div className="flex justify-between items-center gap-3">
                    <div className="flex-1 space-y-1">
                        <Label htmlFor="min-price" className="text-xs text-gray-400">Min Price ($)</Label>
                        <Input 
                            id="min-price"
                            type="number"
                            value={priceRange[0]}
                            onChange={(e) => handlePriceInputChange(0, e.target.value)}
                            min={0}
                            max={priceRange[1]}
                            step={1}
                            className="h-8 text-sm bg-white/5 border-white/10 focus:ring-indigo-500/60 focus:border-indigo-500/30"
                         />
                     </div>
                     <div className="flex-1 space-y-1">
                        <Label htmlFor="max-price" className="text-xs text-gray-400">Max Price ($)</Label>
                         <Input 
                            id="max-price"
                            type="number"
                            value={priceRange[1]}
                            onChange={(e) => handlePriceInputChange(1, e.target.value)}
                            min={priceRange[0]}
                            max={500}
                            step={1}
                            className="h-8 text-sm bg-white/5 border-white/10 focus:ring-indigo-500/60 focus:border-indigo-500/30"
                         />
                    </div>
                 </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>

          {/* Apply Filters Button */}
          <Button
            onClick={handleApplyFilters}
            className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </aside>
  );
} 