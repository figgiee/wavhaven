import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('Storage Trigger: Track Update function initializing');

// Define the expected structure of the webhook payload record for storage inserts
interface StorageObject {
    bucket_id: string;
    name: string; // The full path of the object, e.g., producerId/trackId/filename.mp3
    // Include other fields if needed, like id, owner, metadata, etc.
}

// Define the expected structure of the webhook payload
interface StorageWebhookPayload {
    type: 'INSERT' | 'UPDATE' | 'DELETE'; // Supabase event type
    table: string;  // Should be 'objects'
    schema: string; // Should be 'storage'
    record: StorageObject;
    old_record?: StorageObject | null;
}

serve(async (req: Request) => {
    // Immediately respond to OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // --- 1. Initialize Supabase Admin Client ---
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Missing SUPABASE_URL or CUSTOM_SUPABASE_SERVICE_ROLE_KEY environment variables.');
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
             auth: { persistSession: false } // Important for server-side/stateless functions
        });

        // --- 2. Parse Incoming Webhook Payload ---
        const payload: StorageWebhookPayload = await req.json();
        console.log('Received payload:', JSON.stringify(payload, null, 2));

        if (
            payload.type !== 'INSERT' ||
            payload.schema !== 'storage' ||
            payload.table !== 'objects' ||
            !payload.record
        ) {
            console.log(`Ignoring event: type=${payload.type}, schema=${payload.schema}, table=${payload.table}`);
            return new Response(JSON.stringify({ message: 'Ignoring event: Not a storage object creation.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        const fileRecord = payload.record;
        const bucketName = fileRecord.bucket_id;
        const filePath = fileRecord.name;

        if (bucketName !== 'tracks') {
            console.log(`Ignoring file in bucket: ${bucketName}`);
            return new Response(JSON.stringify({ message: `Ignoring bucket ${bucketName}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // --- 3. Extract IDs and Determine File Type ---
        const pathParts = filePath.split('/');
        if (pathParts.length < 3) {
            console.error(`Invalid file path structure: ${filePath}`);
            // Acknowledge webhook but don't error out, just log and ignore
             return new Response(JSON.stringify({ message: `Ignoring invalid file path structure: ${filePath}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        const producerId = pathParts[0]; // For logging/validation
        const trackId = pathParts[1];
        const fileName = pathParts[pathParts.length - 1];

        console.log(`Processing file for Producer: ${producerId}, Track: ${trackId}, File: ${fileName}`);

        const isCoverImage = /\.(jpg|jpeg|png|webp)$/i.test(fileName);
        const isAudioFile = /\.(mp3|wav|aiff|flac)$/i.test(fileName);

        let updateData: { audioUrl?: string; coverImageUrl?: string } = {};
        let columnName: string | null = null;

        if (isAudioFile) {
            columnName = 'audioUrl';
        } else if (isCoverImage) {
            columnName = 'coverImageUrl';
        } else {
            console.warn(`Unrecognized file type for path: ${filePath}`);
            return new Response(JSON.stringify({ message: `Ignoring unrecognized file type: ${fileName}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200, 
            });
        }

        // --- 4. Construct Public URL ---
        const { data: urlData } = supabaseAdmin.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        if (!urlData || !urlData.publicUrl) {
          console.error(`Failed to get public URL for: ${filePath}`);
          throw new Error(`Could not generate public URL for ${filePath}`);
        }

        updateData[columnName as keyof typeof updateData] = urlData.publicUrl;
        console.log(`Prepared update for Track ID ${trackId}:`, updateData);

        // --- 5. Update Database Record ---
        const { error: updateError } = await supabaseAdmin
          .from('Track') // Ensure this matches your table name
          .update(updateData)
          .eq('id', trackId);

        if (updateError) {
          console.error(`Database update failed for Track ID ${trackId}:`, updateError);
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        console.log(`Successfully updated ${columnName} for Track ID: ${trackId}`);

        // --- 6. Return Success Response ---
        return new Response(JSON.stringify({ success: true, message: `Updated ${columnName} for track ${trackId}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });

    } catch (error) {
        console.error('Error processing storage trigger:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500, // Use 500 for internal server errors
        });
    }
});

/* 
Deployment & Trigger Instructions remain the same as previously discussed.
Ensure SUPABASE_URL and CUSTOM_SUPABASE_SERVICE_ROLE_KEY secrets are set.
*/ 