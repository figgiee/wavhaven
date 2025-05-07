'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import debounce from 'lodash.debounce'; // Needs: npm install lodash.debounce @types/lodash.debounce

interface TrackFiltersProps {
  initialQuery?: string;
}

export default function TrackFilters({ initialQuery = '' }: TrackFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  // Function to update URL search parameters
  const updateSearchQuery = useCallback((query: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries())); // Create mutable copy

    if (!query) {
      current.delete('query');
    } else {
      current.set('query', query);
    }

    // Cast to string is required by push
    const search = current.toString();
    // Add '?' prefix if we have params
    const queryStr = search ? `?${search}` : '';

    // Use router.push to navigate with new search params
    // This will re-render the page component on the server with new props
    router.push(`/browse${queryStr}`);
  }, [searchParams, router]);

  // Debounce the update function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdateSearch = useCallback(debounce(updateSearchQuery, 500), [updateSearchQuery]);

  // Update state when initialQuery changes (e.g., browser back/forward)
  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;
    setSearchQuery(newQuery);
    debouncedUpdateSearch(newQuery);
  };

  // Handle form submission (optional, as debouncing handles updates)
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Cancel any pending debounced updates and update immediately
    debouncedUpdateSearch.cancel();
    updateSearchQuery(searchQuery);

  };


  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by title or artist..."
          value={searchQuery}
          onChange={handleInputChange}
          className="w-full rounded-lg bg-background pl-10 pr-4 py-2" // Added padding for icon
        />
        {/* Optional: Explicit submit button if needed */}
        {/* <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2">Search</Button> */}
      </div>
       {/* Placeholder for more filters (Genre, Mood, BPM, etc.) */}
       {/* <div className="mt-4 flex flex-wrap gap-4">
         Add Select components or Checkbox groups here
       </div> */}
    </form>
  );
} 