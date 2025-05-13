'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X as XIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface GlobalSearchInputProps {
  className?: string;
  onSearchSubmit?: (query: string) => void;
}

export function GlobalSearchInput({ className, onSearchSubmit }: GlobalSearchInputProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      router.push(`/explore?q=${encodeURIComponent(trimmedQuery)}`);
      if (onSearchSubmit) {
        onSearchSubmit(trimmedQuery);
      }
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (expanded && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    function handleKeydown(e: KeyboardEvent) {
      if (expanded && e.key === 'Escape') {
        setExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [expanded]);

  return (
    <div ref={containerRef} className={cn("relative flex justify-end items-center", className)}>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.form
            key="expanded"
            onSubmit={handleSubmit}
            className="relative flex items-center rounded-full overflow-hidden shadow-md transition-colors duration-150 w-full"
            initial={{ width: '40px', opacity: 0 }}
            animate={{ width: '100%', opacity: 1 }}
            exit={{ width: '40px', opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500 flex-shrink-0 z-10" />
            <Input
              ref={inputRef}
              type="search"
              autoFocus
              placeholder="Search tracks, artists, genres..."
              value={query}
              onChange={handleInputChange}
              className="flex-grow min-w-0 pl-10 pr-10 py-2 text-base bg-neutral-800 border border-neutral-700 rounded-full focus:outline-none focus:border-2 focus:border-cyan-500 focus-visible:ring-0 h-10"
              aria-label="Search all beats"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 h-auto w-auto rounded-full text-neutral-400 hover:text-neutral-200"
                aria-label="Clear search"
              >
                <XIcon size={16} />
              </Button>
            )}
            <Button type="submit" className="hidden" aria-label="Submit search" />
          </motion.form>
        ) : (
          <motion.div 
            key="collapsed"
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.1 }}
          >
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={() => setExpanded(true)}
              aria-label="Open search"
              className="focus:outline-none focus:ring-0"
            >
              <Search size={18} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 