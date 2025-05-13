'use client';

import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Define the props if necessary, otherwise keep it simple
// interface HeroSearchProps {}

export function HeroSearch() {
    const [placeholder, setPlaceholder] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const words = ['beats', 'loops', 'soundkits', 'presets', 'artists', 'genres', 'moods'];
    const typingDelay = 120;
    const deletingDelay = 60;
    const newWordDelay = 1800;
    const wordIndex = useRef(0);
    const charIndex = useRef(0);
    const isDeleting = useRef(false);
    const timeoutId = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    // Current placeholder text based on UXUI-OVERHAUL.md for focused state
    const currentPlaceholder = isFocused ? "Search for beats, artists, moods..." : "";

    const type = () => {
        const currentIsFocused = isFocused;
        const currentInputValue = inputValue;
        
        if (currentIsFocused || currentInputValue) {
            setPlaceholder(''); // Clear animated placeholder if focused or has input
            if (timeoutId.current) clearTimeout(timeoutId.current);
            return;
        }

        const currentWord = words[wordIndex.current];
        let currentDisplay = '';
        let delay = typingDelay;

        if (isDeleting.current) {
            currentDisplay = currentWord.substring(0, charIndex.current - 1);
            charIndex.current--;
            delay = deletingDelay;
        } else {
            currentDisplay = currentWord.substring(0, charIndex.current + 1);
            charIndex.current++;
            delay = typingDelay;
        }

        setPlaceholder("Search for " + currentDisplay); // Prepend "Search for " to animated part

        if (!isDeleting.current && charIndex.current === currentWord.length) {
            isDeleting.current = true;
            delay = newWordDelay;
        } else if (isDeleting.current && charIndex.current === 0) {
            isDeleting.current = false;
            wordIndex.current = (wordIndex.current + 1) % words.length;
            delay = 500;
        }

        if (timeoutId.current) clearTimeout(timeoutId.current);
        timeoutId.current = setTimeout(type, delay);
    };

    useEffect(() => {
        if (!isFocused && !inputValue) {
             charIndex.current = 0;
             isDeleting.current = false;
            type(); 
        }
        return () => {
            if (timeoutId.current) clearTimeout(timeoutId.current);
        };
    }, [isFocused, inputValue]);

    const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (inputValue.trim()) {
            router.push(`/explore?q=${encodeURIComponent(inputValue.trim())}`);
        }
    };

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value);

    return (
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xl mx-auto">
            <Input 
                type="search"
                id="heroSearchInput"
                value={inputValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={isFocused ? "Search for beats, artists, moods..." : placeholder} // Show animated or static placeholder
                className="w-full h-12 sm:h-14 pl-10 sm:pl-12 pr-20 sm:pr-28 rounded-full bg-neutral-800/70 border-neutral-700 text-neutral-100 placeholder:text-neutral-500 text-base sm:text-lg focus:ring-2 focus:ring-cyan-glow focus:border-cyan-glow shadow-lg backdrop-blur-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-neutral-400" />
            </div>
            <Button 
                type="submit" 
                className="absolute inset-y-0 right-0 my-1.5 sm:my-2 mr-1.5 sm:mr-2 px-4 sm:px-6 rounded-full bg-cyan-glow text-abyss-blue hover:bg-cyan-glow/90 text-sm sm:text-base font-semibold"
                aria-label="Search"
            >
                Search
            </Button>
        </form>
    );
} 