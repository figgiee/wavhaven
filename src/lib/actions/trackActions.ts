import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/db/prisma'; // Correct import
import type { Beat } from '@/types'; // Import the Beat type
import { supabase } from '@/lib/supabase/client'; // Adjust path if needed

// Define a schema for expected search parameters for validation and type safety
const searchParamsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(9), // Default ITEMS_PER_PAGE
  q: z.string().optional(), // keyword
  type: z.string().optional(), // contentType
  sort: z.enum(['relevance', 'newest', 'price_asc', 'price_desc']).optional().default('relevance'),
  genre: z.union([z.string(), z.array(z.string())]).optional(),
  bpm_min: z.coerce.number().int().optional(),
  bpm_max: z.coerce.number().int().optional(),
  key: z.union([z.string(), z.array(z.string())]).optional(),
  tag: z.union([z.string(), z.array(z.string())]).optional(),
  min_price: z.coerce.number().int().optional(),
  max_price: z.coerce.number().int().optional(),
}).passthrough(); // Allow other params not defined here

interface SearchParams {
  [key: string]: string | string[] | undefined;
}

// Helper function using Supabase
function getPublicUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) {
    // Return null instead of a placeholder URL to avoid fetch errors
    return null; 
  }
  try {
    // Use the correct bucket name provided by the user
    const { data } = supabase.storage.from('wavhaven-tracks').getPublicUrl(storagePath);
    // console.log(`Generated URL for ${storagePath}: ${data?.publicUrl}`); // Debugging
    return data?.publicUrl ?? null;
  } catch (error) {
    console.error(`Error getting public URL for ${storagePath}:`, error);
    return null; // Return null on error
  }
}

// Update the function signature and parameter extraction
export async function searchTracks(
    { searchParams }: { searchParams: SearchParams }
): Promise<{ tracks: Beat[]; totalCount: number }> {
  try {
    // Validate and parse searchParams using the schema
    const validatedParams = searchParamsSchema.safeParse(searchParams);

    if (!validatedParams.success) {
      console.error("Invalid search params:", validatedParams.error.flatten());
      // Handle invalid parameters gracefully, e.g., return empty results or throw specific error
      return { tracks: [], totalCount: 0 };
    }

    const {
      page,
      limit,
      q: query,
      sort: sortBy,
      genre: genres,
      bpm_min,
      bpm_max,
      key: keys,
      tag: tags,
      min_price,
      max_price
    } = validatedParams.data;

    // --- Keep existing Prisma query logic --- 
    const whereClause: Prisma.TrackWhereInput = {
      isPublished: true,
      // Apply filters based on validatedParams
    };

    if (query) {
      whereClause.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { some: { name: { contains: query, mode: 'insensitive' } } } },
        { producer: { username: { contains: query, mode: 'insensitive' } } }
      ];
    }

    // Handle array or single string for genres, keys, tags
    const processMultiParam = (param: string | string[] | undefined): string[] | undefined => {
        if (Array.isArray(param)) return param.length > 0 ? param : undefined;
        return param ? [param] : undefined;
    };
    const validGenres = processMultiParam(genres);
    const validKeys = processMultiParam(keys);
    const validTags = processMultiParam(tags);

    if (validGenres) {
      whereClause.genres = { some: { name: { in: validGenres, mode: 'insensitive' } } };
    }
    if (validKeys) {
        whereClause.key = { in: validKeys, mode: 'insensitive' };
    }
    if (validTags) {
        whereClause.tags = { some: { name: { in: validTags, mode: 'insensitive' } } };
    }

    if (bpm_min !== undefined && bpm_max !== undefined) {
      whereClause.bpm = { gte: bpm_min, lte: bpm_max };
    } else if (bpm_min !== undefined) {
      whereClause.bpm = { gte: bpm_min };
    } else if (bpm_max !== undefined) {
      whereClause.bpm = { lte: bpm_max };
    }
    
    // Price filtering requires joining/querying License model
    // For simplicity, assuming a direct price field on Track or adjusting License query later
    // Example if filtering by related License price (adjust model/relations as needed)
     if (min_price !== undefined || max_price !== undefined) {
       whereClause.licenses = {
         some: {
           price: {
             gte: min_price,
             lte: max_price,
           },
         },
       };
     }

    // --- Keep existing orderBy logic --- 
    let orderByClause: Prisma.TrackOrderByWithRelationInput | Prisma.TrackOrderByWithRelationInput[] = {};

    switch (sortBy) {
      case 'newest':
        orderByClause = { createdAt: 'desc' };
        break;
      // case 'price_asc': // Requires joining License or a calculated field
      //   orderByClause = { licenses: { _min: { price: 'asc' } } }; // Example, needs schema support
      //   break;
      // case 'price_desc': // Requires joining License or a calculated field
      //  orderByClause = { licenses: { _max: { price: 'desc' } } }; // Example, needs schema support
      //  break;
      default:
        // Default sort or relevance logic (e.g., by plays, likes, or just createdAt)
        orderByClause = { createdAt: 'desc' }; // Defaulting to newest for now
        break;
    }

    // --- Keep existing pagination logic --- 
    const skip = (page - 1) * limit;

    const [tracks, totalCount] = await prisma.$transaction([
      prisma.track.findMany({
        where: whereClause,
        orderBy: orderByClause,
        skip: skip,
        take: limit,
        include: {
          producer: {
            select: {
              username: true,
              // storeName: true, // Add if SellerProfile relation exists and is needed
              profileImageUrl: true,
            },
          },
          licenses: {
            select: {
              id: true,
              type: true,
              price: true,
            },
          },
          // Include specific relations for cover and preview
          coverImage: { // Include coverImage relation
            select: { storagePath: true }
          },
          previewAudio: { // Include previewAudio relation
            select: { storagePath: true }
          },
          // Remove the old trackFiles include if only preview/cover are needed here
          // trackFiles: {
          //      where: { type: 'PREVIEW' },
          //      select: { url: true },
          //      take: 1
          //  }
        },
      }),
      prisma.track.count({ where: whereClause }),
    ]);

    // Map data including proper URLs
    const formattedTracks: Beat[] = tracks.map(track => {
      // --- DEBUG LOGGING --- 
      console.log(`Mapping track ID: ${track.id}`);
      console.log(`  Raw coverImage data:`, track.coverImage);
      console.log(`  Raw previewAudio data:`, track.previewAudio);
      console.log(`  Cover storagePath: ${track.coverImage?.storagePath}`);
      console.log(`  Preview storagePath: ${track.previewAudio?.storagePath}`);
      // --- END DEBUG LOGGING ---
      
      const coverArtUrl = getPublicUrl(track.coverImage?.storagePath);
      const previewAudioUrl = getPublicUrl(track.previewAudio?.storagePath);

      console.log(`  Generated Cover URL: ${coverArtUrl}`);
      console.log(`  Generated Preview URL: ${previewAudioUrl}`);

      return {
        id: track.id,
        title: track.title,
        // Use the generated public URL for images
        imageUrl: coverArtUrl, 
        coverImageUrl: coverArtUrl, // Use the same URL for both if applicable
        producerName: track.producer?.username ?? 'Unknown',
        producerProfileUrl: track.producer?.username ? `/u/${track.producer.username}` : undefined,
        bpm: track.bpm,
        key: track.key,
        // Use the generated public URL for audio source
        previewAudioUrl: previewAudioUrl, 
        audioSrc: previewAudioUrl, // Use preview URL for the main audio source in TrackCard
        beatUrl: `/track/${track.slug}`,
        licenses: track.licenses.map(l => ({ price: l.price?.toNumber() ?? 0 })), 
        price: track.licenses[0]?.price?.toNumber() ?? null, 
      };
    });

    return { tracks: formattedTracks, totalCount };
  } catch (error) {
    console.error("Error searching tracks:", error);
    // Consider more specific error handling or re-throwing
    return { tracks: [], totalCount: 0 }; // Return empty on error
  }
} 