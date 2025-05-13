// import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight, CheckCheck, Gem, Users, Headphones, BadgeCheck, Music, Play, Heart, CalendarDays } from 'lucide-react';
import Image from 'next/image';
import { Suspense } from 'react'; // Removed useEffect, useState
// import { auth } from '@clerk/nextjs/server';
import { SlideOutPanel } from '@/components/SlideOutPanel/SlideOutPanel';
import { getFeaturedProducers } from '@/server-actions/userActions';
import type { FeaturedProducer } from '@/server-actions/userActions';
// import type { Beat, TrackSearchResult } from '@/types'; // Not directly used by HomePage
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HeroSearch } from "@/components/page/HeroSearch";
import { FeaturedBeatsDataFetcher } from '@/components/home/featured-beats-data-fetcher';
import { TrackCardSkeleton } from '@/components/track-card-skeleton';
import { NewReleasesSkeletonLoader } from '@/components/home/new-releases-skeleton-loader';
import { PersonalizedRecommendationsSkeletonLoader } from '@/components/home/personalized-recommendations-skeleton-loader';

// Keep HeroSearch as a server-side rendered part if possible, or make it client too
// For now, assuming HeroSection can remain as is if it doesn't use client hooks directly

// --- Hero Section Components (Keep as is if not needing client hooks) ---
function HeroSection() {
  return (
    <section className={cn(
      "relative h-[80vh] sm:h-[90vh] flex flex-col items-center justify-center overflow-hidden",
      "bg-background pt-12 pb-20 sm:pt-16 sm:pb-24"
    )}>
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 text-cyan-glow leading-snug">
          Find Your Perfect Sound
        </h1>
        <h2 className="text-lg sm:text-xl md:text-2xl text-neutral-300 mb-12 sm:mb-16 max-w-3xl mx-auto leading-relaxed">
          High-quality beats, loops, soundkits, and presets from top producers worldwide
        </h2>
        <div className="max-w-xl mx-auto mb-12 sm:mb-16">
           <HeroSearch />
        </div>
        <Button 
          asChild 
          size="lg" 
          className={cn(
            "px-12 py-4 sm:px-16 sm:py-5 text-base sm:text-lg rounded-full transition-all duration-300 transform hover:scale-105",
            "bg-cyan-glow text-abyss-blue hover:bg-cyan-glow/90 shadow-glow-cyan-md"
          )}
        >
          <Link href="/explore">Explore Now</Link>
        </Button>
      </div>
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce z-10">
        <ChevronDown className="text-neutral-500 h-6 w-6" />
      </div>
    </section>
  );
}

// --- Featured Producers Section (SERVER COMPONENT - can remain async) ---
// This can remain largely the same if it doesn't directly use client hooks.
// If it uses client hooks for interaction, it would also need to become a client component or delegate to one.
async function FeaturedProducersSection() {
    let featuredProducersData: FeaturedProducer[] = [];
    let error: string | null = null;

    try {
        featuredProducersData = await getFeaturedProducers(3);
    } catch (err) {
        console.error("Failed to fetch featured producers:", err);
        error = err instanceof Error ? err.message : "Failed to load featured producers.";
        featuredProducersData = [];
    }

    const renderProducerCards = () => {
        if (error) {
            return <div className="text-center text-red-500 py-10">{error}</div>;
        }
        if (!featuredProducersData || featuredProducersData.length === 0) {
            return <div className="text-center text-muted-foreground py-10">No featured producers available right now.</div>;
        }
        const formatStat = (num: number): string => {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toString();
        };
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredProducersData.map((producer, index) => {
                    const profileUrl = producer.username ? `/u/${producer.username}` : `/producer/${producer.id}`;
                    const displayName = producer.storeName || producer.username || `Producer ${producer.id.substring(0,4)}`;
                    const profileImageSrc = producer.profileImageUrl || `https://avatar.vercel.sh/${producer.username || producer.id}?size=120`;
                    const bannerImageSrc = producer.bannerImageUrl;
                    return (
                        <Link href={profileUrl} key={producer.id} className="group block rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 border border-[hsl(var(--border))] hover:border-primary/30">
                            <div className="bg-card transform group-hover:scale-[1.01] transition-transform duration-300">
                                <div className={cn("h-24 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 relative", bannerImageSrc ? 'bg-cover bg-center' : '')} style={bannerImageSrc ? { backgroundImage: `url(${bannerImageSrc})` } : {}}></div>
                                <div className="relative px-6 pb-4 -mt-12">
                                    <div className="relative inline-block mb-3">
                                         <Image src={profileImageSrc} alt={displayName} width={96} height={96} className="rounded-full ring-4 ring-background bg-muted object-cover border border-[hsl(var(--border))] transition-transform duration-300 group-hover:scale-105" priority={index < 1} />
                                    </div>
                                    <div className="flex items-center justify-center mb-1">
                                        <h3 className="text-lg font-semibold text-foreground truncate mr-1.5 text-center">{displayName}</h3>
                                        {producer.isVerified && (<BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" aria-label="Verified Producer" />)}
                                    </div>
                                    {producer.bio && (<p className="text-xs text-muted-foreground text-center mb-4 line-clamp-2 h-8">{producer.bio}</p>)}
                                </div>
                                <div className="border-t border-[hsl(var(--border))] px-2 py-3 sm:px-4 sm:py-4 text-center grid grid-cols-2 xs:grid-cols-4 gap-2 sm:gap-1 text-xs">
                                    <div className="flex flex-col items-center" title={`${producer.stats.beats} Beats`}><Music className="w-3.5 h-3.5 mb-1 text-muted-foreground" /><p className="font-semibold text-foreground">{formatStat(producer.stats.beats)}</p><p className="text-muted-foreground/80">Beats</p></div>
                                     <div className="flex flex-col items-center" title={`${producer.stats.plays} Plays`}><Play className="w-3.5 h-3.5 mb-1 text-muted-foreground" /><p className="font-semibold text-foreground">{formatStat(producer.stats.plays)}</p><p className="text-muted-foreground/80">Plays</p></div>
                                     <div className="flex flex-col items-center" title={`${producer.stats.likes} Likes`}><Heart className="w-3.5 h-3.5 mb-1 text-muted-foreground" /><p className="font-semibold text-foreground">{formatStat(producer.stats.likes)}</p><p className="text-muted-foreground/80">Likes</p></div>
                                     <div className="flex flex-col items-center" title={`${producer.memberSince}`}><CalendarDays className="w-3.5 h-3.5 mb-1 text-muted-foreground" /><p className="font-semibold text-foreground">{producer.memberSince.split(' ')[1]}</p><p className="text-muted-foreground/80">{producer.memberSince.split(' ')[2]}</p></div>
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
                        <Link href="/explore?type=producer">View All <ArrowRight className="w-3 h-3 ml-1" /></Link>
                    </Button>
                </div>
                {renderProducerCards()}
            </div>
        </section>
    );
}

// --- Why Choose Section (Keep as is) ---
const whyChooseItems = [
  { icon: CheckCheck, title: "Curated Excellence", description: "Hand-picked sounds from award-winning producers and rising stars." },
  { icon: Gem, title: "Exclusive Releases", description: "Access sound packs and presets you won't find anywhere else." },
  { icon: Users, title: "Vibrant Community", description: "Join producers, share feedback, and collaborate on projects." },
  { icon: Headphones, title: "Genre Mastery", description: "Specialized in hip-hop, trap, and R&B sounds, with deep expertise." },
];
function WhyChooseSection() {
    return (
        <section className="py-24 sm:py-32 bg-neutral-900">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16 text-neutral-100">Why Choose WavHaven?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-12">
                    {whyChooseItems.map((item, index) => (
                        <div key={index} className="text-center">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 mx-auto mb-6">
                                <item.icon className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-neutral-100">{item.title}</h3>
                            <p className="text-neutral-300 text-sm leading-relaxed">{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// --- Final CTA Section (Keep as is) ---
function FinalCTASection() {
    return (
        <section className="py-24 sm:py-32 relative bg-gradient-to-b from-background to-secondary/30 dark:from-background dark:to-secondary/10">
             <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 text-foreground">Ready to Get Started?</h2>
                <p className="text-lg text-muted-foreground mb-10">Join thousands of producers and artists on WavHaven</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                     <Button size="lg" asChild><Link href="/explore">Start Exploring</Link></Button>
                     <Button variant="outline" size="lg" asChild><Link href="/sign-up">Create Account</Link></Button>
                </div>
            </div>
        </section>
    );
}

// --- Skeleton Loaders (Keep as is) ---
function FeaturedBeatsSkeletonLoader() {
  return (
    <section className="py-24 sm:py-32 relative">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
          <div className="h-6 w-20 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <TrackCardSkeleton key={i} />)}
        </div>
      </div>
    </section>
  );
}
function FeaturedProducersSkeletonLoader() {
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
            <div key={i} className="rounded-2xl overflow-hidden border border-[hsl(var(--border))] bg-card animate-pulse">
              <div className="h-24 bg-muted/50"></div>
              <div className="relative px-6 pb-4 -mt-12">
                <div className="w-24 h-24 rounded-full bg-muted mx-auto mb-3 ring-4 ring-background"></div>
                <div className="h-5 w-3/4 bg-muted rounded mx-auto mb-2"></div>
                <div className="h-8 w-full bg-muted/50 rounded mb-4"></div>
              </div>
              <div className="border-t border-[hsl(var(--border))] px-4 py-4 grid grid-cols-4 gap-1">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex flex-col items-center">
                    <div className="h-4 w-4 bg-muted/50 rounded mb-1"></div>
                    <div className="h-4 w-8 bg-muted rounded mb-1"></div>
                    <div className="h-3 w-10 bg-muted/50 rounded"></div>
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

// --- Home Page Component (SERVER COMPONENT) ---
// No 'use client' here, this remains a Server Component
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <Suspense fallback={<FeaturedBeatsSkeletonLoader />}>
        <FeaturedBeatsDataFetcher />
      </Suspense>
      <Suspense fallback={<FeaturedProducersSkeletonLoader />}>
        <FeaturedProducersSection />
      </Suspense>
      <Suspense fallback={<NewReleasesSkeletonLoader />}>
        <NewReleasesSkeletonLoader />
      </Suspense>
      <Suspense fallback={<PersonalizedRecommendationsSkeletonLoader />}>
        <PersonalizedRecommendationsSkeletonLoader />
      </Suspense>
      <WhyChooseSection />
      <FinalCTASection />
      <SlideOutPanel width="w-[450px]" />
    </>
  );
}