"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db/prisma";
import { getInternalUserId } from "@/lib/userUtils";
import { ensureUserRecord } from "@/server-actions/users/userMutations";
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
import { revalidatePath } from "next/cache";
import type { TrackForEdit } from "@/types";
import slugify from "slugify";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ContentTypeEnum = "BEATS" | "LOOPS" | "SOUNDKITS" | "PRESETS";

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