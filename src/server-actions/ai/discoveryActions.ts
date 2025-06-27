'use server';

import prisma from '@/lib/db/prisma';

export async function getSimilarTracks(trackId: string, matchCount: number = 5) {
    if (!trackId) return [];

    try {
        // 1. Get the embedding for the source track
        const sourceEmbedding = await prisma.trackEmbedding.findUnique({
            where: { trackId },
        });

        if (!sourceEmbedding) {
            console.warn(`No embedding found for source track: ${trackId}`);
            return [];
        }

        const queryEmbedding = sourceEmbedding.embedding as unknown as number[];
        
        // Ensure the embedding is in the correct string format for the RPC call
        const vectorString = `[${queryEmbedding.join(',')}]`;

        // 2. Call the RPC function to find similar tracks
        const similarTracks = await prisma.$queryRaw`
            SELECT * FROM match_tracks(
                ${vectorString}::vector,
                0.5, -- match_threshold (adjust as needed)
                ${matchCount + 1} -- fetch one extra to exclude the source track itself
            )
        `;

        // 3. Filter out the source track itself from the results
        if (Array.isArray(similarTracks)) {
             return similarTracks.filter(track => track.id !== trackId);
        }

        return [];

    } catch (error) {
        console.error('Error fetching similar tracks:', error);
        return [];
    }
} 