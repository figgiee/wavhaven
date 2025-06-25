"use server";

import prisma from "@/lib/db/prisma";
import { UserRole } from "@prisma/client";
import * as z from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

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