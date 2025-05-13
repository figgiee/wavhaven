"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon, Loader2, XIcon, Music, UserCircle, CornerUpLeft } from 'lucide-react';
import { useUIStore } from '@/stores/use-ui-store';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Dummy search result type - replace with actual types later
interface SearchResultItem {
  id: string;
  type: 'track' | 'producer' | 'genre' | 'playlist';
  title: string;
  description?: string;
  imageUrl?: string;
  url: string;
}

export function GlobalSearchModal() {
  const isSearchModalOpen = useUIStore((state) => state.isSearchModalOpen);
  const closeSearchModal = useUIStore((state) => state.closeSearchModal);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Fetch search results when debounced search term changes
  useEffect(() => {
    if (debouncedSearchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 750));
      // Replace with actual API call to your search endpoint
      const dummyResults: SearchResultItem[] = [
        { id: '1', type: 'track', title: `Found Track: ${debouncedSearchTerm} Alpha`, description: 'By Artist One', imageUrl: '/coverart/vitality.png', url: '/track/vitality' },
        { id: '2', type: 'producer', title: `Producer: ${debouncedSearchTerm} Beats`, description: '15 tracks available', imageUrl: '/coverart/nebula.png', url: '/u/producer-beats' },
        { id: '3', type: 'track', title: `Another Track: ${debouncedSearchTerm} Beta`, description: 'By Artist Two', imageUrl: '/coverart/ethereal-echoes.png', url: '/track/ethereal-echoes' },
        { id: '4', type: 'genre', title: `Genre: ${debouncedSearchTerm} Pop`, url: '/explore?genre=pop' },
      ].filter(item => item.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      setSearchResults(dummyResults);
      setIsLoading(false);
    };

    fetchResults();
  }, [debouncedSearchTerm]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeSearchModal();
      setSearchTerm(''); // Reset search term on close
      setSearchResults([]); // Clear results on close
    }
  };

  return (
    <Dialog open={isSearchModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-abyss-blue/90 backdrop-blur-xl border-neutral-700/70 text-neutral-100 shadow-2xl sm:max-w-2xl max-h-[80vh] flex flex-col p-0 rounded-xl">
        <DialogHeader className="p-6 pb-4 border-b border-neutral-700/50">
          <DialogTitle className="text-2xl font-semibold text-cyan-glow flex items-center">
            <SearchIcon className="mr-2.5 h-6 w-6 text-cyan-glow/80" /> Global Search
          </DialogTitle>
          {/* <DialogDescription className="text-neutral-400 mt-1">Search for tracks, artists, genres, and more.</DialogDescription> */}
        </DialogHeader>
        
        <div className="p-6 pt-4 flex-shrink-0">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search tracks, artists, genres..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 sm:h-14 pl-10 sm:pl-12 pr-10 rounded-lg bg-neutral-800/70 border-neutral-700 text-neutral-100 placeholder:text-neutral-500 text-base sm:text-lg focus:ring-2 focus:ring-cyan-glow focus:border-cyan-glow shadow-sm transition-colors duration-150"
            />
            <SearchIcon className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500 pointer-events-none" />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-700/50 rounded-md"
                onClick={() => setSearchTerm('')}
              >
                <XIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-grow overflow-y-auto px-6 pb-6 min-h-[200px]">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-glow" />
            </div>
          )}

          {!isLoading && searchResults.length === 0 && debouncedSearchTerm.trim() !== '' && (
            <div className="text-center py-10 text-neutral-400">
              <p className="text-lg">No results found for "<span className='text-neutral-200 font-medium'>{debouncedSearchTerm}</span>".</p>
              <p className="text-sm text-neutral-500 mt-1">Try a different search term or check your spelling.</p>
            </div>
          )}

          {!isLoading && searchResults.length === 0 && debouncedSearchTerm.trim() === '' && (
            <div className="text-center py-10 text-neutral-500">
              <p className="text-lg">Start typing to search...</p>
              <p className="text-sm mt-1">Find your next favorite sound or artist.</p>
            </div>
          )}

          {!isLoading && searchResults.length > 0 && (
            <ul className="space-y-2">
              {searchResults.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.url}
                    onClick={closeSearchModal}
                    className="block p-3 rounded-lg hover:bg-neutral-700/50 focus:bg-neutral-700/60 focus:outline-none focus:ring-2 focus:ring-cyan-glow/50 transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-md bg-neutral-700/60 flex items-center justify-center text-cyan-glow/70 group-hover:text-cyan-glow transition-colors">
                        {item.imageUrl ? (
                           <Image src={item.imageUrl} alt={item.title} width={40} height={40} className="rounded-md object-cover" />
                        ) : item.type === 'track' ? (
                          <Music size={20} />
                        ) : item.type === 'producer' ? (
                          <UserCircle size={20} />
                        ) : (
                          <SearchIcon size={20} />
                        )}
                      </div>
                      <div>
                        <p className="text-base font-medium text-neutral-100 group-hover:text-cyan-glow transition-colors truncate">{item.title}</p>
                        {item.description && <p className="text-sm text-neutral-400 group-hover:text-neutral-300 transition-colors truncate">{item.description}</p>}
                      </div>
                      <CornerUpLeft size={18} className="ml-auto text-neutral-500 group-hover:text-cyan-glow transition-colors opacity-0 group-hover:opacity-100 group-focus:opacity-100" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="p-4 pt-3 border-t border-neutral-700/50 bg-abyss-blue/50 rounded-b-xl">
          <p className="text-xs text-neutral-500">Powered by WavHaven Search</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 