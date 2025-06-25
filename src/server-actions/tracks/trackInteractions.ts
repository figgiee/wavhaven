"use server";

import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export async function incrementPlayCount(
	trackId: string,
): Promise<{ success: boolean; error?: string }> {
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