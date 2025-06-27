"use server";

import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db/prisma";
import { getInternalUserId } from "@/lib/userUtils";
import { createSignedUrl, getPublicUrl } from "@/lib/storage";
import {
	TrackFileType,
	Track,
	License,
	LicenseType,
	Prisma,
	User,
	TrackFile,
} from "@prisma/client";
import * as z from "zod";
import { posthogServerClient } from "@/lib/posthog-server";
import type { TrackListItem, TrackForEdit } from "@/types";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";

//================================================================//
//                          TYPE DEFINITIONS                      //
//================================================================//

export type TrackSearchResult = {
	id: string;
	title: string;
	slug: string;
	createdAt: Date;
	bpm: number | null;
	key: string | null;
	previewAudioUrl?: string | null;
	coverImageUrl?: string | null;
	producer: {
		id: string;
		firstName: string | null;
		lastName: string | null;
		username: string | null;
		sellerProfile: {
			id: string;
		} | null;
	} | null;
	licenses: {
		id: string;
		type: LicenseType;
		name: string;
		description: string | null;
		filesIncluded: TrackFileType[];
		price: number;
		isLiked?: boolean;
	}[];
};

export type TrackDetails = Track & {
	producer: Pick<User, "id" | "firstName" | "lastName" | "username"> & {
		sellerProfile: {
			id: string;
		} | null;
	};
	licenses: (Omit<License, "price"> & { price: number })[];
	coverImageUrl?: string | null;
	previewAudioUrl?: string | null;
};

interface SearchInput {
	query?: string;
	type?: string;
	genre?: string;
	mood?: string;
	minBpm?: number;
	maxBpm?: number;
	key?: string;
	tags?: string;
	minPrice?: number;
	maxPrice?: number;
	sortBy?: string;
	page?: number;
	limit?: number;
}

interface TrackWithRelations extends Track {
	producer: {
		id: string;
		firstName: string | null;
		lastName: string | null;
		username?: string | null;
		sellerProfile: {
			id: string;
		} | null;
	} | null;
	licenses: License[];
	trackFiles?: TrackFile[];
}

export type SimilarTrackCardData = {
	id: string;
	title: string;
	slug: string;
	producer: Pick<User, "id" | "firstName" | "lastName">;
	licenses: Pick<License, "price">[];
};

interface GetSimilarTracksParams {
	trackId: string;
	producerName: string;
	limit?: number;
}

export type FullTrackDetails = Track & {
	previewAudioUrl?: string | null;
	coverImageUrl?: string | null;
	producer: Pick<User, "id" | "username" | "firstName" | "lastName"> & {
		sellerProfile: {
			id: string;
		} | null;
	};
	licenses: (Omit<License, "price"> & { price: number })[];
	_count?: { likes: number; comments: number };
	currentUserHasLiked?: boolean;
	tags: { id: string; name: string }[];
	genres: { id: string; name: string }[];
	moods: { id: string; name: string }[];
};

interface SearchResult {
	tracks: TrackSearchResult[];
	totalCount: number;
}

//================================================================//
//                       VALIDATION SCHEMAS                       //
//================================================================//

const allowedContentTypes = [
	"beat",
	"beats",
	"loop",
	"loops",
	"soundkit",
	"soundkits",
	"preset",
	"presets",
] as const;

const allowedSortBy = [
	"relevance",
	"newest",
	"popularity",
	"price_asc",
	"price_desc",
] as const;

const searchTracksSchema = z
	.object({
		query: z.string().max(100, "Search query is too long").optional(),
		type: z.enum(allowedContentTypes).optional(),
		genre: z.string().max(50, "Genre name is too long").optional(),
		mood: z.string().max(50, "Mood name is too long").optional(),
		minBpm: z.coerce
			.number()
			.int()
			.positive("Minimum BPM must be positive")
			.optional(),
		maxBpm: z.coerce
			.number()
			.int()
			.positive("Maximum BPM must be positive")
			.optional(),
		key: z.string().max(10, "Key name is too long").optional(),
		tags: z.string().max(200, "Tags string is too long").optional(),
		minPrice: z.coerce
			.number()
			.min(0, "Minimum price cannot be negative")
			.optional(),
		maxPrice: z.coerce
			.number()
			.min(0, "Maximum price cannot be negative")
			.optional(),
		sortBy: z.enum(allowedSortBy).optional().default("relevance"),
		page: z.coerce
			.number()
			.int()
			.min(1, "Page number must be 1 or greater")
			.optional()
			.default(1),
		limit: z.coerce
			.number()
			.int()
			.min(1)
			.max(100, "Limit cannot exceed 100")
			.optional()
			.default(12),
	})
	.refine(
		(data) => !data.minBpm || !data.maxBpm || data.minBpm <= data.maxBpm,
		{
			message: "Minimum BPM cannot be greater than Maximum BPM",
			path: ["minBpm"],
		},
	)
	.refine(
		(data) =>
			!data.minPrice || !data.maxPrice || data.minPrice <= data.maxPrice,
		{
			message: "Minimum price cannot be greater than Maximum price",
			path: ["minPrice"],
		},
	);

//================================================================//
//                        HELPER FUNCTIONS                        //
//================================================================//

async function getUserIdsByUsername(usernameQuery: string): Promise<string[]> {
	const users = await prisma.user.findMany({
		where: { username: { contains: usernameQuery, mode: "insensitive" } },
		select: { id: true },
	});
	return users.map((u) => u.id);
}

async function shapeTrackDataForDetails(
	trackData: TrackWithRelations | null,
): Promise<TrackDetails | null> {
	if (!trackData || !trackData.producer) {
		return null;
	}

	const coverFile = trackData.trackFiles?.find(
		(f) =>
			f.fileType === TrackFileType.IMAGE_PNG ||
			f.fileType === TrackFileType.IMAGE_JPEG ||
			f.fileType === TrackFileType.IMAGE_WEBP,
	);
	const previewAudioFile = trackData.trackFiles?.find(
		(f) => f.fileType === TrackFileType.PREVIEW_MP3,
	);

	let coverImageUrl: string | null = null;
	if (coverFile?.storagePath) {
		coverImageUrl = getPublicUrl(coverFile.storagePath);
	}

	let previewAudioUrl: string | null = null;
	if (previewAudioFile?.storagePath) {
		previewAudioUrl = getPublicUrl(previewAudioFile.storagePath);
	}

	const licenses = trackData.licenses.map((license: License) => {
		return {
			...license,
			price: Number(license.price),
		};
	});

	const shapedData: TrackDetails = {
		...trackData,
		producer: {
			id: trackData.producer.id,
			firstName: trackData.producer.firstName,
			lastName: trackData.producer.lastName,
			username: trackData.producer.username || null,
			sellerProfile: trackData.producer.sellerProfile,
		},
		licenses: licenses,
		coverImageUrl,
		previewAudioUrl,
	};

	return shapedData;
}

//================================================================//
//                      EXPORTED QUERY FUNCTIONS                  //
//================================================================//

export async function searchTracks(input: SearchInput): Promise<SearchResult> {
	const validationResult = searchTracksSchema.safeParse(input);
	if (!validationResult.success) {
		console.error("Search validation failed:", validationResult.error.flatten());
		return { tracks: [], totalCount: 0 };
	}
	const {
		query,
		type,
		genre,
		mood,
		minBpm,
		maxBpm,
		key,
		tags,
		minPrice,
		maxPrice,
		sortBy,
		page,
		limit,
	} = validationResult.data;

	const { userId: clerkId } = currentUser();
	let internalUserId: string | null = null;
	if (clerkId) {
		internalUserId = await getInternalUserId(clerkId).catch(() => null);
	}

	const where: Prisma.TrackWhereInput = {};
	const orderBy: Prisma.TrackOrderByWithRelationInput[] = [];

	if (query) {
		const producerIds = await getUserIdsByUsername(query);
		where.OR = [
			{ title: { contains: query, mode: "insensitive" } },
			{ description: { contains: query, mode: "insensitive" } },
			{ producerId: { in: producerIds } },
			{ tags: { some: { name: { contains: query, mode: "insensitive" } } } },
		];
	}

	if (type) where.contentType = { equals: type as any };
	if (genre) where.genres = { some: { name: { equals: genre } } };
	if (mood) where.moods = { some: { name: { equals: mood } } };
	if (key) where.key = { equals: key };
	if (minBpm) where.bpm = { ...where.bpm, gte: minBpm };
	if (maxBpm) where.bpm = { ...where.bpm, lte: maxBpm };

	if (minPrice !== undefined || maxPrice !== undefined) {
		where.licenses = {
			some: {
				price: {
					gte: minPrice,
					lte: maxPrice,
				},
			},
		};
	}

	switch (sortBy) {
		case 'newest':
			orderBy.push({ createdAt: 'desc' });
			break;
		case 'popularity':
			orderBy.push({ playCount: 'desc' });
			break;
		case 'price_asc':
			orderBy.push({ minPrice: 'asc' });
			break;
		case 'price_desc':
			orderBy.push({ minPrice: 'desc' });
			break;
		case 'relevance':
		default:
			break;
	}

	const skip = (page - 1) * limit;

	try {
		const totalCount = await prisma.track.count({ where });
		const tracksData = await prisma.track.findMany({
			where,
			orderBy,
			skip,
			take: limit,
			include: {
				producer: {
					select: { id: true, firstName: true, lastName: true, username: true, sellerProfile: { select: { id: true } } },
				},
				licenses: {
					select: { id: true, type: true, price: true, name: true, filesIncluded: true, description: true },
					orderBy: { price: "asc" },
				},
				trackFiles: { select: { storagePath: true, fileType: true } },
				likes: internalUserId ? { where: { userId: internalUserId }, select: { id: true } } : undefined,
			},
		});

		const resultsWithUrls: TrackSearchResult[] = tracksData.map((track) => {
			const previewAudioPath = track.trackFiles?.find((f) => f.fileType === "PREVIEW_MP3")?.storagePath;
			const fallbackAudioPath = !previewAudioPath ? track.trackFiles?.find((f) => f.fileType === "MAIN_MP3")?.storagePath : null;
			const coverPath = track.trackFiles?.find((f) => ["IMAGE_PNG", "IMAGE_JPEG", "IMAGE_WEBP"].includes(f.fileType))?.storagePath;

			return {
				...track,
				producer: track.producer,
				licenses: track.licenses.map((l) => ({ ...l, price: Number(l.price) })),
				previewAudioUrl: previewAudioPath ? getPublicUrl(previewAudioPath) : (fallbackAudioPath ? getPublicUrl(fallbackAudioPath) : null),
				coverImageUrl: coverPath ? getPublicUrl(coverPath) : null,
				isLiked: !!track.likes?.length,
			};
		});

		return { tracks: resultsWithUrls, totalCount };
	} catch (error) {
		console.error("Error in searchTracks:", error);
		if (posthogServerClient) {
			posthogServerClient.capture({
				distinctId: "system_error_search",
				event: "track_search_failed",
				properties: {
					error: error instanceof Error ? error.message : "Unknown search error",
					input: JSON.stringify(input),
				},
			});
		}
		return { tracks: [], totalCount: 0 };
	}
}

export async function getTrackById(trackId: string): Promise<TrackDetails | null> {
	const validationResult = z.string().uuid().safeParse(trackId);
	if (!validationResult.success) {
		return null;
	}

	try {
		const trackData = await prisma.track.findUnique({
			where: { id: validationResult.data, isPublished: true },
			include: {
				producer: { select: { id: true, firstName: true, lastName: true, username: true, sellerProfile: { select: { id: true } } } },
				licenses: { orderBy: { price: "asc" } },
				trackFiles: true,
			},
		});

		return shapeTrackDataForDetails(trackData as unknown as TrackWithRelations);
	} catch (error) {
		console.error(`Error fetching track with ID ${trackId}:`, error);
		return null;
	}
}

export async function fetchLicensesForTrack(trackId: string): Promise<License[]> {
	const parseResult = z.string().uuid().safeParse(trackId);
	if (!parseResult.success) {
		throw new Error(parseResult.error.message);
	}
	const trackWithLicenses = await prisma.track.findUnique({
		where: { id: trackId },
		select: { licenses: true },
	});
	return trackWithLicenses?.licenses || [];
}

export async function getProducerTracks(clerkUserId: string): Promise<TrackListItem[]> {
	if (!clerkUserId) return [];
	try {
		const internalUserId = await getInternalUserId(clerkUserId);
		if (!internalUserId) return [];

		const tracks = await prisma.track.findMany({
			where: { producerId: internalUserId },
			select: {
				id: true,
				title: true,
				slug: true,
				bpm: true,
				key: true,
				isPublished: true,
				createdAt: true,
				licenses: { select: { price: true }, orderBy: { price: "asc" } },
				trackFiles: { where: { fileType: { in: ["IMAGE_PNG", "IMAGE_JPEG", "IMAGE_WEBP"] } }, select: { storagePath: true }, take: 1 },
			},
			orderBy: { createdAt: "desc" },
		});

		const trackListItems: TrackListItem[] = tracks.map((track) => {
			const coverImagePath = track.trackFiles[0]?.storagePath;
			return {
				id: track.id,
				title: track.title,
				slug: track.slug,
				coverImageUrl: coverImagePath ? getPublicUrl(coverImagePath) : null,
				bpm: track.bpm,
				key: track.key,
				isPublished: track.isPublished,
				price: track.licenses[0]?.price ? Number(track.licenses[0].price) : 0,
				createdAt: track.createdAt,
			};
		});
		return trackListItems;
	} catch (error) {
		console.error("Error fetching producer tracks:", error);
		return [];
	}
}

export async function getTrackBySlug(slug: string): Promise<TrackDetails | null> {
	if (!slug) return null;
	try {
		const trackData = await prisma.track.findUnique({
			where: { slug, isPublished: true },
			include: {
				producer: { select: { id: true, firstName: true, lastName: true, username: true, sellerProfile: { select: { id: true } } } },
				licenses: { orderBy: { price: "asc" } },
				trackFiles: true,
			},
		});
		return shapeTrackDataForDetails(trackData as unknown as TrackWithRelations);
	} catch (error) {
		console.error(`Error fetching track by slug ${slug}:`, error);
		return null;
	}
}

export async function getSimilarTracks({ trackId, producerName, limit = 4 }: GetSimilarTracksParams): Promise<SimilarTrackCardData[]> {
	if (!producerName) return [];
	try {
		const producerIds = await getUserIdsByUsername(producerName);
		if (producerIds.length === 0) return [];

		const similarTracks = await prisma.track.findMany({
			where: {
				producerId: { in: producerIds },
				id: { not: trackId },
				isPublished: true,
			},
			take: limit,
			select: {
				id: true,
				title: true,
				slug: true,
				producer: { select: { id: true, firstName: true, lastName: true } },
				licenses: { select: { price: true }, orderBy: { price: "asc" }, take: 1 },
			},
		});

		return similarTracks.map((track) => ({
			...track,
			producer: track.producer || { id: "unknown", firstName: "Unknown", lastName: "" },
		}));
	} catch (error) {
		console.error("Failed to fetch similar tracks:", error);
		return [];
	}
}

export async function getBeatDetails(trackId: string): Promise<FullTrackDetails | null> {
	const user = await currentUser();
	const clerkId = user?.id;
	let internalUserId: string | null = null;
	if (clerkId) {
		internalUserId = await getInternalUserId(clerkId).catch(() => null);
	}

	if (!trackId) notFound();

	const track = await prisma.track.findUnique({
		where: { id: trackId, isPublished: true },
		include: {
			producer: { select: { id: true, username: true, firstName: true, lastName: true, sellerProfile: { select: { id: true } } } },
			licenses: { orderBy: { price: "asc" } },
			trackFiles: true,
			tags: true,
			genres: true,
			moods: true,
			_count: { select: { likes: true, comments: true } },
		},
	});

	if (!track || !track.producer) return null;

	const coverFile = track.trackFiles?.find((f) => ["IMAGE_PNG", "IMAGE_JPEG", "IMAGE_WEBP"].includes(f.fileType));
	const previewAudioFile = track.trackFiles?.find((f) => f.fileType === "PREVIEW_MP3");

	let currentUserHasLiked = false;
	if (internalUserId) {
		const like = await prisma.like.findUnique({
			where: { userId_trackId: { userId: internalUserId, trackId: track.id } },
			select: { id: true },
		});
		currentUserHasLiked = !!like;
	}

	return {
		...track,
		licenses: track.licenses.map((l) => ({ ...l, price: Number(l.price) })),
		coverImageUrl: coverFile?.storagePath ? getPublicUrl(coverFile.storagePath) : null,
		previewAudioUrl: previewAudioFile?.storagePath ? getPublicUrl(previewAudioFile.storagePath) : null,
		currentUserHasLiked,
	};
}

export async function getTrackForEdit(trackId: string): Promise<TrackForEdit | null> {
	const { userId: clerkUserId } = currentUser();
	if (!clerkUserId) throw new Error("Authentication required.");

	const internalUserId = await getInternalUserId(clerkUserId);
	if (!internalUserId) throw new Error("Could not find user profile.");

	const track = await prisma.track.findUnique({
		where: { id: trackId },
		include: {
			licenses: { orderBy: { price: "asc" } },
			tags: { select: { name: true } },
			genres: { select: { name: true } },
			moods: { select: { name: true } },
			trackFiles: { select: { id: true, fileType: true, storagePath: true, fileSize: true, createdAt: true, trackId: true } },
		},
	});

	if (!track) notFound();
	if (track.producerId !== internalUserId) throw new Error("Permission denied.");

	const filesWithUrls = await Promise.all(
		track.trackFiles.map(async (file) => {
			if (!file.storagePath) return { ...file, url: null, signedUploadUrl: null };
			const { data, error } = await createSignedUrl(file.storagePath, "read");
			if (error) {
				console.error(`Failed to create signed URL for ${file.storagePath}:`, error);
				return { ...file, url: null, signedUploadUrl: null };
			}
			return { ...file, url: data.signedUrl, signedUploadUrl: null };
		})
	);

	return {
		...track,
		licenses: track.licenses.map((l) => ({ ...l, price: Number(l.price) })),
		tags: track.tags.map((t) => t.name),
		genres: track.genres.map((g) => g.name),
		moods: track.moods.map((m) => m.name),
		trackFiles: filesWithUrls.map(f => ({...f, url: f.url || ''}))
	};
}

export async function getFeaturedTracks(limit: number = 6): Promise<TrackSearchResult[]> {
	try {
		const tracksData = await prisma.track.findMany({
			where: { isPublished: true },
			orderBy: { createdAt: "desc" },
			take: limit,
			include: {
				producer: { select: { id: true, firstName: true, lastName: true, username: true, sellerProfile: { select: { id: true } } } },
				licenses: { select: { id: true, type: true, price: true, name: true, filesIncluded: true, description: true }, orderBy: { price: "asc" } },
				trackFiles: { select: { storagePath: true, fileType: true } },
			},
		});

		const resultsWithUrls: TrackSearchResult[] = tracksData.map((track) => {
			const previewAudioPath = track.trackFiles?.find((f) => f.fileType === "PREVIEW_MP3")?.storagePath;
			const fallbackAudioPath = !previewAudioPath ? track.trackFiles?.find((f) => f.fileType === "MAIN_MP3")?.storagePath : null;
			const coverPath = track.trackFiles?.find((f) => ["IMAGE_PNG", "IMAGE_JPEG", "IMAGE_WEBP"].includes(f.fileType))?.storagePath;

			return {
				...track,
				producer: track.producer,
				licenses: track.licenses.map((l) => ({ ...l, price: Number(l.price) })),
				previewAudioUrl: previewAudioPath ? getPublicUrl(previewAudioPath) : (fallbackAudioPath ? getPublicUrl(fallbackAudioPath) : null),
				coverImageUrl: coverPath ? getPublicUrl(coverPath) : null,
			};
		});

		return resultsWithUrls;
	} catch (error) {
		console.error("[getFeaturedTracks] Error fetching featured tracks:", error);
		return [];
	}
} 