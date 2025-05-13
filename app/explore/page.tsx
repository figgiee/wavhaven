import { Suspense } from 'react';
import { searchTracks } from "@/server-actions/trackActions"; // Assuming this action accepts searchParams
import { ExploreClientUI } from '@/components/explore/ExploreClientUI';
import type { License } from '@/components/license/license.types'; // Keep type if needed for mapping
import { Skeleton } from '@/components/ui/skeleton'; // Keep for SkeletonGrid
import React from 'react';
import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { ListFilter } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose // Import SheetClose for explicit closing if needed
} from "@/components/ui/sheet";
import { FilterSidebar, AppliedFilters } from '@/components/explore/FilterSidebar'; // Import the new sidebar
import { Breadcrumbs } from '@/components/ui/breadcrumbs'; // Import Breadcrumbs
import type { Beat } from '@/types'; // Import the Beat type
import { Container } from '@/components/layout/Container'; // Updated import path

// --- Constants (Keep only if needed server-side, like ITEMS_PER_PAGE) ---
// const ITEMS_PER_PAGE = 9; // Move to client if pagination logic moves there
// const DEFAULT_BPM_RANGE: [number, number] = [60, 180]; // Move to client
// const DEFAULT_PRICE_RANGE: [number, number] = [0, 200]; // Move to client

// --- Types (Keep only if needed server-side for mapping) ---
// interface FilterValues { ... } // Move to client
// type SortOrder = 'relevance' | 'newest' | 'price_asc' | 'price_desc'; // Move to client or keep if used in searchTracks signature

// --- Updated Skeleton Component for Luminous Depths ---
// Keeping skeleton logic within ExploreClientUI for now, removing duplicate here.

interface ExplorePageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export const metadata: Metadata = {
  title: 'Explore Beats - Wavhaven',
  description: 'Discover and browse high-quality beats, loops, and sound kits from talented producers.',
};

// --- Server Component --- 
export default async function ExplorePage({ searchParams }: ExplorePageProps) {

  // Create a truly plain object from searchParams
  const plainSearchParams: { [key: string]: string | string[] | undefined } = {};
  for (const key in searchParams) {
    if (Object.prototype.hasOwnProperty.call(searchParams, key)) {
      const value = searchParams[key];
      // Ensure only string, array of strings, or undefined are passed
      if (typeof value === 'string' || Array.isArray(value) || typeof value === 'undefined') {
        plainSearchParams[key] = value;
      }
    }
  }

  // const breadcrumbItems = [
  //   { label: 'Home', href: '/' },
  //   { label: 'Explore', isCurrent: true },
  // ];

  return (
    <Container>
      <h1 className="text-3xl font-bold mb-6 text-center">Explore Sounds</h1>
      {/* <Breadcrumbs items={breadcrumbItems} className="mb-4" /> */}
      {/* Pass searchParams directly to the client component */}
      {/* Use Suspense for client-side data fetching */}
      <Suspense fallback={<div>Loading filters and results...</div>}>
        <ExploreClientUI serverSearchParams={plainSearchParams} />
      </Suspense>
    </Container>
  );
} 