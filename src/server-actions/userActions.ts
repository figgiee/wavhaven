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

// --- Update User Profile Schema ---
const updateProfileSchema = z.object({
	name: z.string().min(1, "Name cannot be empty").max(100, "Name is too long"),
	storeName: z.string().max(100, "Store name is too long").optional(),
	bio: z.string().max(1000, "Bio is too long").optional(),
});

type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

interface UpdateProfileResult {
	success: boolean;
	error?: string;
}

// --- Update User Profile Server Action ---
export async function updateUserProfile(
	values: UpdateProfileInput,
): Promise<UpdateProfileResult> {
	try {
		const validationResult = updateProfileSchema.safeParse(values);
		if (!validationResult.success) {
			return {
				success: false,
				error: validationResult.error.errors.map((e) => e.message).join(", "),
			};
		}

		const { name, storeName, bio } = validationResult.data;

		const user = await currentUser();
		if (!user || !user.id) {
			throw new Error("Not authenticated");
		}
		const clerkUserId = user.id;

		const internalUserId = await getInternalUserId(clerkUserId);
		if (!internalUserId) {
			throw new Error("User record not found");
		}

		// Use a transaction to update User and SellerProfile together
		await prisma.$transaction(async (tx) => {
			// 1. Update User firstName and lastName
			// Split the received 'name' back into firstName and lastName
			const nameParts = name.trim().split(' ');
			const inferredFirstName = nameParts[0] || null; // Handle empty string case
			const inferredLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

			await tx.user.update({
				where: { id: internalUserId },
				data: {
					firstName: inferredFirstName,
					lastName: inferredLastName,
				 },
			});

			// 2. Check if SellerProfile exists
			const sellerProfile = await tx.sellerProfile.findUnique({
				where: { userId: internalUserId },
				select: { id: true },
			});

			// 3. Update SellerProfile if it exists and storeName/bio are provided
			if (sellerProfile && (storeName !== undefined || bio !== undefined)) {
				await tx.sellerProfile.update({
					where: { id: sellerProfile.id },
					data: {
						bio: bio !== undefined ? bio : undefined, // Only update if provided
					},
				});
			} else if (!sellerProfile && (storeName || bio)) {
				// Optionally create SellerProfile if it doesn't exist and data is provided?
				// For now, we only update existing profiles.
				console.warn(
					`Attempted to update non-existent SellerProfile for user ${internalUserId}. Store Name/Bio update skipped.`,
				);
			}
		});

		revalidatePath("/settings/profile"); // Revalidate the profile page path
		if (user.username) {
			revalidatePath(`/producer/${user.username}`); // Revalidate public profile path if username exists
		}

		return { success: true };
	} catch (error: unknown) {
		console.error("Error updating user profile:", error);
		const errorMessage =
			error instanceof Error ? error.message : "An unexpected error occurred.";
		return { success: false, error: errorMessage };
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
