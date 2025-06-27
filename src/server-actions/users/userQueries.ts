"use server";

import prisma from "@/lib/db/prisma";
import { UserRole } from "@prisma/client";
import { clerkClient } from '@clerk/nextjs/server';
import { UserProfileHeaderData } from '@/types';

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

export type ProducerStats = {
	totalRevenue: number;
	totalSales: number;
	totalPlays: number;
	totalLikes: number;
	totalTracks: number;
}

export async function getProducerDashboardStats(producerId: string): Promise<ProducerStats> {
	try {
		if (!producerId) {
			throw new Error("Producer ID is required.");
		}

		// 1. Get all track IDs for the producer
		const producerTracks = await prisma.track.findMany({
			where: { producerId: producerId },
			select: { id: true, playCount: true, likeCount: true },
		});

		const trackIds = producerTracks.map(t => t.id);

		// 2. Calculate track-related stats
		const totalPlays = producerTracks.reduce((sum, track) => sum + track.playCount, 0);
		const totalLikes = producerTracks.reduce((sum, track) => sum + track.likeCount, 0);
		const totalTracks = producerTracks.length;

		// 3. Get order items related to the producer's tracks
		const orderItems = await prisma.orderItem.findMany({
			where: {
				trackId: { in: trackIds },
				order: {
					status: 'COMPLETED', // Only count completed orders
				},
			},
			select: {
				price: true,
			},
		});

		// 4. Calculate sales-related stats
		const totalSales = orderItems.length;
		const totalRevenue = orderItems.reduce((sum, item) => sum + Number(item.price), 0);

		return {
			totalRevenue,
			totalSales,
			totalPlays,
			totalLikes,
			totalTracks,
		};

	} catch (error) {
		console.error(`Error fetching dashboard stats for producer ${producerId}:`, error);
		// Return a default/zeroed object on error
		return {
			totalRevenue: 0,
			totalSales: 0,
			totalPlays: 0,
			totalLikes: 0,
			totalTracks: 0,
		};
	}
}

export async function getPublicUserData(username: string): Promise<UserProfileHeaderData | null> {
	try {
		const user = await prisma.user.findUnique({
			where: { username },
			select: {
				id: true,
				username: true,
				firstName: true,
				lastName: true,
				profileImageUrl: true,
				createdAt: true,
				sellerProfile: {
					select: {
						bio: true,
						websiteUrl: true,
						twitterUrl: true,
						instagramUrl: true,
						youtubeUrl: true,
						soundCloudUrl: true,
						bannerImageUrl: true,
						isVerified: true,
					},
				},
			},
		});

		return user;
	} catch (error) {
		console.error('Error fetching public user data:', error);
		return null;
	}
}

export async function getUserPlaylists(userId: string): Promise<{ id: string; name: string }[]> {
	try {
		const playlists = await prisma.playlist.findMany({
			where: { userId },
			select: {
				id: true,
				name: true,
			},
			orderBy: {
				createdAt: 'desc',
			},
		});
		return playlists;
	} catch (error) {
		console.error('Error fetching user playlists:', error);
		return [];
	}
}

export interface AnalyticsDataPoint {
	date: string;
	sales: number;
	revenue: number;
	plays: number;
}

export interface ProducerAnalytics {
	last30Days: AnalyticsDataPoint[];
	topTracks: {
		id: string;
		title: string;
		plays: number;
		sales: number;
		revenue: number;
	}[];
}

export async function getProducerAnalytics(producerId: string): Promise<ProducerAnalytics> {
	try {
		// Get date range for last 30 days
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		
		// Get daily sales data
		const dailySales = await prisma.$queryRaw<{
			date: Date;
			sales: bigint;
			revenue: bigint;
		}[]>`
			SELECT 
				DATE(o."createdAt") as date,
				COUNT(DISTINCT o.id) as sales,
				COALESCE(SUM(o."totalAmount"), 0) as revenue
			FROM "Order" o
			JOIN "OrderItem" oi ON oi."orderId" = o.id
			JOIN "Track" t ON t.id = oi."trackId"
			WHERE t."producerId" = ${producerId}
				AND o.status = 'COMPLETED'
				AND o."createdAt" >= ${thirtyDaysAgo}
			GROUP BY DATE(o."createdAt")
			ORDER BY DATE(o."createdAt")
		`;

		// Get daily plays data (assuming we have a plays tracking mechanism)
		// For now, we'll simulate this with track view data or use a placeholder
		const dailyPlays = await prisma.$queryRaw<{
			date: Date;
			plays: bigint;
		}[]>`
			SELECT 
				DATE(t."updatedAt") as date,
				SUM(t."playCount") as plays
			FROM "Track" t
			WHERE t."producerId" = ${producerId}
				AND t."updatedAt" >= ${thirtyDaysAgo}
			GROUP BY DATE(t."updatedAt")
			ORDER BY DATE(t."updatedAt")
		`;

		// Create a map of sales data by date
		const salesMap = new Map(
			dailySales.map(item => [
				item.date.toISOString().split('T')[0],
				{
					sales: Number(item.sales),
					revenue: Number(item.revenue) / 100 // Convert from cents
				}
			])
		);

		// Create a map of plays data by date
		const playsMap = new Map(
			dailyPlays.map(item => [
				item.date.toISOString().split('T')[0],
				Number(item.plays)
			])
		);

		// Generate array for last 30 days with combined data
		const last30Days: AnalyticsDataPoint[] = [];
		for (let i = 29; i >= 0; i--) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			const dateStr = date.toISOString().split('T')[0];
			
			const salesData = salesMap.get(dateStr) || { sales: 0, revenue: 0 };
			const plays = playsMap.get(dateStr) || 0;

			last30Days.push({
				date: dateStr,
				sales: salesData.sales,
				revenue: salesData.revenue,
				plays: plays
			});
		}

		// Get top performing tracks
		const topTracks = await prisma.$queryRaw<{
			id: string;
			title: string;
			plays: bigint;
			sales: bigint;
			revenue: bigint;
		}[]>`
			SELECT 
				t.id,
				t.title,
				t."playCount" as plays,
				COUNT(DISTINCT o.id) as sales,
				COALESCE(SUM(o."totalAmount"), 0) as revenue
			FROM "Track" t
			LEFT JOIN "OrderItem" oi ON oi."trackId" = t.id
			LEFT JOIN "Order" o ON o.id = oi."orderId" AND o.status = 'COMPLETED'
			WHERE t."producerId" = ${producerId}
				AND t."isPublished" = true
			GROUP BY t.id, t.title, t."playCount"
			ORDER BY (t."playCount" + COUNT(DISTINCT o.id)) DESC
			LIMIT 5
		`;

		return {
			last30Days,
			topTracks: topTracks.map(track => ({
				id: track.id,
				title: track.title,
				plays: Number(track.plays),
				sales: Number(track.sales),
				revenue: Number(track.revenue) / 100 // Convert from cents
			}))
		};

	} catch (error) {
		console.error('Error fetching producer analytics:', error);
		// Return empty data in case of error
		return {
			last30Days: [],
			topTracks: []
		};
	}
} 