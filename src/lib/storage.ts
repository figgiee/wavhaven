import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase as publicSupabaseClient } from './supabase'; // Import the public client

// --- Configuration ---
const BUCKET_NAME = 'wavhaven-tracks'; // Ensure this matches your bucket name in Supabase
const SIGNED_URL_EXPIRY = 60 * 60 * 24; // 24 hours in seconds for download links

// --- Service Role Client (for backend operations) ---
let serviceSupabaseClient: SupabaseClient | null = null;

function getServiceSupabaseClient(): SupabaseClient {
  if (serviceSupabaseClient) {
    return serviceSupabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL for service client');
  }
  if (!supabaseServiceKey) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY for service client');
  }

  // Initialize Supabase client with the service role key for elevated privileges
  serviceSupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false, // Don't persist session for service role client
      autoRefreshToken: false,
    },
  });

  return serviceSupabaseClient;
}

// --- Storage Functions ---

/**
 * Uploads a file to the specified path in the Supabase storage bucket.
 * Uses the service role client for backend uploads.
 * 
 * @param file - The File object to upload.
 * @param storagePath - The destination path within the bucket (e.g., user_<id>/track_<id>/preview.mp3).
 * @returns The path where the file was stored.
 * @throws Error if upload fails.
 */
export async function uploadFile(file: File, storagePath: string): Promise<string> {
  const supabaseService = getServiceSupabaseClient();
  const { data, error } = await supabaseService.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      // cacheControl: '3600', // Optional: Set cache control headers
      upsert: true, // Overwrite file if it already exists
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Failed to upload file to ${storagePath}: ${error.message}`);
  }

  return data.path;
}

/**
 * Gets the public URL for a file in the storage bucket.
 * Assumes the file path allows public access based on RLS policies.
 * Uses the public Supabase client.
 * 
 * @param storagePath - The path of the file within the bucket.
 * @returns The public URL string.
 */
export function getPublicUrl(storagePath: string): string {
  const { data } = publicSupabaseClient.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Creates a signed URL for securely downloading a private file.
 * Uses the service role client for backend URL generation.
 * 
 * @param storagePath - The path of the file within the bucket.
 * @param expiresIn - Optional duration in seconds for which the URL is valid (defaults to SIGNED_URL_EXPIRY).
 * @param downloadFilename - Optional filename to use in Content-Disposition header (accepts boolean true or a specific filename)
 * @returns The signed URL string.
 * @throws Error if URL generation fails.
 */
export async function createSignedUrl(
  storagePath: string,
  expiresIn: number = SIGNED_URL_EXPIRY,
  downloadFilename?: string | boolean
): Promise<string> {
  const supabaseService = getServiceSupabaseClient();
  const options: { download?: string | boolean } = {};
  if (downloadFilename) {
    options.download = downloadFilename;
  } else if (downloadFilename === true) {
    options.download = true;
  }

  const { data, error } = await supabaseService.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresIn, options);

  if (error) {
    console.error('Supabase signed URL error:', error);
    throw new Error(`Failed to create signed URL for ${storagePath}: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Deletes a file (or multiple files) from the Supabase storage bucket.
 * Uses the service role client.
 * 
 * @param storagePaths - An array containing the path(s) of the file(s) to delete.
 * @throws Error if deletion fails.
 */
export async function deleteFile(storagePaths: string | string[]): Promise<void> {
  // Ensure input is an array
  const pathsToDelete = Array.isArray(storagePaths) ? storagePaths : [storagePaths];
  
  if (pathsToDelete.length === 0) {
    console.log('deleteFile called with empty path array, skipping.');
    return; // Nothing to delete
  }

  const supabaseService = getServiceSupabaseClient();
  const { data, error } = await supabaseService.storage
    .from(BUCKET_NAME)
    .remove(pathsToDelete);

  if (error) {
    console.error('Supabase delete error:', error);
    // Consider more specific error handling if needed (e.g., file not found vs permission error)
    throw new Error(`Failed to delete file(s) ${pathsToDelete.join(', ')}: ${error.message}`);
  }

  // Optional: Log successful deletion
  // console.log('Successfully deleted files:', data);
} 