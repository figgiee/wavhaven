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
import { ScrollArea } from "@/components/ui/scroll-area";

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
  className?: string;
  // {/* TODO: Add available options (genres, keys, tags) as props? Fetch them here? */}
}

// Example data - replace with actual fetched or passed data
const availableGenres = ['Hip Hop', 'Trap', 'R&B', 'Lo-Fi', 'Pop', 'Electronic'];
const availableKeys = ['Cmaj', 'Cmin', 'Gmaj', 'Gmin', 'Dmaj', 'Dmin', 'Amaj', 'Amin', 'Emaj', 'Emin', 'Bmaj', 'Bmin', 'F#maj', 'F#min', 'C#maj', 'C#min', 'Fmaj', 'Fmin', 'Bbmaj', 'Bbmin', 'Ebmaj', 'Ebmin', 'Abmaj', 'Abmin'];
const availableTags = ['Dark', 'Smooth', 'Energetic', 'Chill', 'Melodic', 'Hard', 'Wavy', 'Ambient'];
const availableMoods = ['Focused', 'Relaxed', 'Hyped', 'Introspective', 'Aggressive', 'Blissful', 'Nostalgic'];
const defaultBpmRange: [number, number] = [60, 180];
const defaultPriceRange: [number, number] = [0, 200];

export function FilterSidebar({ initialFilters, onFiltersChange, className }: FilterSidebarProps) {
  // {/* TODO: Initialize state properly from props and manage updates */}
  const [keyword, setKeyword] = useState<string>(initialFilters?.keyword || '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialFilters?.genres || []);
  const [bpmRange, setBpmRange] = useState<[number, number]>(initialFilters?.bpm || defaultBpmRange);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initialFilters?.keys || []);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialFilters?.tags || []);
  const [selectedMoods, setSelectedMoods] = useState<string[]>(initialFilters?.moods || []);
  const [priceRange, setPriceRange] = useState<[number, number]>(initialFilters?.price || defaultPriceRange);
  // State for filter inputs
  const [keySearchTerm, setKeySearchTerm] = useState('');
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [moodSearchTerm, setMoodSearchTerm] = useState('');
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [moodPopoverOpen, setMoodPopoverOpen] = useState(false);
  const [genreSearchTerm, setGenreSearchTerm] = useState('');

  const filteredGenres = availableGenres.filter(g => g.toLowerCase().includes(genreSearchTerm.toLowerCase()));
  const filteredKeys = availableKeys.filter(k => k.toLowerCase().includes(keySearchTerm.toLowerCase()));
  const filteredTags = availableTags.filter(t => t.toLowerCase().includes(tagSearchTerm.toLowerCase()));
  const filteredMoods = availableMoods.filter(m => m.toLowerCase().includes(moodSearchTerm.toLowerCase()));

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
      setBpmRange(value);
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

  const handleMoodSelect = (mood: string) => {
    if (!selectedMoods.includes(mood)) {
        handleMultiSelectChange(mood, 'moods');
    }
    setMoodSearchTerm('');
    setMoodPopoverOpen(false);
  };

  // --- Apply and Reset Handlers ---
  const handleApplyFilters = () => {
    const currentFilters = getCurrentFilters();
    console.log('Applying Filters:', currentFilters);
    onFiltersChange?.(currentFilters); // Call the prop function passed from parent
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

  const handlePriceCommit = (value: [number, number]) => {
    setPriceRange(value);
  };

  // Combined handler for multi-select popovers (Keys and Tags)
  const handleMultiSelectChange = (value: string, type: 'keys' | 'tags' | 'moods') => {
    if (type === 'keys') {
        const newKeys = selectedKeys.includes(value) 
            ? selectedKeys.filter(k => k !== value)
            : [...selectedKeys, value];
        setSelectedKeys(newKeys);
    } else if (type === 'tags') {
        const newTags = selectedTags.includes(value)
            ? selectedTags.filter(t => t !== value)
            : [...selectedTags, value];
        setSelectedTags(newTags);
    } else if (type === 'moods') {
        const newMoods = selectedMoods.includes(value)
            ? selectedMoods.filter(m => m !== value)
            : [...selectedMoods, value];
        setSelectedMoods(newMoods);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
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
            <Accordion type="multiple" defaultValue={['genres', 'bpm', 'keys', 'tags', 'moods', 'price']} className="w-full space-y-3">
                {/* Genre Filter */}
                <AccordionItem value="genres" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
                    <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">
                        Genre
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-3 px-3 space-y-1 bg-neutral-800/30 rounded-b-md">
                        <Input 
                            type="text"
                            placeholder="Search genres..."
                            value={genreSearchTerm}
                            onChange={(e) => setGenreSearchTerm(e.target.value)}
                            className="h-8 text-xs mb-2 bg-neutral-700/70 border-neutral-600 placeholder:text-neutral-500 text-neutral-200 focus:ring-cyan-glow focus:border-cyan-glow"
                        />
                        <ScrollArea className="max-h-40 pr-1">
                            {filteredGenres.length > 0 ? filteredGenres.map((genre) => (
                                <div key={genre} className="flex items-center space-x-2.5 py-1.5 px-1 rounded hover:bg-neutral-700/50 transition-colors">
                                    <Checkbox
                                        id={`genre-${genre}`}
                                        checked={selectedGenres.includes(genre)}
                                        onCheckedChange={(checked) => handleGenreChange(genre, !!checked)}
                                        className="border-neutral-600 data-[state=checked]:bg-cyan-glow data-[state=checked]:border-cyan-glow/70 focus-visible:ring-cyan-glow/50 shrink-0"
                                    />
                                    <Label htmlFor={`genre-${genre}`} className="text-xs font-normal text-neutral-300 cursor-pointer select-none">
                                    {genre}
                                    </Label>
                                </div>
                            )) : <p className="text-xs text-neutral-500 text-center py-2">No genres found.</p>}
                        </ScrollArea>
                    </AccordionContent>
                </AccordionItem>

                {/* BPM Filter */}
                <AccordionItem value="bpm" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
                    <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">BPM Range</AccordionTrigger>
                    <AccordionContent className="pt-3 pb-3 px-3 space-y-3 bg-neutral-800/30 rounded-b-md">
                        <Slider
                            value={bpmRange}
                            onValueChange={handleBpmChange}
                            onValueCommit={handleBpmCommit}
                            min={40}
                            max={220}
                            step={1}
                            minStepsBetweenThumbs={5}
                            className="[&>span:first-child]:h-1.5 [&>span:first-child]:bg-neutral-700 [&>span>span]:bg-cyan-glow [&>span>span]:h-3 [&>span>span]:w-3 [&>span>span]:border-2 [&>span>span]:border-neutral-900 [&>span>span:focus-visible]:ring-1 [&>span>span:focus-visible]:ring-cyan-glow/50 [&>span>span:focus-visible]:ring-offset-0 [&>span>span:focus-visible]:shadow-[0_0_0_2px_theme(colors.neutral.900),0_0_0_4px_theme(colors.cyan-glow / 0.4)]"
                        />
                        <div className="flex justify-between items-center gap-2">
                            <Input type="number" value={bpmRange[0]} onChange={(e) => handleBpmInputChange(0, e.target.value)} className="h-8 text-xs text-center bg-neutral-700/70 border-neutral-600 placeholder:text-neutral-500 text-neutral-200 focus:ring-cyan-glow focus:border-cyan-glow" />
                            <span className="text-neutral-500 text-xs">to</span>
                            <Input type="number" value={bpmRange[1]} onChange={(e) => handleBpmInputChange(1, e.target.value)} className="h-8 text-xs text-center bg-neutral-700/70 border-neutral-600 placeholder:text-neutral-500 text-neutral-200 focus:ring-cyan-glow focus:border-cyan-glow" />
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Key Filter (Multi-select Popover) */}
                <AccordionItem value="keys" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
                    <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">Musical Keys</AccordionTrigger>
                    <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between h-9 text-xs bg-neutral-700/70 border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 focus:ring-1 focus:ring-cyan-glow focus:border-cyan-glow">
                                    {selectedKeys.length > 0 ? `${selectedKeys.length} selected` : "Select keys..."}
                                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-neutral-800 border-neutral-700 shadow-xl">
                                <Command className="bg-transparent">
                                    <CommandInput placeholder="Search keys..." value={keySearchTerm} onValueChange={setKeySearchTerm} className="h-8 text-xs bg-neutral-700/50 border-b border-neutral-600 placeholder:text-neutral-500 text-neutral-200 focus:ring-0 focus:border-cyan-glow" />
                                    <CommandList>
                                        <CommandEmpty className="py-4 text-center text-xs text-neutral-500">No keys found.</CommandEmpty>
                                        <ScrollArea className="max-h-48">
                                            <CommandGroup>
                                                {filteredKeys.map((key) => (
                                                    <CommandItem
                                                        key={key}
                                                        value={key}
                                                        onSelect={() => handleMultiSelectChange(key, 'keys')}
                                                        className="text-xs text-neutral-300 hover:!bg-cyan-glow/20 hover:!text-cyan-glow aria-selected:!bg-cyan-glow aria-selected:!text-abyss-blue cursor-pointer py-1.5 px-2"
                                                    >
                                                        <Check className={cn("mr-2 h-3 w-3", selectedKeys.includes(key) ? "opacity-100" : "opacity-0")} />
                                                        {key}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </ScrollArea>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {selectedKeys.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {selectedKeys.map(key => (
                                    <Badge key={key} variant="secondary" className="bg-cyan-glow/20 text-cyan-glow hover:bg-cyan-glow/30 text-xs border-cyan-glow/30 px-1.5 py-0.5 cursor-default">
                                        {key}
                                        <button onClick={() => handleMultiSelectChange(key, 'keys')} className="ml-1 opacity-70 hover:opacity-100"><X size={10}/></button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
                
                {/* Tags Filter (Similar to Keys) */}
                <AccordionItem value="tags" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
                    <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">Tags</AccordionTrigger>
                    <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                         <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between h-9 text-xs bg-neutral-700/70 border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 focus:ring-1 focus:ring-cyan-glow focus:border-cyan-glow">
                                    {selectedTags.length > 0 ? `${selectedTags.length} selected` : "Select tags..."}
                                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-neutral-800 border-neutral-700 shadow-xl">
                                <Command className="bg-transparent">
                                    <CommandInput placeholder="Search or add tags..." value={tagSearchTerm} onValueChange={setTagSearchTerm} className="h-8 text-xs bg-neutral-700/50 border-b border-neutral-600 placeholder:text-neutral-500 text-neutral-200 focus:ring-0 focus:border-cyan-glow" />
                                    <CommandList>
                                        <CommandEmpty className="py-4 text-center text-xs text-neutral-500">
                                            {tagSearchTerm && !availableTags.some(t => t.toLowerCase() === tagSearchTerm.toLowerCase()) 
                                                ? <span>No matching tags. Press Enter to add "{tagSearchTerm}"</span> 
                                                : "No tags found."
                                            }
                                        </CommandEmpty>
                                        <ScrollArea className="max-h-48">
                                            <CommandGroup>
                                                {filteredTags.map((tag) => (
                                                    <CommandItem
                                                        key={tag}
                                                        value={tag}
                                                        onSelect={() => handleTagSelect(tag)}
                                                        className="text-xs text-neutral-300 hover:!bg-cyan-glow/20 hover:!text-cyan-glow aria-selected:!bg-cyan-glow aria-selected:!text-abyss-blue cursor-pointer py-1.5 px-2"
                                                    >
                                                        <Check className={cn("mr-2 h-3 w-3", selectedTags.includes(tag) ? "opacity-100" : "opacity-0")} />
                                                        {tag}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </ScrollArea>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {selectedTags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {selectedTags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="bg-magenta-spark/20 text-magenta-spark hover:bg-magenta-spark/30 text-xs border-magenta-spark/30 px-1.5 py-0.5 cursor-default">
                                        {tag}
                                        <button onClick={() => handleMultiSelectChange(tag, 'tags')} className="ml-1 opacity-70 hover:opacity-100"><X size={10}/></button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>

                {/* Moods Filter (Similar to Tags) */}
                <AccordionItem value="moods" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
                    <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">Moods</AccordionTrigger>
                    <AccordionContent className="pt-2 pb-3 px-3 bg-neutral-800/30 rounded-b-md">
                         <Popover open={moodPopoverOpen} onOpenChange={setMoodPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between h-9 text-xs bg-neutral-700/70 border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 focus:ring-1 focus:ring-cyan-glow focus:border-cyan-glow">
                                    {selectedMoods.length > 0 ? `${selectedMoods.length} selected` : "Select moods..."}
                                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-neutral-800 border-neutral-700 shadow-xl">
                                <Command className="bg-transparent">
                                    <CommandInput placeholder="Search moods..." value={moodSearchTerm} onValueChange={setMoodSearchTerm} className="h-8 text-xs bg-neutral-700/50 border-b border-neutral-600 placeholder:text-neutral-500 text-neutral-200 focus:ring-0 focus:border-cyan-glow" />
                                    <CommandList>
                                        <CommandEmpty className="py-4 text-center text-xs text-neutral-500">No moods found.</CommandEmpty>
                                        <ScrollArea className="max-h-48">
                                            <CommandGroup>
                                                {filteredMoods.map((mood) => (
                                                    <CommandItem
                                                        key={mood}
                                                        value={mood}
                                                        onSelect={() => handleMoodSelect(mood)}
                                                        className="text-xs text-neutral-300 hover:!bg-cyan-glow/20 hover:!text-cyan-glow aria-selected:!bg-cyan-glow aria-selected:!text-abyss-blue cursor-pointer py-1.5 px-2"
                                                    >
                                                        <Check className={cn("mr-2 h-3 w-3", selectedMoods.includes(mood) ? "opacity-100" : "opacity-0")} />
                                                        {mood}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </ScrollArea>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {selectedMoods.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {selectedMoods.map(mood => (
                                    <Badge key={mood} variant="secondary" className="bg-cyan-glow/20 text-cyan-glow hover:bg-cyan-glow/30 text-xs border-cyan-glow/30 px-1.5 py-0.5 cursor-default">
                                        {mood}
                                        <button onClick={() => handleMultiSelectChange(mood, 'moods')} className="ml-1 opacity-70 hover:opacity-100"><X size={10}/></button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>

                {/* Price Range Filter */}
                <AccordionItem value="price" className="border-b-0 rounded-md bg-neutral-800/50 p-0.5 border border-neutral-700/70">
                    <AccordionTrigger className="text-sm font-medium text-neutral-200 hover:no-underline px-3 py-2.5 hover:bg-neutral-700/50 rounded-t-md transition-colors">Price Range</AccordionTrigger>
                    <AccordionContent className="pt-3 pb-3 px-3 space-y-3 bg-neutral-800/30 rounded-b-md">
                        <Slider
                            value={priceRange}
                            onValueChange={setPriceRange} // Continuous update for visual feedback
                            onValueCommit={handlePriceCommit} // Use commit for final application if needed
                            min={0}
                            max={500} // Example max price
                            step={5}
                            minStepsBetweenThumbs={10}
                            className="[&>span:first-child]:h-1.5 [&>span:first-child]:bg-neutral-700 [&>span>span]:bg-magenta-spark [&>span>span]:h-3 [&>span>span]:w-3 [&>span>span]:border-2 [&>span>span]:border-neutral-900 [&>span>span:focus-visible]:ring-1 [&>span>span:focus-visible]:ring-magenta-spark/50 [&>span>span:focus-visible]:ring-offset-0 [&>span>span:focus-visible]:shadow-[0_0_0_2px_theme(colors.neutral.900),0_0_0_4px_theme(colors.magenta-spark / 0.4)]"
                        />
                        <div className="flex justify-between items-center gap-2">
                            <div className="relative flex-1">
                                <DollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500"/>
                                <Input type="number" value={priceRange[0]} onChange={(e) => handlePriceInputChange(0, e.target.value)} className="h-8 text-xs text-center pl-6 bg-neutral-700/70 border-neutral-600 placeholder:text-neutral-500 text-neutral-200 focus:ring-cyan-glow focus:border-cyan-glow" />
                            </div>
                            <span className="text-neutral-500 text-xs">to</span>
                            <div className="relative flex-1">
                                <DollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500"/>
                                <Input type="number" value={priceRange[1]} onChange={(e) => handlePriceInputChange(1, e.target.value)} className="h-8 text-xs text-center pl-6 bg-neutral-700/70 border-neutral-600 placeholder:text-neutral-500 text-neutral-200 focus:ring-cyan-glow focus:border-cyan-glow" />
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </ScrollArea>

        {/* Footer with Apply Button */}
        <div className="p-4 border-t border-neutral-700 mt-auto">
            <Button onClick={handleApplyFilters} className="w-full bg-cyan-glow text-abyss-blue hover:bg-cyan-glow/80 shadow-glow-cyan-md text-sm font-semibold">
                Apply Filters
            </Button>
        </div>
    </div>
  );
} 