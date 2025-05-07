// 'use client'; // REMOVE THIS DIRECTIVE

// import { useState, useEffect, useRef } from 'react'; // Keep commented if not used
import Link from 'next/link';
// import { Search, ChevronDown, ArrowRight, CheckCheck, Gem, Users, Headphones } from 'lucide-react';
import { ChevronDown, ArrowRight, CheckCheck, Gem, Users, Headphones, BadgeCheck, Music, Play, Heart, CalendarDays } from 'lucide-react'; // Keep needed icons
// import { useRouter } from 'next/navigation'; // Keep commented if not used
import Image from 'next/image'; // Import Next/Image
import { Suspense } from 'react'; // Import Suspense
import { auth } from '@clerk/nextjs/server';
import { TrackCard } from '@/components/track-card'; // <-- Renamed component and file
import { TrackCardSkeleton } from '@/components/track-card-skeleton'; // <-- USE TrackCardSkeleton HERE
import { getFeaturedTracks } from '@/server-actions/trackActions';
// Import the specific type used by BeatCard
import type { Beat as BeatCardType } from '@/components/track-card';
import { SlideOutPanel } from '@/components/SlideOutPanel/SlideOutPanel'; // Import SlideOutPanel
import { getFeaturedProducers } from '@/server-actions/userActions'; // <-- Import the new action
import type { FeaturedProducer } from '@/server-actions/userActions'; // <-- Import the new type
import type { Beat } from '@/types'; // Ensure Beat type is imported if needed globally
import { Button } from "@/components/ui/button"; // Added Button import
import { cn } from "@/lib/utils"; // Added cn import
import { HeroSearch } from "@/components/page/HeroSearch"; // Added HeroSearch import

// Define the type expected by the renamed TrackCard component
// If TrackCardProps exports an interface, use that directly
// Otherwise, adjust Beat type as needed
type TrackCardType = Beat; // Adjust this if TrackCardProps uses a different structure

// --- Hero Section Components ---

function HeroSection() {
  return (
    <section className={cn(
      "relative min-h-screen flex items-center justify-center overflow-hidden",
      "bg-background"
    )}>
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center -mt-20 sm:-mt-24">
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 text-accent leading-tight">
          Find Your Perfect Sound
        </h1>
        <h2 className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
          High-quality beats, loops, soundkits, and presets from top producers worldwide
        </h2>

        <div className="max-w-2xl mx-auto mb-10 sm:mb-12">
           <HeroSearch />
        </div>

        <Button asChild size="lg" className="px-10 py-3 sm:px-12 sm:py-4 text-base sm:text-lg rounded-full transition-all duration-300 shadow-lg hover:shadow-primary/30 transform hover:scale-105">
          <Link href="/explore">Explore Now</Link>
        </Button>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
        <ChevronDown className="text-foreground/30 text-lg" />
      </div>
    </section>
  );
}

// --- Featured Beats Section ---

async function FeaturedBeatsSection() {
  let featuredBeats: TrackSearchResult[] = [];
  let error: string | null = null;

  try {
    // Directly fetch data on the server
    featuredBeats = await getFeaturedTracks(6);
  } catch (err) {
    console.error("Failed to fetch featured beats:", err);
    error = err instanceof Error ? err.message : "Failed to load featured beats.";
    featuredBeats = []; // Ensure it's an empty array on error
  }

  // --- Rendering Logic ---
  const renderBeatCards = () => {
    if (error) {
      // TODO: Add a more user-friendly error component
      return <div className="text-center text-red-500 py-10">{error}</div>;
    }

    if (!featuredBeats || featuredBeats.length === 0) {
       if (error === null) { // Only show "No beats" if fetch succeeded but returned empty
         return <div className="text-center text-muted-foreground py-10">No featured beats available right now.</div>;
       }
       return null; // Error message is handled above
    }

    // Helper to adapt TrackSearchResult to BeatCard's expected Beat type
    const adaptToBeatCardType = (track: TrackSearchResult): BeatCardType => ({
        id: track.id,
        title: track.title,
        imageUrl: track.coverImageUrl ?? undefined, // Use optional chaining and fallback
        producerName: `${track.producer?.firstName || ''} ${track.producer?.lastName || ''}`.trim() || track.producer?.username || 'Producer',
        producerProfileUrl: track.producer?.username ? `/u/${track.producer.username}` : undefined, // Example profile URL
        bpm: track.bpm ?? undefined,
        key: track.key ?? undefined,
        audioSrc: track.previewAudioUrl ?? '',
        beatUrl: `/track/${track.slug}`,
        licenses: (track.licenses || []).map(l => ({
            id: l.id,
            type: l.type,
            name: l.name || l.type,
            price: l.price,
            description: l.description || '',
            filesIncluded: l.filesIncluded || [],
        })),
    });

    // Adapt the entire list once for the player context
    const adaptedListForPlayer = featuredBeats.map(adaptToBeatCardType);

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuredBeats.map((track, index) => (
          <TrackCard
            key={track.id}
            beat={adaptToBeatCardType(track)}
            fullTrackList={adaptedListForPlayer}
            index={index}
          />
        ))}
      </div>
    );
  };
  // --- End Rendering Logic ---

  return (
    <section className="py-24 sm:py-32 relative">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Featured Beats</h2>
          <Button variant="link" asChild className="text-sm font-medium text-primary hover:text-primary/80 px-0">
            <Link href="/explore?sortBy=newest">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>

        {/* Render the beat cards or error/empty state */}
        {renderBeatCards()}

      </div>
    </section>
  );
}

// --- Featured Producers Section (MODIFIED) ---
async function FeaturedProducersSection() {
    let featuredProducers: FeaturedProducer[] = [];
    let error: string | null = null;

    try {
        featuredProducers = await getFeaturedProducers(3);
    } catch (err) {
        console.error("Failed to fetch featured producers:", err);
        error = err instanceof Error ? err.message : "Failed to load featured producers.";
        featuredProducers = [];
    }

    const renderProducerCards = () => {
        if (error) {
            return <div className="text-center text-red-500 py-10">{error}</div>;
        }

        if (!featuredProducers || featuredProducers.length === 0) {
            if (error === null) {
                return <div className="text-center text-muted-foreground py-10">No featured producers available right now.</div>;
            }
            return null;
        }

        // Helper function to format large numbers
        const formatStat = (num: number): string => {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toString();
        };

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredProducers.map((producer, index) => {
                    const profileUrl = producer.username ? `/u/${producer.username}` : `/producer/${producer.id}`;
                    const displayName = producer.storeName || producer.username || `Producer ${producer.id.substring(0,4)}`;
                    const profileImageSrc = producer.profileImageUrl || `https://avatar.vercel.sh/${producer.username || producer.id}?size=120`; // Larger avatar
                    const bannerImageSrc = producer.bannerImageUrl; // Can be null

                    return (
                        <Link href={profileUrl} key={producer.id} className="group block rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 border border-border hover:border-primary/30">
                            <div className="bg-card transform group-hover:scale-[1.01] transition-transform duration-300">
                                {/* Banner Section */}
                                <div className={cn(
                                    "h-24 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 relative", // Default gradient fallback
                                    bannerImageSrc ? 'bg-cover bg-center' : ''
                                )} style={bannerImageSrc ? { backgroundImage: `url(${bannerImageSrc})` } : {}}>
                                    {/* Overlay gradient for text readability maybe? */}
                                    {/* <div className="absolute inset-0 bg-black/20"></div> */}
                                </div>

                                {/* Avatar & Name Section */}
                                <div className="relative px-6 pb-4 -mt-12"> {/* Negative margin to pull avatar up */}
                                    <div className="relative inline-block mb-3">
                                         <Image
                                            src={profileImageSrc}
                                            alt={displayName}
                                            width={96} // Fixed size for avatar
                                            height={96}
                                            className="rounded-full ring-4 ring-background bg-muted object-cover border border-border transition-transform duration-300 group-hover:scale-105"
                                            priority={index < 1}
                                        />
                                    </div>
                                    <div className="flex items-center justify-center mb-1">
                                        <h3 className="text-lg font-semibold text-foreground truncate mr-1.5 text-center">{displayName}</h3>
                                        {producer.isVerified && (
                                            <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" aria-label="Verified Producer" />
                                        )}
                                    </div>
                                    {producer.bio && (
                                        <p className="text-xs text-muted-foreground text-center mb-4 line-clamp-2 h-8">{producer.bio}</p>
                                    )}
                                </div>

                                {/* Stats Section */}
                                <div className="border-t border-border px-4 py-4 text-center grid grid-cols-4 gap-1 text-xs">
                                    <div className="flex flex-col items-center" title={`${producer.stats.beats} Beats`}>
                                        <Music className="w-3.5 h-3.5 mb-1 text-muted-foreground" />
                                        <p className="font-semibold text-foreground">{formatStat(producer.stats.beats)}</p>
                                        <p className="text-muted-foreground/80">Beats</p>
                                    </div>
                                     <div className="flex flex-col items-center" title={`${producer.stats.plays} Plays`}>
                                        <Play className="w-3.5 h-3.5 mb-1 text-muted-foreground" />
                                        <p className="font-semibold text-foreground">{formatStat(producer.stats.plays)}</p>
                                        <p className="text-muted-foreground/80">Plays</p>
                                    </div>
                                     <div className="flex flex-col items-center" title={`${producer.stats.likes} Likes`}>
                                        <Heart className="w-3.5 h-3.5 mb-1 text-muted-foreground" />
                                        <p className="font-semibold text-foreground">{formatStat(producer.stats.likes)}</p>
                                        <p className="text-muted-foreground/80">Likes</p>
                                    </div>
                                     <div className="flex flex-col items-center" title={`${producer.memberSince}`}>
                                        <CalendarDays className="w-3.5 h-3.5 mb-1 text-muted-foreground" />
                                        <p className="font-semibold text-foreground">{producer.memberSince.split(' ')[1]}</p> {/* Month */}
                                        <p className="text-muted-foreground/80">{producer.memberSince.split(' ')[2]}</p> {/* Year */}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        );
    };

    return (
        <section className="py-24 sm:py-32 relative bg-secondary/30 dark:bg-secondary/[.02] rounded-t-3xl sm:rounded-t-[50px]">
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/10 dark:from-foreground/10 to-transparent"></div>
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Featured Producers</h2>
                    <Button variant="link" asChild className="text-sm font-medium text-primary hover:text-primary/80 px-0">
                        <Link href="/explore?type=producer">
                            View All <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                    </Button>
                </div>
                {renderProducerCards()}
            </div>
        </section>
    );
}

// --- Why Choose Section ---

const whyChooseItems = [
  { icon: CheckCheck, title: "Curated Excellence", description: "Hand-picked sounds from award-winning producers and rising stars." },
  { icon: Gem, title: "Exclusive Releases", description: "Access sound packs and presets you won't find anywhere else." },
  { icon: Users, title: "Vibrant Community", description: "Join producers, share feedback, and collaborate on projects." },
  { icon: Headphones, title: "Genre Mastery", description: "Specialized in hip-hop, trap, and R&B sounds, with deep expertise." },
];

function WhyChooseSection() {
    return (
        <section className="py-24 sm:py-32">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16 text-foreground">Why Choose WavHaven?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-12">
                    {whyChooseItems.map((item, index) => (
                        <div key={index} className="text-center">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 mx-auto mb-6">
                                <item.icon className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-foreground">{item.title}</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// --- Final CTA Section ---

function FinalCTASection() {
    return (
        <section className="py-24 sm:py-32 relative bg-gradient-to-b from-background to-secondary/30 dark:from-background dark:to-secondary/10 mt-10">
             <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 text-foreground">Ready to Get Started?</h2>
                <p className="text-lg text-muted-foreground mb-10">
                    Join thousands of producers and artists on WavHaven
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                     {/* Use standard Button variants */}
                     <Button size="lg" asChild>
                         <Link href="/explore">Start Exploring</Link>
                     </Button>
                     <Button variant="outline" size="lg" asChild>
                         <Link href="/sign-up">Create Account</Link>
                     </Button>
                </div>
            </div>
            {/* Optional decorative elements */}
            {/* <div className="absolute inset-0 bg-[url('/path/to/grid.svg')] opacity-5"></div> */}
        </section>
    );
}

// --- Skeleton Loaders (MODIFIED) ---

function FeaturedBeatsSkeletonLoader() {
  return (
    <section className="py-24 sm:py-32 relative">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <div className="h-8 w-48 bg-muted rounded animate-pulse"></div> {/* Skeleton for title */}
          <div className="h-6 w-20 bg-muted rounded animate-pulse"></div> {/* Skeleton for link */}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <TrackCardSkeleton key={i} />)}
        </div>
      </div>
    </section>
  );
}

function FeaturedProducersSkeletonLoader() {
  // Basic structure matching the new card layout
  return (
    <section className="py-24 sm:py-32 relative bg-secondary/30 dark:bg-secondary/[.02] rounded-t-3xl sm:rounded-t-[50px]">
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/10 dark:from-foreground/10 to-transparent"></div>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <div className="h-8 w-56 bg-muted rounded animate-pulse"></div>
          <div className="h-6 w-20 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-border bg-card animate-pulse">
              <div className="h-24 bg-muted/50"></div> {/* Banner placeholder */}
              <div className="relative px-6 pb-4 -mt-12">
                <div className="w-24 h-24 rounded-full bg-muted mx-auto mb-3 ring-4 ring-background"></div> {/* Avatar placeholder */}
                <div className="h-5 w-3/4 bg-muted rounded mx-auto mb-2"></div> {/* Name placeholder */}
                <div className="h-8 w-full bg-muted/50 rounded mb-4"></div> {/* Bio placeholder */}
              </div>
              <div className="border-t border-border px-4 py-4 grid grid-cols-4 gap-1">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex flex-col items-center">
                    <div className="h-4 w-4 bg-muted/50 rounded mb-1"></div> {/* Icon placeholder */}
                    <div className="h-4 w-8 bg-muted rounded mb-1"></div> {/* Stat value placeholder */}
                    <div className="h-3 w-10 bg-muted/50 rounded"></div> {/* Stat label placeholder */}
                  </div>
                ))}
              </div>
            </div>
          ))}
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

      <Suspense fallback={<FeaturedBeatsSkeletonLoader />}>
        <FeaturedBeatsSection />
      </Suspense>

      <Suspense fallback={<FeaturedProducersSkeletonLoader />}>
        <FeaturedProducersSection />
      </Suspense>

      <WhyChooseSection />
      <FinalCTASection />

      {/* SlideOutPanel needs client-side interactivity, keep it here */}
      {/* Ensure SlideOutPanel is correctly implemented to work without 'use client' at the page level */}
      {/* It might need its own 'use client' directive internally */}
      <SlideOutPanel width="w-[450px]" />
    </>
  );
}