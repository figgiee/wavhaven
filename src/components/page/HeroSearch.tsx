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
    const words = ['beats', 'loops', 'soundkits', 'presets'];
    const typingDelay = 120;
    const deletingDelay = 60;
    const newWordDelay = 1800;
    const wordIndex = useRef(0);
    const charIndex = useRef(0);
    const isDeleting = useRef(false);
    const timeoutId = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    const type = () => {
        // Check focus/input value *before* proceeding with animation logic
        // Need to capture isFocused/inputValue at the time of the call
        const currentIsFocused = isFocused;
        const currentInputValue = inputValue;
        
        if (currentIsFocused || currentInputValue) {
            setPlaceholder('');
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

        setPlaceholder(currentDisplay);

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
        // Only start typing if not focused AND input is empty when effect runs
        if (!isFocused && !inputValue) {
             // Reset animation state before starting
             charIndex.current = 0;
             isDeleting.current = false;
             // wordIndex.current = 0; // Optional: reset to first word on blur/re-render
            type(); 
        }

        return () => {
            if (timeoutId.current) clearTimeout(timeoutId.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFocused, inputValue]);

    const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (inputValue.trim()) {
            router.push(`/explore?q=${encodeURIComponent(inputValue.trim())}`);
        }
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    return (
        <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative">
                <Input 
                    type="search"
                    id="heroSearchInput" // Ensure ID is unique if multiple instances
                    value={inputValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={isFocused ? 'Search for beats, loops...' : ''} // Static placeholder when focused
                    className="w-full pl-8 pr-16 py-4 sm:py-5 text-base sm:text-lg rounded-full focus:ring-ring placeholder:text-muted-foreground shadow-xl bg-background/80 dark:bg-background/50 border border-border backdrop-blur-xl"
                />
                {/* Animated Placeholder - Conditionally render based on focus and input value */}
                {!isFocused && !inputValue && (
                    <div className="absolute left-8 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none flex items-center text-base sm:text-lg">
                        <span>Search for&nbsp;</span>
                        <span className="typing-text font-medium text-foreground/80 min-h-[1em]">{placeholder}</span>
                        <span className="typing-cursor animate-blink ml-px">|</span>
                    </div>
                )}
                <Button 
                    type="submit" 
                    size="icon"
                    variant="ghost"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                    aria-label="Search"
                >
                    <Search size={22} />
                </Button>
            </div>
        </form>
    );
} 