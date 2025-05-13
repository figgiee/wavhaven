"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { getInternalUserId } from "@/lib/userUtils";
import { ensureUserRecord } from "@/server-actions/userActions";
import {
	uploadFile,
	getPublicUrl,
	deleteFile,
	createSignedUrl,
} from "@/lib/storage";
import {
	UserRole,
	TrackFileType,
	Track,
	License,
	LicenseType,
	Prisma,
	User,
	ContentType,
	TrackFile,
} from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import * as z from "zod";
import { posthogServerClient } from "@/lib/posthog-server";
import { revalidatePath } from "next/cache";
import type { TrackListItem, TrackForEdit } from "@/types";
import { notFound } from "next/navigation";
import slugify from "slugify";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabase } from "@/lib/supabase/client"; // Ensure this path is correct

const PREVIEW_FILE_FIELD = "previewFile";
const MAIN_FILE_FIELD = "mainFile";
const STEMS_FILE_FIELD = "stemsFile";

type ContentTypeEnum = "BEATS" | "LOOPS" | "SOUNDKITS" | "PRESETS";

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
	}[];
};

export type TrackDetails = Track & {
	producer: Pick<User, "id" | "firstName" | "lastName" | "username"> & {
		sellerProfile: {
			id: string;
		} | null;
	};
	licenses: (Omit<License, "price"> & { price: number })[];
	coverImageUrl?: string | null; // Added cover image URL
	previewAudioUrl?: string | null; // Added preview audio URL
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

const getTrackByIdSchema = z.object({
	trackId: z.string().min(1, { message: "Track ID cannot be empty" }),
});

const licenseInputSchema = z.object({
	name: z
		.string()
		.min(1, "License name is required")
		.max(100, "License name too long"),
	price: z.coerce.number().min(0, "Price must be non-negative"),
	filesIncluded: z.array(z.nativeEnum(TrackFileType)).optional().default([]),
	streamLimit: z.coerce.number().int().nonnegative().nullable().optional(),
	distributionLimit: z.coerce
		.number()
		.int()
		.nonnegative()
		.nullable()
		.optional(),
});

const trackUploadSchema = z.object({
	title: z
		.string()
		.min(3, "Title must be at least 3 characters")
		.max(100, "Title is too long"),
	description: z.string().max(1000, "Description is too long").optional(),
	genre: z.string().optional(),
	bpm: z.string().regex(/^[1-9][0-9]*$/, "BPM must be a positive number"),
	key: z.string().optional(),
	tags: z.string().optional(),
	contentType: z.enum(
		[
			"beat",
			"beats",
			"loop",
			"loops",
			"soundkit",
			"soundkits",
			"preset",
			"presets",
		],
		{ required_error: "Content type is required" },
	),
	licenses: z
		.array(licenseInputSchema)
		.min(1, "At least one license type is required"),
});

export async function generateUniqueSlug(title: string): Promise<string> {
	const baseSlug = slugify(title, { lower: true, strict: true });
	let uniqueSlug = baseSlug;
	let counter = 0;

	while (true) {
		const existingTrack = await prisma.track.findUnique({
			where: { slug: uniqueSlug },
			select: { id: true },
		});

		if (!existingTrack) {
			return uniqueSlug;
		}

		counter++;
		uniqueSlug = `${baseSlug}-${counter}`;
	}
}

interface UploadResult {
	success: boolean;
	error?: string;
	trackId?: string;
}

export async function uploadTrack(formData: FormData): Promise<UploadResult> {
	let uploadedCoverPath: string | null = null;
	let uploadedMainTrackPath: string | null = null;
	let tempMainTrackPath: string | null = null;
	let tempWatermarkedPath: string | null = null;
	let uploadedPreviewPath: string | null = null;

	const ffmpegInstaller = await import("@ffmpeg-installer/ffmpeg");
	const ffmpeg = (await import("fluent-ffmpeg")).default;

	ffmpeg.setFfmpegPath(ffmpegInstaller.path);
	const WATERMARK_FILE_PATH = path.join(
		process.cwd(),
		"assets",
		"watermark.mp3",
	);

	try {
		const user = await currentUser();
		if (!user || !user.id) {
			return { success: false, error: "Not authenticated" };
		}
		const clerkUserId = user.id;

		let internalUserId: string | null = null;
		try {
			internalUserId = await ensureUserRecord({
				clerkId: user.id,
				email:
					user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
						?.emailAddress ?? null,
				firstName: user.firstName,
				lastName: user.lastName,
				username: user.username,
			});
			if (!internalUserId) {
				throw new Error("ensureUserRecord returned null.");
			}
		} catch (syncError: unknown) {
			console.error(
				`Error ensuring user record during upload for Clerk ID ${clerkUserId}:`,
				syncError,
			);
			const errorMessage =
				syncError instanceof Error ? syncError.message : "Unknown sync error";
			return {
				success: false,
				error: `Failed to synchronize account data: ${errorMessage}`,
			};
		}

		const dbUserWithProfile = await prisma.user.findUnique({
			where: { id: internalUserId },
			select: {
				id: true,
				sellerProfile: { select: { id: true } },
			},
		});

		if (!dbUserWithProfile) {
			console.error(
				`Internal user record not found (ID: ${internalUserId}) even after ensureUserRecord.`,
			);
			return {
				success: false,
				error: "Critical error: User record vanished after sync.",
			};
		}

		let sellerProfileId: string;
		if (dbUserWithProfile.sellerProfile) {
			sellerProfileId = dbUserWithProfile.sellerProfile.id;
		} else {
			try {
				const [, newSellerProfile] = await prisma.$transaction([
					prisma.user.update({
						where: { id: internalUserId },
						data: { role: UserRole.PRODUCER },
					}),
					prisma.sellerProfile.create({
						data: { userId: internalUserId },
						select: { id: true },
					}),
				]);
				sellerProfileId = newSellerProfile.id;
				console.log(
					`Created new SellerProfile (ID: ${sellerProfileId}) for User (ID: ${internalUserId})`,
				);
				console.log(`Updated User (ID: ${internalUserId}) role to PRODUCER`);
			} catch (creationError) {
				console.error(
					"Failed to create SellerProfile and update role:",
					creationError,
				);
				return {
					success: false,
					error: "Failed to update role and create profile.",
				};
			}
		}

		const mainTrack = formData.get("mainTrack") as File;
		const coverImage = formData.get("coverImage") as File;

		if (!mainTrack || !coverImage) {
			return {
				success: false,
				error: "Missing required files (main track and cover)",
			};
		}

		const metadata = {
			title: formData.get("title") as string,
			description: formData.get("description") as string | undefined,
			genre: formData.get("genre") as string | undefined,
			bpm: formData.get("bpm") as string,
			key: formData.get("key") as string | undefined,
			tags: formData.get("tags") as string | undefined,
			contentType: formData.get("contentType") as unknown,
			licenses: JSON.parse((formData.get("licensesJson") as string) || "[]"),
		};

		const validationResult = trackUploadSchema.safeParse(metadata);
		if (!validationResult.success) {
			const errors = validationResult.error.flatten();
			const firstError =
				Object.values(errors.fieldErrors).flat()[0] ||
				errors.formErrors[0] ||
				"Invalid data submitted.";
			console.error("Upload Validation Failed:", errors);
			return { success: false, error: firstError };
		}
		const validatedData = validationResult.data;

		const tagsList = validatedData.tags
			? validatedData.tags
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean)
			: [];
		const genreName = validatedData.genre ? validatedData.genre.trim() : null;

		const contentTypeMap: Record<string, ContentTypeEnum> = {
			beat: "BEATS",
			beats: "BEATS",
			loop: "LOOPS",
			loops: "LOOPS",
			soundkit: "SOUNDKITS",
			soundkits: "SOUNDKITS",
			preset: "PRESETS",
			presets: "PRESETS",
		};
		const dbContentType = contentTypeMap[validatedData.contentType];
		if (!dbContentType) {
			throw new Error(
				`Invalid content type provided: ${validatedData.contentType}`,
			);
		}

		const uniqueSlug = await generateUniqueSlug(validatedData.title);

		const timestamp = Date.now();
		const filePrefix = `users/${internalUserId}/${dbContentType}/${timestamp}`;

		const sanitizeFilename = (filename: string): string => {
			const noSpaces = filename.replace(/\s+/g, "_");
			const normalized = noSpaces
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "");
			const sanitized = normalized.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
			return sanitized;
		};

		const sanitizedMainTrackName = sanitizeFilename(mainTrack.name);
		const sanitizedCoverImageName = sanitizeFilename(coverImage.name);

		const mainTrackPath = `${filePrefix}_main_${sanitizedMainTrackName}`;
		const coverImagePath = `${filePrefix}_cover_${sanitizedCoverImageName}`;
		const previewTrackPath = `${filePrefix}_preview.mp3`;
		let coverImageUrl: string | null = null;
		let previewAudioUrl: string | null = null;
		let mainFileUrl: string | null = null;

		try {
			uploadedCoverPath = await uploadFile(coverImage, coverImagePath);
			coverImageUrl = getPublicUrl(uploadedCoverPath);
		} catch (uploadError: unknown) {
			console.error("Cover image upload failed:", uploadError);
			const errorMessage =
				uploadError instanceof Error
					? uploadError.message
					: "Unknown upload error";
			throw new Error(`Failed to upload cover image: ${errorMessage}`);
		}

		try {
			uploadedMainTrackPath = await uploadFile(mainTrack, mainTrackPath);
			mainFileUrl = getPublicUrl(uploadedMainTrackPath);
		} catch (uploadError: unknown) {
			console.error("Main track upload failed:", uploadError);
			if (uploadedCoverPath) {
				console.log(`Cleaning up cover image: ${uploadedCoverPath}`);
				await deleteFile(uploadedCoverPath).catch((cleanupError) => {
					console.error(
						`Failed to cleanup cover image ${uploadedCoverPath}:`,
						cleanupError,
					);
				});
			}
			const errorMessage =
				uploadError instanceof Error
					? uploadError.message
					: "Unknown upload error";
			throw new Error(`Failed to upload main track: ${errorMessage}`);
		}

		try {
			console.log("Starting watermarking process...");
			const tempDir = await fs.mkdtemp(
				path.join(os.tmpdir(), "wavhaven-upload-"),
			);
			tempMainTrackPath = path.join(
				tempDir,
				`original_${sanitizedMainTrackName}`,
			);
			tempWatermarkedPath = path.join(tempDir, `watermarked_preview.mp3`);
			console.log(
				`Temp paths: Main=${tempMainTrackPath}, Watermarked=${tempWatermarkedPath}`,
			);

			const mainTrackBuffer = Buffer.from(await mainTrack.arrayBuffer());
			await fs.writeFile(tempMainTrackPath, mainTrackBuffer);
			console.log("Original track saved temporarily.");

			try {
				await fs.access(WATERMARK_FILE_PATH);
				console.log("Watermark file found.");
			} catch (watermarkError) {
				console.error(
					`Watermark file not found at ${WATERMARK_FILE_PATH}. Skipping watermarking.`,
				);
				console.log(
					`Uploading original main track as preview to ${previewTrackPath}`,
				);
				uploadedPreviewPath = await uploadFile(mainTrack, previewTrackPath);
				previewAudioUrl = getPublicUrl(uploadedPreviewPath);
				console.log(`Original track used as preview. URL: ${previewAudioUrl}`);
			}

			if (!tempMainTrackPath || !tempWatermarkedPath) {
				console.error("Temporary paths are null, cannot run ffmpeg.");
				throw new Error("Failed to prepare temporary files for watermarking.");
			}

			if (previewAudioUrl === null) {
				await new Promise<void>((resolve, reject) => {
					console.log("Running ffmpeg command...");
					ffmpeg()
						.input(tempMainTrackPath as string)
						.input(WATERMARK_FILE_PATH)
						.complexFilter([
							"[0:a]volume=1[a0]; [1:a]volume=0.17[a1]; [a0][a1]amix=inputs=2:duration=longest[aout]",
						])
						.map("[aout]")
						.audioCodec("libmp3lame")
						.audioBitrate("128k")
						.outputOptions("-preset fast")
						.on("start", (commandLine) =>
							console.log("Spawned Ffmpeg with command: " + commandLine),
						)
						.on("error", (err, stdout, stderr) => {
							console.error("ffmpeg Error:", err.message);
							console.error("ffmpeg stdout:", stdout);
							console.error("ffmpeg stderr:", stderr);
							reject(new Error(`ffmpeg processing failed: ${err.message}`));
						})
						.on("end", () => {
							console.log("ffmpeg processing finished successfully.");
							resolve();
						})
						.save(tempWatermarkedPath as string);
				});

				console.log(`Uploading watermarked preview to ${previewTrackPath}`);
				const watermarkedBuffer = await fs.readFile(
					tempWatermarkedPath as string,
				);
				const watermarkedFile = new File(
					[watermarkedBuffer],
					path.basename(previewTrackPath),
					{ type: "audio/mpeg" },
				);

				uploadedPreviewPath = await uploadFile(
					watermarkedFile,
					previewTrackPath,
				);
				previewAudioUrl = getPublicUrl(uploadedPreviewPath);
				console.log(`Watermarked preview uploaded. URL: ${previewAudioUrl}`);
			}
		} catch (watermarkError: unknown) {
			console.error("Watermarking or preview upload failed:", watermarkError);
			if (uploadedMainTrackPath) {
				await deleteFile(uploadedMainTrackPath).catch(console.error);
			}
			if (uploadedCoverPath) {
				await deleteFile(uploadedCoverPath).catch(console.error);
			}
			const errorMessage =
				watermarkError instanceof Error
					? watermarkError.message
					: "Unknown watermarking error";
			throw new Error(`Failed to create preview audio: ${errorMessage}`);
		} finally {
			if (tempMainTrackPath) {
				await fs.unlink(tempMainTrackPath).catch(console.error);
			}
			if (tempWatermarkedPath) {
				await fs.unlink(tempWatermarkedPath).catch(console.error);
			}
			if (tempMainTrackPath?.startsWith(os.tmpdir())) {
				await fs.rmdir(path.dirname(tempMainTrackPath)).catch(console.error);
			}
		}

		let mainFileType: TrackFileType;
		if (mainTrack.type === "audio/wav") {
			mainFileType = TrackFileType.MAIN_WAV;
		} else if (mainTrack.type === "audio/mpeg") {
			mainFileType = TrackFileType.MAIN_MP3;
		} else {
			console.warn(
				`Unsupported main track file type: ${mainTrack.type}. Defaulting to MAIN_MP3.`,
			);
			mainFileType = TrackFileType.MAIN_MP3;
		}

		let coverFileType: TrackFileType;
		if (coverImage.type === "image/png") {
			coverFileType = TrackFileType.IMAGE_PNG;
		} else if (coverImage.type === "image/jpeg") {
			coverFileType = TrackFileType.IMAGE_JPEG;
		} else if (coverImage.type === "image/webp") {
			coverFileType = TrackFileType.IMAGE_WEBP;
		} else {
			console.warn(
				`Unsupported cover image file type: ${coverImage.type}. Defaulting to IMAGE_PNG.`,
			);
			coverFileType = TrackFileType.IMAGE_PNG;
		}

		const track = await prisma.track.create({
			data: {
				title: validatedData.title,
				description: validatedData.description,
				bpm: parseInt(validatedData.bpm),
				key: validatedData.key,
				slug: uniqueSlug,
				producerId: internalUserId,
				isPublished: false,
				tags: {
					connectOrCreate: tagsList.map((tagName) => ({
						where: { name: tagName },
						create: { name: tagName },
					})),
				},
				...(genreName && {
					genres: {
						connectOrCreate: {
							where: { name: genreName },
							create: { name: genreName },
						},
					},
				}),
				trackFiles: {
					create: [
						...(uploadedPreviewPath
							? [
									{
										fileType: TrackFileType.PREVIEW_MP3,
										storagePath: uploadedPreviewPath,
									},
								]
							: []),
						{
							fileType: mainFileType,
							storagePath: uploadedMainTrackPath,
						},
						{
							fileType: coverFileType,
							storagePath: uploadedCoverPath,
						},
					].filter(Boolean),
				},
			},
		});

		const licenseCreationPromises = validatedData.licenses.map((licenseData) =>
			prisma.license.create({
				data: {
					trackId: track.id,
					name: licenseData.name,
					price: licenseData.price,
					type: licenseData.name.toLowerCase().includes("exclusive")
						? LicenseType.EXCLUSIVE
						: LicenseType.BASIC,
					filesIncluded: licenseData.filesIncluded,
					streamLimit: licenseData.streamLimit,
					distributionLimit: licenseData.distributionLimit,
				},
			}),
		);

		await Promise.all(licenseCreationPromises);
		console.log(
			`Created ${validatedData.licenses.length} licenses for track ${track.id}`,
		);

		revalidatePath("/browse");
		revalidatePath("/producer/dashboard");

		return { success: true, trackId: track.id };
	} catch (error) {
		console.error("Upload error:", error);
		try {
			if (uploadedPreviewPath) {
				await deleteFile(uploadedPreviewPath).catch(console.error);
			}
			if (uploadedMainTrackPath) {
				await deleteFile(uploadedMainTrackPath).catch(console.error);
			}
			if (uploadedCoverPath) {
				await deleteFile(uploadedCoverPath).catch(console.error);
			}
		} catch (cleanupError: unknown) {
			console.error("Error during cleanup after upload failure:", cleanupError);
		}
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to upload track",
		};
	}
}

interface SearchResult {
	tracks: TrackSearchResult[];
	totalCount: number;
}

export async function searchTracks(input: SearchInput): Promise<SearchResult> {
	console.log("Search tracks called with input:", input);

	const validationResult = searchTracksSchema.safeParse(input);
	if (!validationResult.success) {
		console.error(
			"Search input validation failed:",
			validationResult.error.errors,
		);
		return { tracks: [], totalCount: 0 };
	}
	const validatedInput = validationResult.data;

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
		page = 1,
		limit = 12,
	} = validatedInput;

	// Define an intermediate type for the mapped track before URL generation
	type MappedTrackForUrlGen = {
		id: string;
		title: string;
		slug: string;
		createdAt: Date;
		bpm: number | null;
		key: string | null;
		producer: {
			id: string;
			firstName: string | null;
			lastName: string | null;
			username: string | null;
			sellerProfile: { id: string } | null;
		} | null;
		licenses: {
			id: string;
			type: LicenseType;
			name: string;
			description: string | null;
			filesIncluded: TrackFileType[];
			price: number;
		}[];
		previewAudioPath: string | undefined;
		coverPath: string | undefined;
	};

	console.log("Validated Search Input:", validatedInput);

	const where: Prisma.TrackWhereInput = {
		isPublished: true,
	};

	if (query) {
		where.OR = [
			{ title: { contains: query, mode: 'insensitive' } },
			{ description: { contains: query, mode: 'insensitive' } },
			{ tags: { some: { name: { contains: query, mode: 'insensitive' } } } },
		];
	}

	if (type) {
		let targetFileTypes: TrackFileType[] = [];
		const normalizedType = type.toUpperCase().replace(/S$/, '');
		if (normalizedType === 'BEAT') targetFileTypes = [TrackFileType.MAIN_MP3, TrackFileType.MAIN_WAV];

		if (targetFileTypes.length > 0) {
			where.trackFiles = { some: { fileType: { in: targetFileTypes } } };
		} else {
			console.warn(`No matching TrackFileType found for input type: ${type}`);
		}
	}

	if (genre) {
		where.genres = { some: { name: { equals: genre, mode: "insensitive" } } };
		console.log("Added genre condition:", where.genres);
	}

	if (mood) {
		where.moods = { some: { name: { equals: mood, mode: "insensitive" } } };
		console.log("Added mood condition:", where.moods);
	}

	if (minBpm !== undefined || maxBpm !== undefined) {
		where.bpm = {};
		if (minBpm !== undefined) where.bpm.gte = minBpm;
		if (maxBpm !== undefined) where.bpm.lte = maxBpm;
		console.log("Added BPM condition:", where.bpm);
	}

	if (key) {
		where.key = { equals: key, mode: "insensitive" };
		console.log("Added key condition:", where.key);
	}

	if (tags) {
		const tagList = tags
			.split(",")
			.map((t) => t.trim())
			.filter((t) => t);
		if (tagList.length > 0) {
			where.tags = { some: { name: { in: tagList, mode: "insensitive" } } };
			console.log("Added tags condition:", where.tags);
		}
	}

	if (minPrice !== undefined || maxPrice !== undefined) {
		where.licenses = where.licenses || {};
		where.licenses.some = where.licenses.some || {};
		where.licenses.some.price = {};

		if (minPrice !== undefined) {
			where.licenses.some.price.gte = minPrice;
		}
		if (maxPrice !== undefined) {
			where.licenses.some.price.lte = maxPrice;
		}
		console.log(
			"Added price condition:",
			JSON.stringify(where.licenses?.some?.price),
		);
	}

	let orderBy:
		| Prisma.TrackOrderByWithRelationInput
		| Prisma.TrackOrderByWithRelationInput[] = {};

	switch (sortBy) {
		case "newest":
			orderBy = { createdAt: "desc" };
			break;
		case "price_asc":
			console.warn(
				"Sorting by price_asc is not fully implemented in DB query, defaulting to newest.",
			);
			orderBy = { createdAt: "desc" };
			break;
		case "price_desc":
			console.warn(
				"Sorting by price_desc is not fully implemented in DB query, defaulting to newest.",
			);
			orderBy = { createdAt: "desc" };
			break;
		default:
			if (query) {
				console.warn(
					"Sorting by relevance requires fullTextSearch setup, defaulting to newest.",
				);
				orderBy = { createdAt: "desc" };
			} else {
				orderBy = { createdAt: "desc" };
			}
			break;
	}
	console.log("Using calculated orderBy clause:", JSON.stringify(orderBy));

	const skip = (page - 1) * limit;

	try {
		console.log(
			"Executing Prisma query with where clause:",
			JSON.stringify(where, null, 2),
		);
		console.log(`Pagination: Page ${page}, Limit ${limit}, Skip ${skip}`);

		const totalCount = await prisma.track.count({ where });
		console.log(`Prisma count query returned: ${totalCount}`);

		const dbOrderBy:
			| Prisma.TrackOrderByWithRelationInput
			| Prisma.TrackOrderByWithRelationInput[] =
			sortBy === "price_asc" || sortBy === "price_desc"
				? { createdAt: Prisma.SortOrder.desc }
				: orderBy;
		console.log("Executing DB query with orderBy:", JSON.stringify(dbOrderBy));

		const querySelect = {
			id: true,
			title: true,
			slug: true,
			createdAt: true,
			bpm: true,
			key: true,
			producer: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					username: true,
					sellerProfile: { select: { id: true } },
				},
			},
			licenses: {
				select: {
					id: true,
					type: true,
					price: true,
					name: true,
					filesIncluded: true,
					description: true,
				},
				orderBy: { price: Prisma.SortOrder.asc },
			},
			trackFiles: {
				select: {
					storagePath: true,
					fileType: true,
				},
			},
		};

		const tracks = await prisma.track.findMany({
			where,
			skip,
			take: limit,
			orderBy: dbOrderBy,
			select: querySelect,
		});
		console.log(`Prisma findMany query returned ${tracks.length} tracks.`);

		type FetchedTrack = Prisma.TrackGetPayload<{ select: typeof querySelect }>;

		if (posthogServerClient) {
			const authData = await auth();
			let distinctId = authData.userId || uuidv4();
			if (authData.userId) {
				try {
					const internalId = await getInternalUserId(authData.userId);
					if (internalId) distinctId = internalId;
				} catch (err) {
					console.warn(
						"Could not get internal user ID for PostHog tracking, using Clerk ID.",
					);
				}
			}
			posthogServerClient.capture({
				distinctId: distinctId,
				event: "track_searched",
				properties: {
					searchTerm: query || null,
					contentType: type || null,
					genreFilter: genre || null,
					moodFilter: mood || null,
					minBpmFilter: minBpm || null,
					maxBpmFilter: maxBpm || null,
					keyFilter: key || null,
					tagsFilter: tags || null,
					minPriceFilter: minPrice,
					maxPriceFilter: maxPrice,
					sortBy: sortBy,
					page: page,
					limit: limit,
					resultCount: tracks.length,
					totalResultCount: totalCount,
				},
			});
		} else {
			console.warn(
				"[searchTracks] PostHog server client not initialized. Skipping event tracking.",
			);
		}

		// Prepare results with signed URLs
		const tracksWithUrls = await Promise.all(
			tracks.map(async (track: FetchedTrack) => {
				// --- Find Image Path ---
				const coverFile = track.trackFiles?.find(
					(f) =>
						f.fileType === TrackFileType.IMAGE_PNG ||
						f.fileType === TrackFileType.IMAGE_JPEG ||
						f.fileType === TrackFileType.IMAGE_WEBP,
				);
				const coverPath = coverFile?.storagePath; 
				console.log(`[searchTracks] Track ID: ${track.id} - Original DB coverPath: "${coverPath}"`); // Log original DB path

				// --- Find Audio Path (Fallback Logic) ---
				const previewFile = track.trackFiles?.find(
					(f) => f.fileType === TrackFileType.PREVIEW_MP3,
				);
				const mainMp3File = track.trackFiles?.find(
					(f) => f.fileType === TrackFileType.MAIN_MP3,
				);
				const mainWavFile = track.trackFiles?.find(
					(f) => f.fileType === TrackFileType.MAIN_WAV,
				);

				const audioPathToUse = previewFile?.storagePath ?? 
										 mainMp3File?.storagePath ?? 
										 mainWavFile?.storagePath; 
				console.log(`[searchTracks] Track ID: ${track.id} - Original DB audioPathToUse: "${audioPathToUse}"`); // Log original DB path

				let coverImageUrl: string | undefined | null = undefined;
				let previewAudioUrl: string | undefined | null = undefined;

				const BUCKET_NAME = "wavhaven-tracks"; 

				if (coverPath) {
					try {
						const pathForSupabase = coverPath.startsWith(`${BUCKET_NAME}/`) 
							? coverPath.substring(BUCKET_NAME.length + 1) 
							: coverPath;
						console.log(`[searchTracks] Track ID: ${track.id} - Calculated image pathForSupabase: "${pathForSupabase}"`); // Log calculated path
						coverImageUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(pathForSupabase).data.publicUrl;
						console.log(`[searchTracks] Track ID: ${track.id} - Generated coverImageUrl: "${coverImageUrl}"`);
					} catch (e) {
						console.error(
							`Exception generating public URL for image ${coverPath}:`,
							e,
						);
						coverImageUrl = null;
					}
				} else {
					console.log(`[searchTracks] No coverPath found for track ${track.id}`);
				}

				if (audioPathToUse) {
					try {
						const pathForSupabase = audioPathToUse.startsWith(`${BUCKET_NAME}/`)
							? audioPathToUse.substring(BUCKET_NAME.length + 1)
							: audioPathToUse;
						console.log(`[searchTracks] Track ID: ${track.id} - Calculated audio pathForSupabase: "${pathForSupabase}"`); // Log calculated path
						previewAudioUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(pathForSupabase).data.publicUrl;
						console.log(`[searchTracks] Track ID: ${track.id} - Generated previewAudioUrl: "${previewAudioUrl}"`);
					} catch (e) {
						console.error(
							`Exception generating public URL for audio ${audioPathToUse}:`,
							e,
						);
						previewAudioUrl = null;
					}
				} else {
					console.log(`[searchTracks] No audioPathToUse found for track ${track.id}`);
				}

				const mappedLicenses = track.licenses.map((lic) => ({
					...lic,
					price: lic.price.toNumber(), // Convert Decimal to number
				}));

				return {
					id: track.id,
					title: track.title,
					slug: track.slug,
					createdAt: track.createdAt,
					bpm: track.bpm,
					key: track.key,
					producer: track.producer,
					licenses: mappedLicenses,
					// Use field names consistent with TrackSearchResult type
					coverImageUrl: coverImageUrl,
					previewAudioUrl: previewAudioUrl, 
				};
			}),
		);
		console.log(`Search results with URLs prepared: ${tracksWithUrls.length}`); // Log count after URL generation

		// Sort results if needed (e.g., if sorting wasn't done in DB or needs adjustment)
		// Example: tracksWithUrls.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		console.log(`Search results prepared and sorted: ${tracksWithUrls.length}`); // Log final count

		return { tracks: tracksWithUrls, totalCount };
	} catch (error) {
		console.error("Error searching tracks:", error);
		return { tracks: [], totalCount: 0 };
	}
}

const trackDetailIncludeArgs = {
	producer: {
		select: {
			id: true,
			firstName: true,
			lastName: true,
			username: true,
			sellerProfile: {
				select: {
					id: true,
				},
			},
		},
	},
	licenses: {
		orderBy: { price: "asc" },
	},
	trackFiles: { select: { id: true, fileType: true, storagePath: true } },
} satisfies Prisma.TrackInclude;

export async function getTrackById(
	trackId: string,
): Promise<TrackDetails | null> {
	const validationResult = getTrackByIdSchema.safeParse({ trackId });
	if (!validationResult.success) {
		console.error("Invalid trackId format:", validationResult.error.flatten());
		return null;
	}

	const validatedTrackId = validationResult.data.trackId;

	try {
		const trackData = await prisma.track.findUnique({
			where: { id: validatedTrackId, isPublished: true },
			include: trackDetailIncludeArgs,
		});

		if (!trackData) {
			return null;
		}

		if (posthogServerClient) {
			const authData = await auth();
			const clerkUserId = authData.userId;
			let distinctId = clerkUserId || `guest_track_${validatedTrackId}`;

			if (clerkUserId) {
				const internalId = await getInternalUserId(clerkUserId).catch(
					() => null,
				);
				if (internalId) distinctId = internalId;
			}

			posthogServerClient.capture({
				distinctId: distinctId,
				event: "track_viewed",
				properties: {
					trackId: validatedTrackId,
					trackTitle: trackData.title,
					producerId: trackData.producerId,
					userType: clerkUserId ? "registered" : "guest",
				},
			});
		}

		return shapeTrackDataForDetails(trackData as unknown as TrackWithRelations);
	} catch (error) {
		console.error(`Error fetching track with ID ${validatedTrackId}:`, error);
		if (posthogServerClient) {
			posthogServerClient.capture({
				distinctId: "system_error",
				event: "track_fetch_failed",
				properties: {
					trackId: validatedTrackId,
					error_message:
						error instanceof Error
							? error.message
							: "Unknown track fetch error",
				},
			});
		}
		return null;
	}
}

async function shapeTrackDataForDetails(
	trackData: TrackWithRelations | null,
): Promise<TrackDetails | null> {
	if (!trackData || !trackData.producer) {
		return null;
	}

	const BUCKET_NAME = "wavhaven-tracks"; // Define BUCKET_NAME

	const coverFile = trackData.trackFiles?.find(
		(f) =>
			f.fileType === TrackFileType.IMAGE_PNG ||
			f.fileType === TrackFileType.IMAGE_JPEG ||
			f.fileType === TrackFileType.IMAGE_WEBP,
	);
  const coverStoragePath = coverFile?.storagePath;
  console.log(`[shapeTrackDataForDetails] Original DB coverStoragePath: "${coverStoragePath}" for track ${trackData.id}`);

	const previewAudioFile = trackData.trackFiles?.find(
		(f) => f.fileType === TrackFileType.PREVIEW_MP3,
	);
  const previewAudioStoragePath = previewAudioFile?.storagePath;
  console.log(`[shapeTrackDataForDetails] Original DB previewAudioStoragePath: "${previewAudioStoragePath}" for track ${trackData.id}`);

  let finalCoverImageUrl: string | null = null;
  if (coverStoragePath) {
    try {
      const pathForSupabase = coverStoragePath.startsWith(`${BUCKET_NAME}/`)
        ? coverStoragePath.substring(BUCKET_NAME.length + 1)
        : coverStoragePath;
      console.log(`[shapeTrackDataForDetails] Calculated image pathForSupabase: "${pathForSupabase}" for track ${trackData.id}`);
      finalCoverImageUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(pathForSupabase).data.publicUrl;
      console.log(`[shapeTrackDataForDetails] Generated finalCoverImageUrl: "${finalCoverImageUrl}" for track ${trackData.id}`);
    } catch (e) {
      console.error(`[shapeTrackDataForDetails] Exception generating public URL for image ${coverStoragePath} for track ${trackData.id}:`, e);
    }
  }

  let finalPreviewAudioUrl: string | null = null;
  if (previewAudioStoragePath) {
    try {
      const pathForSupabase = previewAudioStoragePath.startsWith(`${BUCKET_NAME}/`)
        ? previewAudioStoragePath.substring(BUCKET_NAME.length + 1)
        : previewAudioStoragePath;
      console.log(`[shapeTrackDataForDetails] Calculated audio pathForSupabase: "${pathForSupabase}" for track ${trackData.id}`);
      finalPreviewAudioUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(pathForSupabase).data.publicUrl;
      console.log(`[shapeTrackDataForDetails] Generated finalPreviewAudioUrl: "${finalPreviewAudioUrl}" for track ${trackData.id}`);
    } catch (e) {
      console.error(`[shapeTrackDataForDetails] Exception generating public URL for audio ${previewAudioStoragePath} for track ${trackData.id}:`, e);
    }
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
		coverImageUrl: finalCoverImageUrl, // Use the public URL
		previewAudioUrl: finalPreviewAudioUrl, // Use the public URL
	};

	return shapedData;
}

export async function fetchLicensesForTrack(
	trackId: string,
): Promise<License[]> {
	const parseResult = getTrackByIdSchema.safeParse({ trackId });
	if (!parseResult.success) {
		throw new Error(parseResult.error.message);
	}

	const trackWithLicenses = await prisma.track.findUnique({
		where: { id: trackId },
		select: { licenses: true },
	});

	return trackWithLicenses?.licenses || [];
}

type ProducerTrackListItem = Prisma.TrackGetPayload<{
	select: {
		id: true;
		title: true;
		slug: true;
		bpm: true;
		key: true;
		isPublished: true;
		createdAt: true;
		licenses: { select: { price: true } };
		trackFiles: {
			where: { fileType: { in: ["IMAGE_PNG", "IMAGE_JPEG", "IMAGE_WEBP"] } };
			select: { storagePath: true };
			take: 1;
		};
	};
}>;

export async function getProducerTracks(
	clerkUserId: string,
): Promise<TrackListItem[]> {
	if (!clerkUserId) {
		console.error("getProducerTracks called without clerkUserId");
		return [];
	}

	try {
		const internalUserId = await getInternalUserId(clerkUserId);
		if (!internalUserId) {
			console.error(`No internal user ID found for Clerk ID: ${clerkUserId}`);
			return [];
		}

		const tracks = await prisma.track.findMany({
			where: {
				producerId: internalUserId,
			},
			select: {
				id: true,
				title: true,
				slug: true,
				bpm: true,
				key: true,
				isPublished: true,
				createdAt: true,
				licenses: {
					select: {
						price: true,
					},
				},
				trackFiles: {
					where: {
						fileType: {
							in: [
								"IMAGE_PNG",
								"IMAGE_JPEG",
								"IMAGE_WEBP",
							],
						},
					},
					select: { storagePath: true },
					take: 1,
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		const tracksWithUrls = await Promise.all(
			tracks.map(async (track: ProducerTrackListItem) => {
				const coverPath = track.trackFiles[0]?.storagePath;
				const artworkUrl = coverPath
					? await createSignedUrl(coverPath, 60 * 60 * 24)
					: null;

				return {
					id: track.id,
					title: track.title,
					slug: track.slug,
					bpm: track.bpm,
					key: track.key,
					isPublished: track.isPublished,
					createdAt: track.createdAt,
					artworkUrl: artworkUrl,
					licenses: track.licenses.map((license: { price: Prisma.Decimal }) => ({
						...license,
						price: Number(license.price),
					})),
					trackFiles: undefined,
				};
			}),
		);

		return tracksWithUrls as unknown as TrackListItem[];
	} catch (error) {
		console.error(`Error fetching tracks for user ${clerkUserId}:`, error);
		return [];
	}
}

export async function getTrackBySlug(
	slug: string,
): Promise<TrackDetails | null> {
	console.log(`[getTrackBySlug] Received slug: ${slug}`);
	if (typeof slug !== "string" || !slug.trim()) {
		console.error("[getTrackBySlug] Invalid slug provided:", slug);
		return null;
	}

	const trimmedSlug = slug.trim();

	try {
		console.log(`[getTrackBySlug] Querying DB for slug: ${trimmedSlug}`);
		const trackData = await prisma.track.findFirst({
			where: {
				slug: trimmedSlug,
				isPublished: true,
			},
			include: trackDetailIncludeArgs,
		});

		if (!trackData) {
			console.log(
				`[getTrackBySlug] No published track found for slug: ${trimmedSlug}`,
			);
			return null;
		}

		console.log(
			`[getTrackBySlug] Found track: ${trackData.id} - ${trackData.title}`,
		);

		// Make the call async
		const shapedData = await shapeTrackDataForDetails(
			trackData as unknown as TrackWithRelations,
		);
		console.log(
			`[getTrackBySlug] Returning shaped data:`,
			JSON.stringify(shapedData, null, 2),
		);
		return shapedData;
	} catch (error) {
		console.error(
			`[getTrackBySlug] Error fetching track with slug ${trimmedSlug}:`,
			error,
		);
		return null;
	}
}

async function getUserIdsByUsername(usernameQuery: string): Promise<string[]> {
	const users = await prisma.user.findMany({
		where: { username: { contains: usernameQuery, mode: "insensitive" } },
		select: { id: true },
	});
	return users.map((u: { id: string }) => u.id);
}

export type SimilarTrackCardData = {
	id: string;
	title: string;
	producer: Pick<User, 'id' | 'firstName' | 'lastName'>;
	licenses: Pick<License, 'price'>[];
};

interface GetSimilarTracksParams {
	trackId: string;
	producerName: string;
	limit?: number;
}

export async function getSimilarTracks({
	trackId,
	producerName,
	limit = 4,
}: GetSimilarTracksParams): Promise<SimilarTrackCardData[]> {
	console.log(`[Server Action] getSimilarTracks called with: trackId=${trackId}, producerName=${producerName}, limit=${limit}`);

	if (!trackId || !producerName) {
		console.error("[Server Action] getSimilarTracks: Missing trackId or producerName.");
		return [];
	}

	let producerId: string | null = null;
	try {
		const producer = await prisma.user.findUnique({
			where: { username: producerName },
			select: { id: true },
		});
		if (!producer) {
			console.warn(`[getSimilarTracks] Producer not found with username: ${producerName}`);
			return [];
		}
		producerId = producer.id;
	} catch (error) {
		console.error(`[getSimilarTracks] Error fetching producer ID for username ${producerName}:`, error);
		return [];
	}

	try {
		const similarTracks = await prisma.track.findMany({
			where: {
				producerId: producerId, 
				id: { not: trackId },
				isPublished: true,
			},
			take: limit,
			orderBy: {
				createdAt: 'desc',
			},
			select: {
				id: true,
				title: true,
				producer: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
					},
				},
				licenses: {
					select: {
						price: true,
					},
					 orderBy: {
						price: 'asc'
					}
				},
			},
		});
		return similarTracks;
	} catch (error) {
		console.error("[Server Action] getSimilarTracks: Error fetching similar tracks:", error);
		return [];
	}
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

export async function getBeatDetails(
	trackId: string,
): Promise<FullTrackDetails | null> {
	console.log(`[getBeatDetails] Fetching details for trackId: "${trackId}"`);
	const validationResult = getTrackByIdSchema.safeParse({ trackId });
	if (!validationResult.success) {
		console.error(
			`[getBeatDetails] Invalid trackId format: "${trackId}"`,
			validationResult.error.flatten(),
		);
		return null;
	}
	const validatedTrackId = validationResult.data.trackId;

	const BUCKET_NAME = "wavhaven-tracks"; // Define BUCKET_NAME

	try {
		const trackData = await prisma.track.findUnique({
			where: {
				id: validatedTrackId,
			},
			include: {
				producer: {
					select: {
						id: true,
						username: true,
						firstName: true,
						lastName: true,
						sellerProfile: {
							select: { id: true },
						},
					},
				},
				licenses: { orderBy: { price: "asc" } },
				trackFiles: true,
				tags: true,
				genres: true,
				moods: true,
			},
		});

		if (!trackData) {
			return null;
		}
		if (!trackData.producer) {
			console.error(
				`[getBeatDetails] Producer data missing for Track ID: ${trackId}. Inconsistent state.`,
			);
			return null;
		}

		// Find cover image and preview audio paths
		const coverFile = trackData.trackFiles?.find(
			(f) =>
				f.fileType === TrackFileType.IMAGE_PNG ||
				f.fileType === TrackFileType.IMAGE_JPEG ||
				f.fileType === TrackFileType.IMAGE_WEBP,
		);
    const coverStoragePath = coverFile?.storagePath;
    console.log(`[getBeatDetails] Original DB coverStoragePath: "${coverStoragePath}" for track ${trackData.id}`);

		const previewAudioFile = trackData.trackFiles?.find(
			(f) => f.fileType === TrackFileType.PREVIEW_MP3,
		);
    const previewAudioStoragePath = previewAudioFile?.storagePath;
    console.log(`[getBeatDetails] Original DB previewAudioStoragePath: "${previewAudioStoragePath}" for track ${trackData.id}`);

    let finalCoverImageUrl: string | null = null;
    if (coverStoragePath) {
      try {
        const pathForSupabase = coverStoragePath.startsWith(`${BUCKET_NAME}/`)
          ? coverStoragePath.substring(BUCKET_NAME.length + 1)
          : coverStoragePath;
        console.log(`[getBeatDetails] Calculated image pathForSupabase: "${pathForSupabase}" for track ${trackData.id}`);
        finalCoverImageUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(pathForSupabase).data.publicUrl;
        console.log(`[getBeatDetails] Generated finalCoverImageUrl: "${finalCoverImageUrl}" for track ${trackData.id}`);
      } catch (e) {
        console.error(`[getBeatDetails] Exception generating public URL for image ${coverStoragePath} for track ${trackData.id}:`, e);
      }
    }

    let finalPlayableAudioUrl: string | null = null;
    if (previewAudioStoragePath) {
      try {
        const pathForSupabase = previewAudioStoragePath.startsWith(`${BUCKET_NAME}/`)
          ? previewAudioStoragePath.substring(BUCKET_NAME.length + 1)
          : previewAudioStoragePath;
        console.log(`[getBeatDetails] Calculated audio pathForSupabase: "${pathForSupabase}" for track ${trackData.id}`);
        finalPlayableAudioUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(pathForSupabase).data.publicUrl;
        console.log(`[getBeatDetails] Generated finalPlayableAudioUrl: "${finalPlayableAudioUrl}" for track ${trackData.id}`);
      } catch (e) {
        console.error(`[getBeatDetails] Exception generating public URL for audio ${previewAudioStoragePath} for track ${trackData.id}:`, e);
      }
    }

		const fullDetails: FullTrackDetails = {
			...trackData,
			producer: {
				id: trackData.producer.id,
				username: trackData.producer.username,
				firstName: trackData.producer.firstName,
				lastName: trackData.producer.lastName,
				sellerProfile: trackData.producer.sellerProfile
					? {
							id: trackData.producer.sellerProfile.id,
						}
					: null,
			},
			tags: trackData.tags || [],
			genres: trackData.genres || [],
			moods: trackData.moods || [],
			licenses: trackData.licenses.map((lic) => ({
				...lic,
				price: Number(lic.price),
			})),
			previewAudioUrl: finalPlayableAudioUrl, // Use public URL
			coverImageUrl: finalCoverImageUrl,   // Use public URL
			_count: trackData._count ?? { likes: 0, comments: 0 },
		};

		return fullDetails;
	} catch (error) {
		console.error(
			`[getBeatDetails] Error fetching track details for ${trackId}:`,
			error,
		);
		return null;
	} finally {
	}
}

export async function deleteTrack(
	trackId: string,
): Promise<{ success: boolean; error?: string }> {
	const { userId: clerkUserId } = await auth();
	if (!clerkUserId) {
		return { success: false, error: "Authentication required." };
	}

	try {
		const producerId = await getInternalUserId(clerkUserId);
		if (!producerId) {
			throw new Error("Could not find internal user ID.");
		}

		const track = await prisma.track.findUnique({
			where: { id: trackId },
			select: {
				id: true,
				producerId: true,
				trackFiles: {
					select: {
						storagePath: true,
					},
				},
			},
		});

		if (!track) {
			return { success: false, error: "Track not found." };
		}

		if (track.producerId !== producerId) {
			return {
				success: false,
				error: "You do not have permission to delete this track.",
			};
		}

		const storagePathsToDelete: string[] = track.trackFiles
			.map((file: { storagePath: string | null }) => file.storagePath)
			.filter((path: string | null): path is string => !!path);

		if (storagePathsToDelete.length > 0) {
			console.log(
				`Attempting to delete storage files for track ${trackId}:`,
				storagePathsToDelete,
			);
			try {
				const { error: deleteError } = await supabaseAdmin.storage
					.from("wavhaven-tracks")
					.remove(storagePathsToDelete);

				if (deleteError) {
					console.error(
						`Storage delete error for track ${trackId}:`,
						deleteError,
					);
					console.warn(
						`Failed to delete storage files for track ${trackId}, but proceeding with database deletion.`,
					);
				} else {
					console.log(
						`Successfully deleted storage files for track ${trackId}`,
					);
				}
			} catch (storageSetupError) {
				console.error(
					`Error initializing/using storage client for deletion (Track ID ${trackId}):`,
					storageSetupError,
				);
				console.warn(
					`Failed setup/use storage client for track ${trackId} deletion, but proceeding with database deletion.`,
				);
			}
		} else {
			console.log(`No storage files found to delete for track ${trackId}`);
		}

		await prisma.track.delete({
			where: { id: trackId },
		});

		revalidatePath("/dashboard");
		revalidatePath("/explore");
		revalidatePath("/");

		console.log(`Successfully deleted track ${trackId}`);
		return { success: true };
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "An unexpected error occurred.";
		console.error(`Error deleting track ${trackId}:`, error);
		return { success: false, error: message };
	}
}

interface BulkDeleteResult {
	success: boolean;
	deletedCount: number;
	failedCount: number;
	error?: string;
	errors?: { trackId: string; reason: string }[];
}

export async function deleteMultipleTracks(
	trackIds: string[],
): Promise<BulkDeleteResult> {
	const { userId: clerkUserId } = await auth();
	if (!clerkUserId) {
		return {
			success: false,
			deletedCount: 0,
			failedCount: trackIds.length,
			error: "Authentication required.",
		};
	}
	if (!Array.isArray(trackIds) || trackIds.length === 0) {
		return {
			success: false,
			deletedCount: 0,
			failedCount: 0,
			error: "No track IDs provided.",
		};
	}

	let internalUserId: string | null = null;
	try {
		internalUserId = await getInternalUserId(clerkUserId);
		if (!internalUserId) throw new Error("Could not find internal user ID.");
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Failed to get user ID.";
		return {
			success: false,
			deletedCount: 0,
			failedCount: trackIds.length,
			error: message,
		};
	}

	let deletedCount = 0;
	let failedCount = 0;
	const specificErrors: { trackId: string; reason: string }[] = [];
	const pathsToDelete: string[] = [];
	const dbIdsToDelete: string[] = [];

	try {
		const tracksToVerify = await prisma.track.findMany({
			where: {
				id: { in: trackIds },
				producerId: internalUserId,
			},
			select: {
				id: true,
				trackFiles: {
					select: { storagePath: true },
				},
			},
		});

		const ownedTrackIds = new Set(tracksToVerify.map((t: { id: string }) => t.id));
		for (const requestedId of trackIds) {
			if (ownedTrackIds.has(requestedId)) {
				dbIdsToDelete.push(requestedId);
				const trackInfo = tracksToVerify.find((t: { id: string }) => t.id === requestedId);
				trackInfo?.trackFiles?.forEach((file: { storagePath: string | null }) => {
					if (file.storagePath) pathsToDelete.push(file.storagePath);
				});
			} else {
				failedCount++;
				specificErrors.push({
					trackId: requestedId,
					reason: "Not found or permission denied.",
				});
			}
		}

		if (dbIdsToDelete.length === 0) {
			return {
				success: false,
				deletedCount: 0,
				failedCount: failedCount,
				error: "No valid tracks found for deletion.",
				errors: specificErrors,
			};
		}

		if (pathsToDelete.length > 0) {
			try {
				const { error: deleteError } = await supabaseAdmin.storage
					.from("wavhaven-tracks")
					.remove(pathsToDelete);
				if (deleteError) {
					console.error(`Storage bulk delete error:`, deleteError);
					console.warn(
						`Failed to delete some storage files, proceeding with database deletion.`,
					);
				}
			} catch (storageSetupError) {
				console.error(
					`Error initializing storage client for bulk deletion:`,
					storageSetupError,
				);
				console.warn(
					`Failed setup storage client for bulk deletion, proceeding with database deletion.`,
				);
			}
		}

		const deleteResult = await prisma.track.deleteMany({
			where: {
				id: { in: dbIdsToDelete },
				producerId: internalUserId,
			},
		});

		deletedCount = deleteResult.count;

		revalidatePath("/dashboard");
		revalidatePath("/explore");
		revalidatePath("/");

		console.log(`Bulk delete successful: ${deletedCount} tracks deleted.`);
		return {
			success: true,
			deletedCount: deletedCount,
			failedCount: failedCount,
			errors: specificErrors.length > 0 ? specificErrors : undefined,
		};
	} catch (error: unknown) {
		const message =
			error instanceof Error
				? error.message
				: "An unexpected error occurred during bulk delete.";
		console.error("Bulk delete error:", error);
		return {
			success: false,
			deletedCount: deletedCount,
			failedCount: trackIds.length - deletedCount,
			error: message,
			errors: specificErrors.length > 0 ? specificErrors : undefined,
		};
	}
}

interface EditPageParams {
	trackId: string;
}

export async function getTrackForEdit(
	trackId: string,
): Promise<TrackForEdit | null> {
	if (!trackId) {
		console.error(
			"getTrackForEdit called with invalid or missing trackId",
			trackId,
		);
		return null;
	}

	const { userId: clerkUserId } = await auth();
	if (!clerkUserId) {
		console.warn("getTrackForEdit: Authentication required.");
		return null;
	}

	let producerId: string | null = null;
	try {
		producerId = await getInternalUserId(clerkUserId);
		if (!producerId) throw new Error("Internal user ID not found.");
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		console.error("getTrackForEdit: Failed to get internal user ID:", error);
		return null;
	}

	try {
		const trackData = await prisma.track.findUnique({
			where: {
				id: trackId,
				producerId: producerId,
			},
			select: {
				id: true,
				title: true,
				description: true,
				bpm: true,
				key: true,
				isPublished: true,
				tags: true,
				licenses: { orderBy: { price: "asc" } },
				trackFiles: {
					orderBy: { fileType: "asc" },
				},
			},
		});

		if (!trackData) {
			console.warn(
				`getTrackForEdit: Track not found or permission denied for ID ${trackId} and user ${producerId}`,
			);
			return null;
		}

		const formattedTrackData: TrackForEdit = {
			...trackData,
			licenses: trackData.licenses.map((l: License) => ({
				...l,
				price: Number(l.price),
			})),
			trackFiles: trackData.trackFiles,
			tags: trackData.tags || [],
		};
		return formattedTrackData;
	} catch (error) {
		console.error(`Error fetching track for edit (ID: ${trackId}):`, error);
		return null;
	}
}

const updateTrackDetailsSchema = z.object({
	title: z
		.string()
		.min(3, "Title must be at least 3 characters")
		.max(100, "Title too long"),
	description: z
		.string()
		.max(1000, "Description too long")
		.nullable()
		.optional(),
	bpm: z.coerce
		.number()
		.int()
		.positive("BPM must be a positive number")
		.nullable()
		.optional(),
	key: z.string().max(50, "Key too long").nullable().optional(),
	tags: z.string().max(200, "Tags string too long").optional(),
	licenseId: z.string().uuid("Invalid License ID"),
	licenseName: z
		.string()
		.min(1, "License name required")
		.max(100, "License name too long"),
	licensePrice: z.coerce.number().min(0, "Price cannot be negative"),
	licenseDescription: z
		.string()
		.max(500, "License description too long")
		.nullable()
		.optional(),
	licenseFilesIncluded: z.array(z.nativeEnum(TrackFileType)).default([]),
	licenseStreamLimit: z.coerce
		.number()
		.int()
		.nonnegative("Stream limit cannot be negative")
		.nullable()
		.optional(),
	licenseDistributionLimit: z.coerce
		.number()
		.int()
		.nonnegative("Distribution limit cannot be negative")
		.nullable()
		.optional(),
	licenseRadioStations: z.coerce
		.number()
		.int()
		.nonnegative("Radio stations cannot be negative")
		.nullable()
		.optional(),
	licenseMusicVideos: z.coerce
		.number()
		.int()
		.nonnegative("Music videos cannot be negative")
		.nullable()
		.optional(),
	licenseContractText: z.string().nullable().optional(),
	publish: z.boolean().optional(),
});

type UpdateTrackDetailsValues = z.infer<typeof updateTrackDetailsSchema>;

interface UpdateDetailsResult {
	success: boolean;
	error?: string;
	updatedTrack?: TrackForEdit;
}

export async function updateTrackDetails(
	trackId: string,
	values: UpdateTrackDetailsValues,
): Promise<UpdateDetailsResult> {
	const { userId: clerkUserId } = await auth();
	if (!clerkUserId) {
		return { success: false, error: "Authentication required." };
	}

	let producerId: string | null = null;
	try {
		producerId = await getInternalUserId(clerkUserId);
		if (!producerId) throw new Error("Could not find internal user ID.");
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Failed to get user ID.";
		return { success: false, error: message };
	}

	const validationResult = updateTrackDetailsSchema.safeParse(values);
	if (!validationResult.success) {
		console.error(
			"Update Details validation failed:",
			validationResult.error.flatten(),
		);
		const firstError =
			validationResult.error.errors[0]?.message || "Invalid data submitted.";
		return { success: false, error: firstError };
	}
	const validData = validationResult.data;

	try {
		const existingTrack = await prisma.track.findUnique({
			where: { id: trackId, producerId: producerId },
			select: {
				id: true,
				licenses: {
					where: { id: validData.licenseId },
					select: { id: true },
				},
			},
		});

		if (!existingTrack) {
			return { success: false, error: "Track not found or permission denied." };
		}
		if (existingTrack.licenses.length === 0) {
			return {
				success: false,
				error: "License specified does not belong to this track.",
			};
		}

		let updatedTrackSlug: string | null = null;
		await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
			const tagsArray = validData.tags
				? validData.tags
						.split(",")
						.map((t) => t.trim())
						.filter(Boolean)
				: [];
			const trackUpdateData: Prisma.TrackUpdateInput = {
				title: validData.title,
				description: validData.description ?? null,
				bpm: validData.bpm,
				key: validData.key ?? null,
				tags: {
					set: [],
					connectOrCreate: tagsArray.map((tagName) => ({
						where: { name: tagName },
						create: { name: tagName },
					})),
				},
				...(validData.publish === true && { isPublished: true }),
			};

			const updatedTrackResult = await tx.track.update({
				where: { id: trackId },
				data: trackUpdateData,
				select: { slug: true },
			});
			updatedTrackSlug = updatedTrackResult.slug;

			await tx.license.update({
				where: { id: validData.licenseId },
				data: {
					name: validData.licenseName,
					price: validData.licensePrice,
					description: validData.licenseDescription ?? null,
					filesIncluded: validData.licenseFilesIncluded,
					streamLimit: validData.licenseStreamLimit,
					distributionLimit: validData.licenseDistributionLimit,
					radioStations: validData.licenseRadioStations,
					musicVideos: validData.licenseMusicVideos,
					contractText: validData.licenseContractText ?? null,
				},
			});
		});

		revalidatePath("/dashboard");
		revalidatePath(`/dashboard/track/${trackId}/edit`);
		if (updatedTrackSlug) {
			revalidatePath(`/track/${updatedTrackSlug}`);
		}
		if (validData.publish === true) {
			revalidatePath("/explore");
			revalidatePath("/");
		}

		console.log(
			`Successfully updated details for track ${trackId}${validData.publish ? " and published it" : ""}`,
		);
		return { success: true };
	} catch (error: unknown) {
		const message =
			error instanceof Error
				? error.message
				: "An unexpected error occurred during update.";
		console.error(`Error updating track details ${trackId}:`, error);
		return { success: false, error: message };
	}
}

interface ApproveResult {
	success: boolean;
	error?: string;
}

export async function approveTrack(trackId: string): Promise<ApproveResult> {
	try {
		const authData = await auth();
		const clerkUserId = authData?.userId;
		if (!clerkUserId) {
			return { success: false, error: "Authentication required." };
		}

		const internalUser = await prisma.user.findUnique({
			where: { clerkId: clerkUserId },
			select: { role: true },
		});

		if (internalUser?.role !== UserRole.ADMIN) {
			console.warn(
				`Unauthorized attempt to approve track ${trackId} by user ${clerkUserId}`,
			);
			return { success: false, error: "Unauthorized: Admin access required." };
		}

		if (!trackId) {
			return { success: false, error: "Track ID is required." };
		}

		const updatedTrack = await prisma.track.update({
			where: { id: trackId },
			data: { isPublished: true },
		});

		if (!updatedTrack) {
			return { success: false, error: "Track not found." };
		}

		console.log(
			`Track ${trackId} approved and published by admin ${clerkUserId}.`,
		);

		revalidatePath("/explore");
		revalidatePath(`/track/${updatedTrack.slug}`);
		revalidatePath("/admin/moderation");

		return { success: true };
	} catch (error: unknown) {
		console.error("Error approving track:", error);
		const errorMessage =
			error instanceof Error ? error.message : "An unexpected error occurred.";
		return { success: false, error: errorMessage };
	}
}

interface ToggleResult {
	success: boolean;
	newStatus?: boolean;
	error?: string;
}

export async function toggleTrackPublication(
	trackId: string,
): Promise<ToggleResult> {
	try {
		const authData = await auth();
		const clerkUserId = authData?.userId;
		if (!clerkUserId) {
			throw new Error("Authentication required.");
		}

		const internalUserId = await getInternalUserId(clerkUserId);
		if (!internalUserId) {
			throw new Error("User record not found.");
		}

		if (!trackId) {
			return { success: false, error: "Track ID is required." };
		}

		const track = await prisma.track.findUnique({
			where: { id: trackId },
			select: { isPublished: true, producerId: true, slug: true },
		});

		if (!track) {
			return { success: false, error: "Track not found." };
		}

		if (track.producerId !== internalUserId) {
			return {
				success: false,
				error: "Unauthorized: You do not own this track.",
			};
		}

		const newStatus = !track.isPublished;
		await prisma.track.update({
			where: { id: trackId },
			data: { isPublished: newStatus },
		});

		console.log(`Track ${trackId} publication status toggled to: ${newStatus}`);

		revalidatePath("/explore");
		revalidatePath(`/track/${track.slug}`);
		revalidatePath("/producer/dashboard");

		return { success: true, newStatus };
	} catch (error: unknown) {
		console.error("Error toggling track publication:", error);
		const errorMessage =
			error instanceof Error ? error.message : "An unexpected error occurred.";
		return { success: false, error: errorMessage };
	}
}

type PrismaTrackSearchResultItem = Prisma.TrackGetPayload<{
	include: {
		producer: {
			select: {
				id: true;
				firstName: true;
				lastName: true;
				username: true;
				sellerProfile: { select: { id: true } };
			};
		};
		licenses: {
			select: {
				id: true;
				type: true;
				price: true;
				name: true;
				filesIncluded: true;
				description: true;
				streamLimit: true;
				distributionLimit: true;
				radioStations: true;
				musicVideos: true;
				contractText: true;
				createdAt: true;
				updatedAt: true;
				trackId: true;
			};
			orderBy: { price: "asc" };
		};
	};
}>;

export async function incrementPlayCount(
	trackId: string,
): Promise<{ success: boolean; error?: string }> {
	"use server";

	if (!trackId) {
		return { success: false, error: "Track ID is required." };
	}

	try {
		await prisma.track.update({
			where: { id: trackId },
			data: {
				playCount: {
					increment: 1,
				},
			},
			select: { id: true },
		});
		console.log(
			`[incrementPlayCount] Incremented play count for track: ${trackId}`,
		);
		return { success: true };
	} catch (error) {
		console.error(
			`[incrementPlayCount] Error incrementing play count for track ${trackId}:`,
			error,
		);
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2025") {
				return { success: false, error: "Track not found." };
			}
		}
		const message =
			error instanceof Error ? error.message : "An unexpected error occurred.";
		return { success: false, error: message };
	}
}

type FeaturedTrackData = Prisma.TrackGetPayload<{
	select: {
		id: true;
		title: true;
		slug: true;
		createdAt: true;
		bpm: true;
		key: true;
		producer: {
			select: {
				id: true;
				firstName: true;
				lastName: true;
				username: true;
				sellerProfile: { select: { id: true } };
			};
		};
		licenses: {
			select: {
				id: true,
				type: true,
				price: true,
				name: true,
				filesIncluded: true,
				description: true,
			};
			orderBy: { price: "asc" }; // Use string literal for type definition
		};
		trackFiles: {
			select: {
				storagePath: true;
				fileType: true;
			};
		};
	};
}>;

type FeaturedTrackLicense = FeaturedTrackData['licenses'][number];

type MappedFeaturedTrack = {
	id: string;
	title: string;
	slug: string;
	createdAt: Date;
	bpm: number | null;
	key: string | null;
	producer: FeaturedTrackData['producer'];
	licenses: (Omit<FeaturedTrackLicense, 'price'> & { price: number })[];
	mainAudioPath: string | undefined;
	coverPath: string | undefined;
};

export async function getFeaturedTracks(
	limit: number = 6,
): Promise<TrackSearchResult[]> {
	// console.log(`[getFeaturedTracks] Fetching ${limit} featured tracks.`);

	const BUCKET_NAME = "wavhaven-tracks";

	try {
		// Diagnostic: Log all published tracks first -- REMOVE THIS BLOCK
		// const allPublishedTracksForDebug = await prisma.track.findMany({
		// 	where: { isPublished: true },
		// 	select: { id: true, title: true, createdAt: true },
		// 	orderBy: { createdAt: 'desc' }
		// });
		// console.log(`[getFeaturedTracks - DEBUG] Found ${allPublishedTracksForDebug.length} total published tracks. Titles:`, allPublishedTracksForDebug.map(t => t.title).join(', '));

		const tracksData = await prisma.track.findMany({
			where: {
				isPublished: true,
			},
			orderBy: {
					createdAt: "desc",
			},
				take: limit,
			select: {
				id: true,
				title: true,
				slug: true,
				createdAt: true,
				bpm: true,
				key: true,
				producer: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						username: true,
						sellerProfile: { select: { id: true } },
					},
				},
				licenses: {
					select: {
						id: true,
						type: true,
						price: true,
						name: true,
						filesIncluded: true,
						description: true,
					},
					orderBy: { price: Prisma.SortOrder.asc },
				},
				trackFiles: {
					select: {
						storagePath: true,
						fileType: true,
					},
				},
			},
		});

		console.log(`[getFeaturedTracks] Found ${tracksData.length} tracks in DB after prisma.findMany (limit applied: ${limit}).`);

		const mappedTracks = tracksData.map((track: FeaturedTrackData) => {
			const mainAudioPath = track.trackFiles?.find((f: { fileType: TrackFileType }) => 
				f.fileType === TrackFileType.MAIN_MP3 ||
				f.fileType === TrackFileType.MAIN_WAV
			)?.storagePath;
			const coverPath = track.trackFiles?.find((f: { fileType: TrackFileType }) => 
				f.fileType === TrackFileType.IMAGE_PNG || 
				f.fileType === TrackFileType.IMAGE_JPEG || 
				f.fileType === TrackFileType.IMAGE_WEBP
			)?.storagePath;
			
			// console.log(`[getFeaturedTracks] Track ${track.id}: Main Audio Path = ${mainAudioPath}, Cover Path = ${coverPath}`);

			return {
				id: track.id,
				title: track.title,
				slug: track.slug,
				createdAt: track.createdAt,
				bpm: track.bpm, 
				key: track.key, 
				producer: track.producer, 
				licenses: track.licenses.map((license: FeaturedTrackLicense) => ({
					...license,
					price: Number(license.price),
				})),
				mainAudioPath,
				coverPath,
			};
		});

		const resultsWithUrls = await Promise.all(
			mappedTracks.map(async (track: MappedFeaturedTrack) => { 
				// console.log(`[getFeaturedTracks] Generating URLs for track: ${track.id}`);
				let finalCoverImageUrl: string | null = null;
				if (track.coverPath) {
					try {
						const pathForSupabase = track.coverPath.startsWith(`${BUCKET_NAME}/`)
							? track.coverPath.substring(BUCKET_NAME.length + 1)
							: track.coverPath;
						finalCoverImageUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(pathForSupabase).data.publicUrl;
					} catch (e) {
						console.error(`[getFeaturedTracks] Exception generating public URL for image ${track.coverPath} for track ${track.id}:`, e);
					}
				}

				let finalMainAudioUrl: string | null = null;
				if (track.mainAudioPath) {
					try {
						const pathForSupabase = track.mainAudioPath.startsWith(`${BUCKET_NAME}/`)
							? track.mainAudioPath.substring(BUCKET_NAME.length + 1)
							: track.mainAudioPath;
						finalMainAudioUrl = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(pathForSupabase).data.publicUrl;
					} catch (e) {
						console.error(`[getFeaturedTracks] Exception generating public URL for audio ${track.mainAudioPath} for track ${track.id}:`, e);
					}
				}

				// console.log(`[getFeaturedTracks] URLs for ${track.id}: MainAudio=${!!finalMainAudioUrl}, Cover=${!!finalCoverImageUrl}`);

				const resultItem: TrackSearchResult = {
					id: track.id,
					title: track.title,
					slug: track.slug,
					createdAt: track.createdAt,
					bpm: track.bpm, 
					key: track.key, 
					previewAudioUrl: finalMainAudioUrl, // Use public URL
					coverImageUrl: finalCoverImageUrl,    // Use public URL
					producer: track.producer, 
					licenses: track.licenses,
				};
				return resultItem;
			})
		);

		let sortedResults = resultsWithUrls;

		// console.log(
		// 	`[getFeaturedTracks] Returning ${sortedResults.length} tracks with URLs.`,
		// );
		return sortedResults;
	} catch (error) {
		const errorMessage =
			error instanceof Error
				? error.message
				: "Unknown error fetching featured tracks";
		console.error(
			"[getFeaturedTracks] Error fetching featured tracks:",
			errorMessage,
			error,
		);
		return [];
	}
}
