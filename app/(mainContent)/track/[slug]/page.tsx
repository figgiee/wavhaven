'use client';

import React, { useState, Suspense, useEffect, use } from 'react';
import { getTrackBySlug } from "@/server-actions/trackActions";
import Image from "next/image";
import Link from "next/link";
import { TrackLicenseClientWrapper } from '@/components/track/TrackLicenseClientWrapper';
import TrackDetailSkeleton from '@/components/track/TrackDetailSkeleton';
import type { TrackDetails } from '@/server-actions/trackActions';
import { Music, Tag, Clock, KeyRound, Info, Library, MessageCircle, Sparkles, UserCircle, ShoppingCart, Heart, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TrackSidebar } from './_components/TrackSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCartStore } from '@/stores/useCartStore';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { BeatWaveform } from "@/components/track/beat-waveform";
import { format } from 'date-fns';

// TODO: Add error handling UI for fetchError more gracefully
// TODO: Consider Suspense boundary if loading takes time

type Props = {
  params: { slug: string };
};

export default function TrackPage({ params: paramsProp }: Props) {
  const params = use(paramsProp); 
  const [track, setTrack] = useState<TrackDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | undefined>();
  
  const { addItem, items: cartItems } = useCartStore();
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    async function loadData() {
      try {
        console.log(`[TrackPage Client] Fetching track data for: ${params.slug}`);
        const fetchedTrack = await getTrackBySlug(params.slug);
        console.log(`[TrackPage Client] Received track data: ${fetchedTrack ? 'Found' : 'Not Found'}`);
        if (!fetchedTrack) {
          setError("Track not found.");
        } else {
          setTrack(fetchedTrack);
          if (fetchedTrack.licenses && fetchedTrack.licenses.length > 0) {
              const firstLicenseId = fetchedTrack.licenses[0].id;
              setSelectedLicenseId(firstLicenseId); 
          }
        }
      } catch (err) {
        console.error("[TrackPage Client] Error fetching track:", err);
        setError("Failed to load track details.");
      } finally {
        setIsLoading(false);
      }
    }
    if (params.slug) {
        loadData();
    }
  }, [params.slug]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 pt-8 pb-12 md:pt-12 md:pb-16">
         <TrackDetailSkeleton />
      </div>
    );
  }

  if (error || !track) {
     return (
      <div className="container mx-auto px-4 pt-8 pb-12 md:pt-12 md:pb-16">
         <Card className="bg-neutral-800/50 border-red-500/50 text-center p-8 shadow-lg">
            <CardHeader>
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4"/>
                <CardTitle className="text-2xl text-red-300">Track Not Available</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-neutral-300">{error || "The requested track could not be loaded or was not found."}</p>
            </CardContent>
            <CardFooter className="justify-center">
                 <Button variant="outline" asChild className="border-cyan-glow/50 text-cyan-glow hover:bg-cyan-glow/10 hover:text-cyan-glow">
                    <Link href="/explore">Explore Other Tracks</Link>
                </Button>
            </CardFooter>
         </Card>
      </div>
    );
  }

  const producerProfileUrl = track.producer?.username ? `/u/${track.producer.username}` : '#';

  const selectedLicense = track.licenses.find(l => l.id === selectedLicenseId);

  const handleAddToCart = () => {
    if (!isSignedIn) {
        toast.error("Please sign in to add items to your cart.");
        // Optionally, trigger sign-in flow
        return;
    }
    if (track && selectedLicense) {
      const cartItem = {
        id: `${track.id}-${selectedLicense.id}`, // Composite ID for cart uniqueness
        trackId: track.id,
        title: track.title,
        licenseId: selectedLicense.id,
        licenseName: selectedLicense.name || selectedLicense.type,
        price: typeof selectedLicense.price === 'string' ? parseFloat(selectedLicense.price) : Number(selectedLicense.price),
        quantity: 1,
        imageUrl: track.coverImageUrl ?? undefined,
        producerId: track.producerId,
        producerName: track.producer?.username || "Unknown Producer",
      };
      addItem(cartItem);
      toast.success(`"${selectedLicense.name}" for "${track.title}" added to cart!`);
    } else {
      toast.error("Please select a license first.");
    }
  };

  const isItemInCart = selectedLicenseId ? cartItems.some(item => item.trackId === track?.id && item.licenseId === selectedLicenseId) : false;

  return (
    <div className="container mx-auto px-2 sm:px-4 pt-6 pb-12 md:pt-8 md:pb-16">
      <div className="flex flex-col lg:flex-row gap-6 md:gap-8 lg:gap-10 xl:gap-12">
        <TrackSidebar track={track} />

        <main className="w-full lg:flex-1 min-w-0"> {/* Added min-w-0 for flex child */} 
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1.5 bg-neutral-800/60 border border-neutral-700/70 p-1 rounded-lg shadow-md backdrop-blur-sm mb-6">
              <TabsTrigger value="overview" className="text-xs sm:text-sm text-neutral-300 data-[state=active]:bg-cyan-glow/20 data-[state=active]:text-cyan-glow data-[state=active]:shadow-md hover:bg-neutral-700/50 hover:text-neutral-100 rounded transition-all">Overview</TabsTrigger>
              <TabsTrigger value="licenses" className="text-xs sm:text-sm text-neutral-300 data-[state=active]:bg-cyan-glow/20 data-[state=active]:text-cyan-glow data-[state=active]:shadow-md hover:bg-neutral-700/50 hover:text-neutral-100 rounded transition-all">Licenses</TabsTrigger>
              <TabsTrigger value="comments" className="text-xs sm:text-sm text-neutral-300 data-[state=active]:bg-cyan-glow/20 data-[state=active]:text-cyan-glow data-[state=active]:shadow-md hover:bg-neutral-700/50 hover:text-neutral-100 rounded transition-all">
                Comments <Badge variant="outline" className="ml-1.5 px-1.5 py-0.5 text-xs bg-neutral-700 border-neutral-600 text-neutral-400 group-data-[state=active]:bg-cyan-glow/30 group-data-[state=active]:text-cyan-glow group-data-[state=active]:border-cyan-glow/50">{track.commentCount || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="similar" className="text-xs sm:text-sm text-neutral-300 data-[state=active]:bg-cyan-glow/20 data-[state=active]:text-cyan-glow data-[state=active]:shadow-md hover:bg-neutral-700/50 hover:text-neutral-100 rounded transition-all">Similar</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="bg-neutral-800/40 border border-neutral-700/60 rounded-xl p-5 sm:p-6 shadow-lg">
                <CardTitle className="text-xl sm:text-2xl font-semibold text-neutral-100 mb-1">About "{track.title}"</CardTitle>
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-neutral-400">By</span>
                    <Link href={producerProfileUrl} className="group flex items-center gap-1.5">
                        {track.producer?.profileImageUrl && 
                            <Image src={track.producer.profileImageUrl} alt={track.producer.username || 'Producer'} width={20} height={20} className="rounded-full ring-1 ring-neutral-600 group-hover:ring-cyan-glow transition-all" />
                        }
                        <span className="text-sm font-medium text-cyan-glow/90 group-hover:text-cyan-glow group-hover:underline">{track.producer?.username || "Unknown Artist"}</span>
                    </Link>
                </div>

                {track.description && (
                    <p className="text-sm text-neutral-300 leading-relaxed mb-6 whitespace-pre-line">{track.description}</p>
                )}
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5 text-sm mb-2">
                    {track.genre && (
                        <div className="flex items-start gap-2">
                            <Music size={16} className="text-magenta-spark mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-neutral-500">Genre</p>
                                <p className="text-neutral-200 font-medium">{track.genre.name}</p>
                            </div>
                        </div>
                    )}
                    {track.bpm && (
                        <div className="flex items-start gap-2">
                            <Clock size={16} className="text-magenta-spark mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-neutral-500">BPM</p>
                                <p className="text-neutral-200 font-medium">{track.bpm}</p>
                            </div>
                        </div>
                    )}
                    {track.key && (
                         <div className="flex items-start gap-2">
                            <KeyRound size={16} className="text-magenta-spark mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-neutral-500">Key</p>
                                <p className="text-neutral-200 font-medium">{track.key}</p>
                            </div>
                        </div>
                    )}
                    {track.createdAt && (
                        <div className="flex items-start gap-2">
                            <Clock size={16} className="text-magenta-spark mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-neutral-500">Released</p>
                                <p className="text-neutral-200 font-medium">
                                    {format(new Date(track.createdAt), 'MMM d, yyyy')}
                                </p>
                            </div>
                        </div>
                    )}
                    {track.moods && track.moods.length > 0 && (
                         <div className="flex items-start gap-2 sm:col-span-1">
                            <Sparkles size={16} className="text-magenta-spark mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-neutral-500">Moods</p>
                                <div className="flex flex-wrap gap-1.5 mt-0.5">
                                    {track.moods.map(mood => <Badge key={mood.id} variant="secondary" className="bg-neutral-700/70 border-neutral-600 text-neutral-300 text-xs px-1.5 py-0.5 font-normal">{mood.name}</Badge>)}
                                </div>
                            </div>
                        </div>
                    )}
                    {track.tags && track.tags.length > 0 && (
                         <div className="flex items-start gap-2 col-span-2 sm:col-span-3">
                            <Tag size={16} className="text-magenta-spark mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-neutral-500">Tags</p>
                                <div className="flex flex-wrap gap-1.5 mt-0.5">
                                    {track.tags.map(tag => <Badge key={tag} variant="secondary" className="bg-neutral-700/70 border-neutral-600 text-neutral-300 text-xs px-1.5 py-0.5 font-normal">{tag}</Badge>)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </TabsContent>

            <TabsContent value="licenses" className="bg-neutral-800/40 border border-neutral-700/60 rounded-xl shadow-lg">
              <div className="p-5 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl font-semibold text-neutral-100 mb-4">Purchase a License</CardTitle>
                <TrackLicenseClientWrapper
                  producerName={track.producer?.username || "Unknown Producer"}
                  licenses={track.licenses}
                  trackId={track.id}
                  trackTitle={track.title}
                  imageUrl={track.coverImageUrl ?? undefined}
                  selectedLicenseId={selectedLicenseId}
                  onLicenseChange={setSelectedLicenseId}
                />
              </div>
              {selectedLicense && (
                <div className="border-t border-neutral-700/60 bg-neutral-900/30 px-5 py-4 sm:px-6 sm:py-5 rounded-b-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-sm text-neutral-400">Selected License:</p>
                        <p className="text-lg font-semibold text-cyan-glow">{selectedLicense.name || selectedLicense.type}</p>
                    </div>
                    <Button 
                        size="lg" 
                        onClick={handleAddToCart} 
                        disabled={!selectedLicenseId || isItemInCart}
                        className={cn(
                            "w-full sm:w-auto text-base font-semibold shadow-md transition-all duration-150 ease-in-out transform active:scale-95",
                            isItemInCart 
                                ? "bg-neutral-600 text-neutral-400 cursor-not-allowed"
                                : "bg-magenta-spark text-white hover:bg-magenta-spark/80 shadow-glow-magenta-md"
                        )}
                    >
                        {isItemInCart ? (
                            <><CheckCircle2 className="mr-2 h-5 w-5"/> In Cart</>
                        ) : (
                            <><ShoppingCart className="mr-2 h-5 w-5"/> Add to Cart ({formatPrice(selectedLicense.price)})</>
                        )}
                    </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="comments" className="bg-neutral-800/40 border border-neutral-700/60 rounded-xl p-5 sm:p-6 shadow-lg">
              <CardTitle className="text-xl sm:text-2xl font-semibold text-neutral-100 mb-4">Comments ({track.commentCount || 0})</CardTitle>
              {/* Placeholder for Comments UI */}
              <div className="text-center py-10">
                <MessageCircle size={48} className="text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-400">Comments feature coming soon!</p>
                <p className="text-xs text-neutral-500 mt-1">Share your thoughts and connect with the community.</p>
              </div>
            </TabsContent>

            <TabsContent value="similar" className="bg-neutral-800/40 border border-neutral-700/60 rounded-xl p-5 sm:p-6 shadow-lg">
              <CardTitle className="text-xl sm:text-2xl font-semibold text-neutral-100 mb-4">Similar Sounds</CardTitle>
              {/* Placeholder for Similar Tracks UI */}
              <div className="text-center py-10">
                <Sparkles size={48} className="text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-400">Discover more tracks like this one!</p>
                <p className="text-xs text-neutral-500 mt-1">Feature currently under development.</p>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
} 