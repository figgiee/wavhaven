"use server";

import prisma from "@/lib/db/prisma";
import { UserRole } from "@prisma/client";

// Define the shape of the data we want to return for each producer card
export type FeaturedProducer = {
	id: string;
	username: string | null;
	profileImageUrl: string | null;
	storeName: string | null; // Use username or fallback
	bio: string | null;
	bannerImageUrl: string | null;
	isVerified: boolean;
	memberSince: string; // Formatted date string
	stats: {
		beats: number;
		plays: number;
		likes: number;
	};
};

/**
 * Fetches a limited number of featured producers.
 * Currently fetches the most recent users with the PRODUCER role.
 * @param limit - The maximum number of producers to fetch.
 * @returns A promise resolving to an array of FeaturedProducer objects.
 */
export async function getFeaturedProducers(
	limit: number = 3,
): Promise<FeaturedProducer[]> {
	try {
		console.log(`[getFeaturedProducers] Fetching up to ${limit} producers...`);
		const producersData = await prisma.user.findMany({
			where: {
				role: UserRole.PRODUCER,
			},
			select: {
				id: true,
				username: true,
				profileImageUrl: true,
				createdAt: true, // Select user creation date
				sellerProfile: {
					select: {
						bio: true,
						bannerImageUrl: true,
						isVerified: true,
					},
				},
				tracks: { // Select tracks to calculate counts
					select: {
						playCount: true,
						likeCount: true,
					}
				}
			},
			orderBy: {
				createdAt: "desc", // Order by newest for now
			},
			take: limit,
		});

		console.log(`[getFeaturedProducers] Found ${producersData.length} producers.`);

		// Map the fetched data to the FeaturedProducer type
		const featuredProducers: FeaturedProducer[] = producersData.map((p) => {
			const totalPlays = p.tracks.reduce((sum, track) => sum + track.playCount, 0);
			const totalLikes = p.tracks.reduce((sum, track) => sum + track.likeCount, 0);
			const beatsCount = p.tracks.length;
			const memberSinceDate = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(p.createdAt);

			return {
				id: p.id,
				username: p.username,
				profileImageUrl: p.profileImageUrl,
				storeName: p.username ?? `Producer ${p.id.substring(0, 4)}`, // Use username as display name source
				bio: p.sellerProfile?.bio ?? null,
				bannerImageUrl: p.sellerProfile?.bannerImageUrl ?? null,
				isVerified: p.sellerProfile?.isVerified ?? false,
				memberSince: `Joined ${memberSinceDate}`,
				stats: {
					beats: beatsCount,
					plays: totalPlays,
					likes: totalLikes,
				},
			};
		});

		return featuredProducers;
	} catch (error: unknown) {
		console.error("[getFeaturedProducers] Error fetching producers:", error);
		return []; // Return empty array on error
	}
} 