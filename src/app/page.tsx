'use client'; // For animations and interactions

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, ArrowRight, CheckCheck, Gem, Users, Headphones } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TrackCard from '@/components/track-card';
import type { Beat } from '@/types';

// TODO: Define types for featured beats/producers if fetching data
interface FeaturedBeat { /* ... Beat properties ... */ }
interface FeaturedProducer { /* ... Producer properties ... */ }

// --- Hero Section Components --- 

function HeroSearch() {
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
        if (isFocused || inputValue) {
            // If focused or input has value, stop animation
            setPlaceholder(''); // Clear animated placeholder
             if (timeoutId.current) clearTimeout(timeoutId.current);
            return;
        }
        
        const currentWord = words[wordIndex.current];
        let currentPlaceholder = '';
        let delay = typingDelay;

        if (isDeleting.current) {
            currentPlaceholder = currentWord.substring(0, charIndex.current - 1);
            charIndex.current--;
            delay = deletingDelay;
        } else {
            currentPlaceholder = currentWord.substring(0, charIndex.current + 1);
            charIndex.current++;
            delay = typingDelay;
        }

        setPlaceholder(currentPlaceholder);

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
        // Start typing animation on mount if not focused and no input value
        if (!isFocused && !inputValue) {
            type();
        }
        // Cleanup timeout on unmount or when dependencies change
        return () => {
             if (timeoutId.current) clearTimeout(timeoutId.current);
        };
     // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFocused, inputValue]); // Rerun effect if focus or input value changes

     const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (inputValue.trim()) {
            router.push(`/explore?q=${encodeURIComponent(inputValue.trim())}`);
        }
    };

     const handleFocus = () => {
         setIsFocused(true);
         if (timeoutId.current) clearTimeout(timeoutId.current);
         setPlaceholder(''); // Clear animated placeholder on focus
     };

     const handleBlur = () => {
         setIsFocused(false);
         // If blurred and input is empty, restart animation
         if (!inputValue) {
             // Reset charIndex and isDeleting before restarting
             charIndex.current = 0;
             isDeleting.current = false;
             type();
         }
     };

     const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
         setInputValue(e.target.value);
         if (e.target.value) {
             if (timeoutId.current) clearTimeout(timeoutId.current);
             setPlaceholder(''); // Ensure animated placeholder is clear
         }
     };

    return (
         <form onSubmit={handleSearchSubmit} className="relative">
             <div className="relative">
                 <Input 
                    type="search"
                    id="heroSearchInput"
                    value={inputValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={isFocused ? 'Search for beats, loops...' : ''} // Static placeholder only when focused
                    className="w-full pl-8 pr-16 py-4 sm:py-5 text-base sm:text-lg text-white bg-white/5 backdrop-blur-xl border border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent placeholder:text-gray-500 shadow-xl"
                 />
                 {/* Animated Placeholder */} 
                 {!isFocused && !inputValue && (
                     <div className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center text-base sm:text-lg">
                         <span>Search for&nbsp;</span>
                         <span className="typing-text font-medium text-gray-300 min-h-[1em]">{placeholder}</span>
                         <span className="typing-cursor animate-blink ml-px">|</span>
                     </div>
                 )}
                 <Button 
                    type="submit" 
                    size="icon"
                    variant="ghost"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-400"
                    aria-label="Search"
                 >
                     <Search size={22} />
                 </Button>
             </div>
         </form>
    );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center -mt-20 sm:-mt-24">
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 text-white leading-tight">
          Find Your Perfect Sound
        </h1>
        <h2 className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-10 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
          High-quality beats, loops, soundkits, and presets from top producers worldwide
        </h2>

        <div className="max-w-2xl mx-auto mb-10 sm:mb-12">
           <HeroSearch />
        </div>

        <Button asChild size="lg" className="px-10 py-3 sm:px-12 sm:py-4 text-base sm:text-lg bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-indigo-500/30 transform hover:scale-105">
          <Link href="/explore">Explore Now</Link>
        </Button>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
        <ChevronDown className="text-white/30 text-lg" />
      </div>
       {/* Add background elements here if desired (e.g., gradient, image, video) */} 
    </section>
  );
}

// --- Featured Beats Section --- 

function FeaturedBeatsSection() {
   // TODO: Fetch actual featured beats data
   const featuredBeats: Beat[] = Array.from({ length: 3 }, (_, index) => ({
     id: `featured-${index}`,
     title: `Placeholder Beat ${index + 1}`,
     slug: `placeholder-beat-${index + 1}`,
             imageUrl: null, // Use default/fallback handling in components
     producerName: 'Producer Name',
     price: 29.99,
     bpm: 140,
     key: 'Cmin',
     audioSrc: '#', // No actual audio for placeholder
     beatUrl: `#`,
     licenses: [{
       id: `license-${index}`,
       name: 'Basic License',
       price: 29.99,
       includedFiles: ['MP3', 'WAV'],
       usageTerms: []
     }],
     tags: [{ id: `tag-${index}`, name: 'Hip Hop' }],
     genre: { id: `genre-${index}`, name: 'Hip Hop', slug: 'hip-hop' }
   }));

  return (
    <section className="py-24 sm:py-32 relative">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Featured Beats</h2>
          <Button variant="link" asChild className="text-sm font-medium text-indigo-400 hover:text-indigo-300 px-0">
            <Link href="/explore?sort=trending">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
           {featuredBeats.map((beat, index) => (
               <TrackCard 
                  key={beat.id} 
                  beat={beat}
                  fullTrackList={featuredBeats}
                  index={index}
                  variant="default"
               />
           ))}
        </div>
      </div>
    </section>
  );
}

// --- Featured Producers Section --- 

function FeaturedProducersSection() {
    // TODO: Fetch actual featured producers data
    const featuredProducers: any[] = Array.from({ length: 3 }); // Placeholder

    return (
         <section className="py-24 sm:py-32 relative bg-white/[.02] rounded-t-3xl sm:rounded-t-[50px]">
             <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/10 to-transparent"></div>
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white">Featured Producers</h2>
                    <Button variant="link" asChild className="text-sm font-medium text-indigo-400 hover:text-indigo-300 px-0">
                        <Link href="/producers"> {/* TODO: Update producers URL */}
                         View All <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                    </Button>
                </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {featuredProducers.map((producer, index) => (
                        <Link href={producer?.profileUrl || '#'} key={producer?.id || index} className="group block">
                            <div className="glass-effect p-6 rounded-2xl group-hover:bg-white/10 transition-all duration-300 transform group-hover:scale-[1.02] border border-white/5 group-hover:border-white/10">
                                <div className="w-20 h-20 rounded-full mx-auto mb-5 overflow-hidden ring-2 ring-white/10 group-hover:ring-indigo-500/50 transition-all duration-300 bg-gradient-to-br from-indigo-700 to-purple-700">
                                     {/* TODO: Use Next/Image */}
                                    <img src={producer?.avatarUrl || '/logo.svg'}
                                        alt={producer?.name || `Producer ${index+1}`}
                                        className="w-full h-full object-cover" />
                                </div>
                                <h3 className="text-lg font-medium text-white text-center mb-1 group-hover:text-indigo-400 transition-colors">{producer?.name || `Producer Name ${index + 1}`}</h3>
                                <p className="text-sm text-gray-400 text-center mb-5 h-8 overflow-hidden">{producer?.bio || 'Short bio about the producer...'}</p>
                                <div className="flex items-center justify-center gap-6 text-sm border-t border-white/5 pt-5">
                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-white">{producer?.stats?.beats ?? 15}</p>
                                        <p className="text-xs text-gray-500">Beats</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-white">{producer?.stats?.sales ?? 120}</p>
                                        <p className="text-xs text-gray-500">Sales</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-white">{producer?.stats?.followers ?? '5k'}</p>
                                        <p className="text-xs text-gray-500">Followers</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

// --- Why Choose Section --- 

function WhyChooseSection() {
    const features = [
        { icon: CheckCheck, title: "Curated Excellence", description: "Hand-picked sounds from award-winning producers and rising stars.", color: "text-indigo-400", bg: "bg-indigo-500/10", ring: "ring-indigo-500/20" },
        { icon: Gem, title: "Exclusive Releases", description: "Access sound packs and presets you won't find anywhere else.", color: "text-purple-400", bg: "bg-purple-500/10", ring: "ring-purple-500/20" },
        { icon: Users, title: "Vibrant Community", description: "Join producers, share feedback, and collaborate on projects.", color: "text-sky-400", bg: "bg-sky-500/10", ring: "ring-sky-500/20" },
        { icon: Headphones, title: "Genre Mastery", description: "Specialized in hip-hop, trap, and R&B sounds, with deep expertise.", color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
    ];

    return (
         <section className="py-24 sm:py-32">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">Why Choose WavHaven?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                    {features.map((feature, index) => {
                         const Icon = feature.icon; // Component type
                         return (
                            <div key={index} className="text-center">
                                <div className={cn("w-14 h-14 rounded-full ring-1 flex items-center justify-center mx-auto mb-5", feature.bg, feature.ring)}>
                                    <Icon size={24} className={feature.color} />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">{feature.title}</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// --- Final CTA Section --- 

function FinalCTASection() {
    return (
         <section className="relative py-24 sm:py-32 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-5">Ready to Get Started?</h2>
                <p className="text-lg sm:text-xl text-gray-300 mb-8">Join thousands of producers and artists on WavHaven</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                     {/* Removed asChild, Link is now inside Button */}
                    <Button size="lg" className="px-8 py-3 sm:px-10 sm:py-4 text-base sm:text-lg bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-indigo-500/30 transform hover:scale-105">
                        <Link href="/explore" className="focus:outline-none">Start Exploring</Link> 
                        {/* Added focus style to link if needed */}
                    </Button>
                     {/* Removed asChild, Link is now inside Button */}
                    <Button size="lg" variant="outline" className="px-8 py-3 sm:px-10 sm:py-4 text-base sm:text-lg bg-white/10 border-white/10 rounded-full hover:bg-white/20 backdrop-blur-sm text-white">
                        <Link href="/sign-up" className="focus:outline-none">Create Account</Link> {/* TODO: Update register URL if different from /sign-up */}
                    </Button>
                </div>
            </div>
        </section>
    );
}

// --- Home Page Component --- 

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedBeatsSection />
      <FeaturedProducersSection />
      <WhyChooseSection />
      <FinalCTASection />
    </>
  );
} 
