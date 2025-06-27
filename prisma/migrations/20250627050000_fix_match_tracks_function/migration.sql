-- Fix the match_tracks function with correct field names and file type filtering

CREATE OR REPLACE FUNCTION match_tracks(
    query_embedding vector(768),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id text,
    title text,
    producer_username text,
    cover_image_url text,
    preview_audio_url text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.title,
        u.username,
        tf_cover."storagePath" as cover_image_url,
        tf_preview."storagePath" as preview_audio_url,
        1 - (te.embedding <=> query_embedding) as similarity
    FROM "TrackEmbedding" te
    JOIN "Track" t ON t.id = te."trackId"
    JOIN "User" u ON u.id = t."producerId"
    LEFT JOIN "TrackFile" tf_cover ON tf_cover."trackId" = t.id 
        AND tf_cover."fileType" IN ('IMAGE_PNG', 'IMAGE_JPEG', 'IMAGE_WEBP')
    LEFT JOIN "TrackFile" tf_preview ON tf_preview."trackId" = t.id 
        AND tf_preview."fileType" = 'PREVIEW_MP3'
    WHERE t."isPublished" = true
        AND (1 - (te.embedding <=> query_embedding)) > match_threshold
    ORDER BY te.embedding <=> query_embedding
    LIMIT match_count;
END;
$$; 