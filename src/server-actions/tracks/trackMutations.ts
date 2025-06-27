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

		const mainTrackFile = formData.get("mainTrack") as File;
		const coverImageFile = formData.get("coverImage") as File;

		if (!mainTrackFile || !coverImageFile) {
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

		const uniqueSlug = await generateUniqueSlug(validatedData.title);

		// 1. Upload Cover Image
		const coverImageBuffer = Buffer.from(await coverImageFile.arrayBuffer());
		const coverImageMimeType = coverImageFile.type;
		const coverFileType =
			coverImageMimeType === "image/png"
				? TrackFileType.IMAGE_PNG
				: coverImageMimeType === "image/jpeg"
				? TrackFileType.IMAGE_JPEG
				: TrackFileType.IMAGE_WEBP;
		const coverFileName = `${uniqueSlug}-cover.${coverImageMimeType.split("/")[1]}`;
		const coverStoragePath = `tracks/${uniqueSlug}/${coverFileName}`;
		await supabaseAdmin.storage
			.from("tracks")
			.upload(coverStoragePath, coverImageBuffer, {
				contentType: coverImageMimeType,
				upsert: true,
			});

		// 2. Upload Main Track File (assuming WAV for now)
		const mainTrackBuffer = Buffer.from(await mainTrackFile.arrayBuffer());
		const mainTrackFileName = `${uniqueSlug}-main.wav`;
		const mainTrackStoragePath = `tracks/${uniqueSlug}/${mainTrackFileName}`;
		await supabaseAdmin.storage
			.from("tracks")
			.upload(mainTrackStoragePath, mainTrackBuffer, {
				contentType: "audio/wav",
				upsert: true,
			});

		// 3. Create Watermarked Preview
		tempMainTrackPath = path.join(
			os.tmpdir(),
			`main_${uuidv4()}.${mainTrackFile.name.split(".").pop()}`,
		);
		await fs.writeFile(tempMainTrackPath, mainTrackBuffer);

		tempWatermarkedPath = path.join(os.tmpdir(), `preview_${uuidv4()}.mp3`);

		await new Promise<void>((resolve, reject) => {
			ffmpeg(tempMainTrackPath)
				.input(WATERMARK_FILE_PATH)
				.complexFilter([
					"[0:a]volume=1[a0]",
					"[1:a]volume=0.1[a1]",
					"[a0][a1]amix=inputs=2:duration=longest[a]",
				])
				.map("[a]")
				.audioCodec("libmp3lame")
				.audioBitrate(128)
				.toFormat("mp3")
				.on("error", (err) => {
					console.error("FFmpeg Error:", err);
					reject(new Error(`Failed to process audio: ${err.message}`));
				})
				.on("end", () => {
					console.log("Watermarked preview created successfully.");
					resolve();
				})
				.save(tempWatermarkedPath);
		});

		const previewBuffer = await fs.readFile(tempWatermarkedPath);
		const previewFileName = `${uniqueSlug}-preview.mp3`;
		const previewStoragePath = `tracks/${uniqueSlug}/${previewFileName}`;
		await supabaseAdmin.storage
			.from("tracks")
			.upload(previewStoragePath, previewBuffer, {
				contentType: "audio/mp3",
				upsert: true,
			});

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
		const contentTypeValue =
			contentTypeMap[validatedData.contentType.toLowerCase()];

		const newTrack = await prisma.track.create({
			data: {
				title: validatedData.title,
				slug: uniqueSlug,
				description: validatedData.description,
				bpm: parseInt(validatedData.bpm, 10),
				key: validatedData.key,
				producer: { connect: { id: internalUserId } },
				contentType: contentTypeValue,
				minPrice: Math.min(...validatedData.licenses.map((l) => l.price)),
				licenses: {
					create: validatedData.licenses.map((l) => ({
						name: l.name,
						price: l.price,
						type: LicenseType.BASIC, // Placeholder
						filesIncluded: l.filesIncluded,
						streamLimit: l.streamLimit,
						distributionLimit: l.distributionLimit,
					})),
				},
				trackFiles: {
					create: [
						{ fileType: coverFileType, storagePath: coverStoragePath },
						{ fileType: TrackFileType.PREVIEW_MP3, storagePath: previewStoragePath },
						{ fileType: TrackFileType.MAIN_WAV, storagePath: mainTrackStoragePath },
					],
				},
				genres: genreName
					? {
							connectOrCreate: {
								where: { name: genreName },
								create: { name: genreName },
							},
					  }
					: undefined,
				tags: {
					connectOrCreate: tagsList.map((tagName) => ({
						where: { name: tagName },
						create: { name: tagName },
					})),
				},
			},
			select: { id: true },
		});

		revalidatePath("/");
		revalidatePath("/explore");
		revalidatePath(`/u/${user.username}`);

		return { success: true, trackId: newTrack.id };
	} catch (error: unknown) {
		console.error("Error uploading track:", error);
		// Basic error handling, should be more specific
		const errorMessage =
			error instanceof Error ? error.message : "An unknown error occurred.";
		return { success: false, error: errorMessage };
	} finally {
		// Cleanup temporary files
		if (tempMainTrackPath) await fs.unlink(tempMainTrackPath).catch(console.error);
		if (tempWatermarkedPath) await fs.unlink(tempWatermarkedPath).catch(console.error);
	}
}

export async function deleteTrack(
	trackId: string,
): Promise<{ success: boolean; error?: string }> {
	const { userId: clerkId } = auth();
	if (!clerkId) {
		return { success: false, error: "Not authenticated." };
	}

	try {
		const internalUserId = await getInternalUserId(clerkId);
		if (!internalUserId) {
			return { success: false, error: "User not found." };
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

		const user = await prisma.user.findUnique({
			where: { id: internalUserId },
			select: { role: true },
		});

		if (track.producerId !== internalUserId && user?.role !== UserRole.ADMIN) {
			return {
				success: false,
				error: "You don't have permission to delete this track.",
			};
		}

		// Delete associated files from storage
		const filePaths = track.trackFiles.map((file) => file.storagePath);
		if (filePaths.length > 0) {
			const { error: storageError } = await supabaseAdmin.storage
				.from("tracks")
				.remove(filePaths);
			if (storageError) {
				console.error("Error deleting files from storage:", storageError);
				// Decide if you want to stop or continue if storage deletion fails
				return {
					success: false,
					error: `Failed to delete associated files: ${storageError.message}`,
				};
			}
		}

		await prisma.track.delete({ where: { id: trackId } });

		revalidatePath("/explore");
		// Also revalidate user profile page if you have one
		return { success: true };
	} catch (error: unknown) {
		console.error("Error deleting track:", error);
		const errorMessage =
			error instanceof Error ? error.message : "An unknown error occurred.";
		return { success: false, error: errorMessage };
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
					.from("tracks")
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

export async function deleteTrackFile(
	trackId: string,
	storagePath: string,
): Promise<{ success: boolean; error?: string }> {
	console.log(`Attempting to delete file with storage path: ${storagePath} from track ${trackId}`);

	const { userId: clerkId } = auth();
	if (!clerkId) {
		return { success: false, error: 'User not authenticated.' };
	}
	const producerId = await getInternalUserId(clerkId);
	if (!producerId) {
		return { success: false, error: 'Could not verify user.' };
	}

	try {
		// First, verify the user owns the track this file belongs to
		const fileRecord = await prisma.trackFile.findFirst({
			where: {
				storagePath: storagePath,
				trackId: trackId,
				track: {
					producerId: producerId,
				},
			},
			select: { id: true },
		});

		if (!fileRecord) {
			return { success: false, error: 'File not found or permission denied.' };
		}

		// Use a transaction to ensure both DB and storage are cleaned up
		await prisma.$transaction(async (tx) => {
			// Delete the file from Supabase Storage
			const { error: storageError } = await supabaseAdmin.storage
				.from('tracks') // Make sure this bucket name is correct
				.remove([storagePath]);

			if (storageError) {
				// If storage deletion fails, we roll back the DB deletion
				throw new Error(`Storage deletion failed: ${storageError.message}`);
			}
			console.log(`Successfully deleted file from storage: ${storagePath}`);

			// Delete the TrackFile record from the database
			await tx.trackFile.delete({
				where: { id: fileRecord.id },
			});
			console.log(`Successfully deleted TrackFile record from database: ${fileRecord.id}`);
		});

		revalidatePath(`/track/${trackId}/edit`);

		return { success: true };

	} catch (error) {
		const message = error instanceof Error ? error.message : "An unexpected error occurred.";
		console.error(`Error deleting track file ${storagePath}:`, error);
		return { success: false, error: message };
	}
}

export async function prepareTrackFileReplacement(
	trackId: string,
	fileType: TrackFileType,
	fileName: string,
): Promise<{ success: boolean; error?: string; uploadUrl?: string; storagePath?: string; }> {
	'use server';

	const { userId: clerkId } = auth();
	if (!clerkId) {
		return { success: false, error: 'User not authenticated.' };
	}
	const producerId = await getInternalUserId(clerkId);
	if (!producerId) {
		return { success: false, error: 'Could not verify user.' };
	}

	try {
		const track = await prisma.track.findFirst({
			where: { id: trackId, producerId: producerId },
		});

		if (!track) {
			return { success: false, error: 'Track not found or permission denied.' };
		}

		// Construct a new storage path
		const newStoragePath = `public/${producerId}/${trackId}/${fileType.toLowerCase()}-${uuidv4()}-${fileName}`;

		const { urls, error } = await createSignedUploadUrls('tracks', [newStoragePath], 300);

		if (error || !urls?.[0]) {
			throw new Error(error || 'Failed to create signed URL.');
		}

		return {
			success: true,
			uploadUrl: urls[0],
			storagePath: newStoragePath,
		};

	} catch (error) {
		const message = error instanceof Error ? error.message : "An unexpected error occurred.";
		console.error(`Error preparing file replacement for track ${trackId}:`, error);
		return { success: false, error: message };
	}
}

export async function finalizeTrackFileReplacement(
	trackId: string,
	fileType: TrackFileType,
	newStoragePath: string,
): Promise<{ success: boolean; error?: string; }> {
	'use server';
	
	const { userId: clerkId } = auth();
	if (!clerkId) return { success: false, error: 'User not authenticated.' };
	const producerId = await getInternalUserId(clerkId);
	if (!producerId) return { success: false, error: 'Could not verify user.' };

	try {
		const trackFileToUpdate = await prisma.trackFile.findFirst({
			where: {
				trackId: trackId,
				fileType: fileType,
				track: { producerId: producerId },
			},
		});

		if (!trackFileToUpdate) {
			// If no record exists, create one
			await prisma.trackFile.create({
				data: {
					trackId: trackId,
					fileType: fileType,
					storagePath: newStoragePath,
				}
			});
			console.log(`Created new TrackFile record for ${fileType} on track ${trackId}`);
		} else {
			const oldStoragePath = trackFileToUpdate.storagePath;

			// Update the DB record with the new path
			await prisma.trackFile.update({
				where: { id: trackFileToUpdate.id },
				data: { storagePath: newStoragePath },
			});
			console.log(`Updated TrackFile record ${trackFileToUpdate.id} with new path ${newStoragePath}`);
			
			// Delete the old file from storage
			if (oldStoragePath) {
				await supabaseAdmin.storage.from('tracks').remove([oldStoragePath]);
				console.log(`Deleted old file from storage: ${oldStoragePath}`);
			}
		}
		
		revalidatePath(`/track/${trackId}/edit`);
		return { success: true };

	} catch(error) {
		const message = error instanceof Error ? error.message : "An unexpected error occurred.";
		console.error(`Error finalizing file replacement for track ${trackId}:`, error);
		
		// As a fallback, try to delete the newly uploaded file if finalization fails
		if (newStoragePath) {
			await supabaseAdmin.storage.from('tracks').remove([newStoragePath]);
			console.log(`Rolled back by deleting newly uploaded file: ${newStoragePath}`);
		}
		
		return { success: false, error: message };
	}
} 