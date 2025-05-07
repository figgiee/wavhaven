    // src/types/index.ts
    import type { Track, License, TrackFile } from '@prisma/client';

    export interface Beat {
        id: string; // Use string from Prisma
        title: string;
        imageUrl?: string | null; // From getStorageUrl
        coverImageUrl?: string | null; // Raw path from Prisma
        producerName: string;
        producerProfileUrl?: string | null; // Link to producer page
        price?: number | null; // Price might be null if no licenses
        bpm?: number | null; // Optional from Prisma
        key?: string | null; // Optional from Prisma
        audioSrc?: string | null; // From getStorageUrl
        previewAudioUrl?: string | null; // Raw path from Prisma
        beatUrl?: string; // Link to the beat detail page
        licenseId?: string; // For cart logic - might be generated
        licenses?: { price: number }[]; // Include licenses for price extraction
        sellerProfile?: { storeName: string | null } | null; // Include seller profile for producer name
        // Add other potentially needed fields
      }
  
      // Type for search results might differ slightly
      export interface TrackSearchResult {
        id: string;
        title: string;
        description?: string | null;
        producerId: string;
        previewAudioUrl?: string | null;
        coverImageUrl?: string | null;
        bpm?: number | null;
        key?: string | null;
        contentType: string; // Assuming ContentType enum as string
        tags: string[];
        isPublished: boolean;
        createdAt: Date;
        updatedAt: Date;
        licenses: { // Ensure licenses are included
          price: number;
        }[];
        producer: { // Include producer and sellerProfile
          name: string | null;
          sellerProfile: {
            storeName: string | null;
          } | null;
        } | null;
         // Add sellerProfile directly if that's how your relation works
         sellerProfile?: {
          storeName: string | null;
        } | null;
      }
  
      // You might also need the CartItem type here if not defined elsewhere
      // export interface CartItem { ... }

      // Add the new interface
      export interface PlayerTrack {
        id: string | number;
        title: string;
        artist: string; // Producer name
        audioSrc: string; // URL to MP3/WAV
        coverImage?: string; // Optional cover art URL
        url?: string; // Optional link to track page
        // Add any other essential fields needed directly by the player UI
      }

      // Type for displaying tracks in the producer dashboard list
      export type TrackListItem = Pick<
        Track,
        'id' | 'title' | 'slug' | 'bpm' | 'key' | 'isPublished' | 'artworkUrl' | 'createdAt'
      > & {
        // Include minimal license info to determine price range or status
        licenses: Pick<License, 'price'>[]; 
      };

      // Type for data needed by the Edit Track form
      export type TrackForEdit = Pick<
        Track,
        | 'id'
        | 'title'
        | 'description'
        | 'bpm'
        | 'key'
        | 'tags'
        // Add other simple fields if needed (genreId, moodId?)
      > & {
        licenses: (Omit<License, 'price'> & { price: number })[]; 
        trackFiles: TrackFile[]; // Include associated track files
      };

      // Type returned by the server action `getBeatDetails`
      // Should include all necessary details for the panel
      export type FullTrackDetails = Track & {
        licenses?: PrismaLicense[];
        producer?: User & {
          sellerProfile?: { storeName: string | null } | null;
        };
        tags?: Tag[];
        moods?: Mood[];
        _count?: {
          likes?: number;
          comments?: number;
        };
        // Example: Add a field indicating if the current user liked this track
        // This would need to be added to the Prisma query in getBeatDetails
        currentUserHasLiked?: boolean;
        // Fields that might be aliases or require adaptation:
        artworkUrl?: string | null; // Potentially derived/renamed coverImageUrl
        duration?: number; // Need to ensure this exists on Track or calculate
        packageDiscountAvailable?: boolean; // Business logic - where does this come from?
        url?: string; // Derived URL for the beat page
        likeCount?: number; // Alternative to _count.likes
        commentCount?: number; // Alternative to _count.comments
        isLikedByUser?: boolean; // Alternative to currentUserHasLiked
        isForSale?: boolean; // Logic based on licenses?
      };

      // Represents the data structure needed by the SlideOutPanel's child components
      // This is derived/adapted from FullTrackDetails
      export type AdaptedBeatData = {
        id: string; // Use string id
        title: string;
        producer: {
          name: string;
          // Add other producer details if needed by children
        };
        artworkUrl: string; // Ensure non-null with fallback
        previewAudioUrl?: string | null; // Pass through preview URL
        duration: number; // Ensure non-null with fallback
        packageDiscountAvailable: boolean;
        url: string; // Ensure non-null with fallback
        likes: number;
        commentCount: number;
        initialIsLiked: boolean; // For like button state
        genre: string; // Ensure non-null with fallback
        tempo: number; // BPM, ensure non-null with fallback
        moods: string[]; // Array of mood names
        tags: string[]; // Array of tag names
        isForSale: boolean;
        licenses: Array<{
          id: string;
          name: string;
          price: number; // Use number type for display
          description: string;
        }>;
        description: string | null; // Add the missing description field
      };

      // License type used within AdaptedBeatData (already defined above)
      // export type License = {
      //   id: string;
      //   name: string;
      //   price: number;
      //   description: string;
      // };