"use server";

import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import * as z from "zod";
import { revalidatePath } from "next/cache";
import { currentUser, auth, clerkClient } from "@clerk/nextjs/server";
import { getInternalUserId } from "@/lib/userUtils";

/**
 * Ensures a user record exists in the database corresponding to the Clerk user.
 * Creates a new user with default role CUSTOMER if they don't exist,
 * or updates the email if they do exist (in case it changed in Clerk).
 *
 * @param clerkId - The Clerk User ID.
 * @param email - The primary email address.
 * @param firstName - The user's first name (optional).
 * @param lastName - The user's last name (optional).
 * @param username - The user's username (optional).
 * @returns The internal user ID (UUID string).
 * @throws Error if Clerk user ID or primary email is missing.
 */
export async function ensureUserRecord({
	clerkId,
	email,
	firstName,
	lastName,
	username,
}: {
	clerkId: string;
	email: string | undefined | null;
	firstName: string | null;
	lastName: string | null;
	username: string | null;
}): Promise<string> {
	if (!clerkId) {
		throw new Error("Clerk user ID is missing.");
	}

	// Check email directly
	if (!email) {
		throw new Error(`Primary email not found for Clerk user ${clerkId}`);
	}

	// Use upsert to create or update the user record
	const user = await prisma.user.upsert({
		where: {
			clerkId: clerkId, // Find user by Clerk ID
		},
		update: {
			email: email,
			firstName: firstName,
			lastName: lastName,
			username: username, // Also update username if changed
			// Removed isGuest logic as it might not be relevant/present in User model
			// Role is not updated here automatically
		},
		create: {
			clerkId: clerkId,
			email: email,
			firstName: firstName,
			lastName: lastName,
			username: username, // Make sure username is set on create too
			role: UserRole.CUSTOMER, // Default new registered users to CUSTOMER
			// Removed isGuest logic
		},
	});

	return user.id; // Return the internal database ID
}

// Schema for the update payload
const updateUserProfileSchema = z.object({
	name: z.string().min(1, "Name cannot be empty").max(100).optional(),
	storeName: z.string().max(100).optional(),
	bio: z.string().max(1000).optional(),
	// Add social links to the payload schema
	websiteUrl: z.string().url().or(z.literal('')).optional().nullable(),
	twitterUrl: z.string().url().or(z.literal('')).optional().nullable(),
	instagramUrl: z.string().url().or(z.literal('')).optional().nullable(),
	youtubeUrl: z.string().url().or(z.literal('')).optional().nullable(),
	soundcloudUrl: z.string().url().or(z.literal('')).optional().nullable(),
	tiktokUrl: z.string().url().or(z.literal('')).optional().nullable(),
	// profileImageUrl: z.string().url().optional(), // Add later with upload
	// bannerImageUrl: z.string().url().optional(), // Add later with upload
});

export type UserProfileUpdatePayload = z.infer<typeof updateUserProfileSchema>;

interface UpdateResult {
	success: boolean;
	error?: string;
}

// Define a type for the SellerProfile update data
type SellerProfileUpdateData = {
	storeName?: string | null;
	bio?: string | null;
	websiteUrl?: string | null;
	twitterUrl?: string | null;
	instagramUrl?: string | null;
	youtubeUrl?: string | null;
	soundcloudUrl?: string | null;
	tiktokUrl?: string | null;
};

// --- Update User Profile Server Action ---
export async function updateUserProfile(payload: UserProfileUpdatePayload): Promise<UpdateResult> {
	const { userId: clerkId } = auth();
	if (!clerkId) {
		return { success: false, error: "User not authenticated." };
	}

	// Validate payload
	const validationResult = updateUserProfileSchema.safeParse(payload);
	if (!validationResult.success) {
		// Combine errors for better feedback
		const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
		return { success: false, error: `Invalid input: ${errors}` };
	}

	const { name, storeName, bio, websiteUrl, twitterUrl, instagramUrl, youtubeUrl, soundcloudUrl, tiktokUrl } = validationResult.data;

	try {
		const user = await prisma.user.findUnique({
			where: { clerkId },
			select: { id: true, role: true, sellerProfile: { select: { id: true } } },
		});

		if (!user) {
			return { success: false, error: "User not found in database." };
		}

		// Prepare data for update/upsert
		const updateData: Parameters<typeof prisma.user.update>[0]['data'] = {};
		if (name !== undefined) {
			updateData.name = name;
		}
		
		// Use the specific type here
		let sellerProfileUpdateData: SellerProfileUpdateData = {};
		let hasSellerProfileUpdates = false;
		if (user.role === UserRole.PRODUCER) {
			if (storeName !== undefined) { sellerProfileUpdateData.storeName = storeName; hasSellerProfileUpdates = true; }
			if (bio !== undefined) { sellerProfileUpdateData.bio = bio; hasSellerProfileUpdates = true; }
			// Add social links
			if (websiteUrl !== undefined) { sellerProfileUpdateData.websiteUrl = websiteUrl || null; hasSellerProfileUpdates = true; } 
			if (twitterUrl !== undefined) { sellerProfileUpdateData.twitterUrl = twitterUrl || null; hasSellerProfileUpdates = true; }
			if (instagramUrl !== undefined) { sellerProfileUpdateData.instagramUrl = instagramUrl || null; hasSellerProfileUpdates = true; }
			if (youtubeUrl !== undefined) { sellerProfileUpdateData.youtubeUrl = youtubeUrl || null; hasSellerProfileUpdates = true; }
			if (soundcloudUrl !== undefined) { sellerProfileUpdateData.soundcloudUrl = soundcloudUrl || null; hasSellerProfileUpdates = true; }
			if (tiktokUrl !== undefined) { sellerProfileUpdateData.tiktokUrl = tiktokUrl || null; hasSellerProfileUpdates = true; }
		}

		// Use a transaction if updating both User and SellerProfile
		if (hasSellerProfileUpdates) {
			updateData.sellerProfile = {
				upsert: {
					where: { userId: user.id },
					create: { ...sellerProfileUpdateData },
					update: { ...sellerProfileUpdateData },
				},
			};
		}
		
		// Execute the update
		await prisma.user.update({
			where: { id: user.id },
			data: updateData,
		});
		
		// Revalidate relevant paths
		revalidatePath('/settings/profile');
		if (user.username) {
			revalidatePath(`/u/${user.username}`); // Revalidate public profile if username exists
		}

		return { success: true };

	} catch (error) {
		console.error("Failed to update user profile:", error);
		return { success: false, error: "Database error occurred." };
	}
}

// --- Update User Role Server Action ---

const updateUserRoleSchema = z.object({
	targetUserId: z.string().min(1, "Target User ID is required"),
	newRole: z.nativeEnum(UserRole), // Ensure the role is one of the valid enum values
});

interface UpdateRoleResult {
	success: boolean;
	error?: string;
}

export async function updateUserRole(values: {
	targetUserId: string;
	newRole: UserRole;
}): Promise<UpdateRoleResult> {
	try {
		// 1. Authorization: Ensure current user is ADMIN
		const { userId: adminClerkId } = await auth();
		if (!adminClerkId) {
			return { success: false, error: "Authentication required." };
		}
		const adminUser = await prisma.user.findUnique({
			where: { clerkId: adminClerkId },
			select: { role: true },
		});
		if (adminUser?.role !== UserRole.ADMIN) {
			return { success: false, error: "Unauthorized: Admin access required." };
		}

		// 2. Validate Input
		const validationResult = updateUserRoleSchema.safeParse(values);
		if (!validationResult.success) {
			return {
				success: false,
				error: validationResult.error.errors.map((e) => e.message).join(", "),
			};
		}
		const { targetUserId, newRole } = validationResult.data;

		// 3. Prevent self-role change or changing another Admin?
		// Optional: Add logic here if needed, e.g., prevent changing admin roles via this action.

		// 4. Update target user's role
		const updatedUser = await prisma.user.update({
			where: { id: targetUserId }, // Target user by internal ID
			data: { role: newRole },
		});

		if (!updatedUser) {
			return { success: false, error: "Target user not found." };
		}

		console.log(
			`Admin ${adminClerkId} updated role for user ${targetUserId} to ${newRole}`,
		);

		// 5. Revalidate admin users page
		revalidatePath("/admin/users");

		return { success: true };
	} catch (error: unknown) {
		console.error("Error updating user role:", error);
		const errorMessage =
			error instanceof Error ? error.message : "An unexpected error occurred.";
		return { success: false, error: errorMessage };
	}
}

// --- Get Featured Producers ---

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
// --- End Get Featured Producers ---
