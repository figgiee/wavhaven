'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { getInternalUserId } from '@/lib/userUtils';

const reportSchema = z.object({
    trackId: z.string().uuid(),
    reason: z.string().min(10, "Please provide a more detailed reason.").max(1000),
});

export async function reportTrack(input: z.infer<typeof reportSchema>) {
    const validation = reportSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: validation.error.flatten().fieldErrors.reason?.[0] || 'Invalid input.' };
    }

    const { userId: clerkId } = auth();
    if (!clerkId) {
        return { success: false, error: 'Authentication required.' };
    }

    try {
        const internalUserId = await getInternalUserId(clerkId);
        if (!internalUserId) {
            return { success: false, error: 'User not found.' };
        }

        const { trackId, reason } = validation.data;

        // Check if this user has already reported this track
        const existingReport = await prisma.moderationQueue.findFirst({
            where: {
                trackId,
                reporterId: internalUserId,
            },
        });

        if (existingReport) {
            return { success: false, error: "You have already reported this track." };
        }

        await prisma.moderationQueue.create({
            data: {
                trackId,
                reporterId: internalUserId,
                reason,
            },
        });

        return { success: true };

    } catch (error) {
        console.error('Error reporting track:', error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
} 