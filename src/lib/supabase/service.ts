import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

let supabaseAdmin: SupabaseClient | null = null;
// Use a simple flag accessible within the module scope
let serviceKeyLoadedAtInit = false;

export function getSupabaseServiceRoleClient(): SupabaseClient {
  console.log("[getSupabaseServiceRoleClient] Function entered."); // Log entry

  if (supabaseAdmin) {
    console.log("[getSupabaseServiceRoleClient] Returning cached admin client.");
    if (!serviceKeyLoadedAtInit) {
         console.warn("[getSupabaseServiceRoleClient] WARN: Cached client exists, but service key might NOT have been loaded during its initialization!");
    } else {
         console.log("[getSupabaseServiceRoleClient] Cached client initialized successfully with service key previously.");
    }
    return supabaseAdmin;
  }

  console.log("[getSupabaseServiceRoleClient] Creating NEW admin client instance.");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error("FATAL: Missing env.NEXT_PUBLIC_SUPABASE_URL in getSupabaseServiceRoleClient");
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseServiceRoleKey || supabaseServiceRoleKey.length < 10) { // Basic check
    console.error(`FATAL: Missing or invalid env.SUPABASE_SERVICE_ROLE_KEY in getSupabaseServiceRoleClient. Key: ${supabaseServiceRoleKey ? 'Present but short?' : 'Missing'}`);
    serviceKeyLoadedAtInit = false; // Mark as not loaded
    throw new Error('Missing or invalid env.SUPABASE_SERVICE_ROLE_KEY');
  }
  // Avoid logging the key itself, just confirm its presence
  console.log("✅ [getSupabaseServiceRoleClient] SUPABASE_SERVICE_ROLE_KEY is present during client creation.");
  serviceKeyLoadedAtInit = true; // Mark as loaded

  try {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        },
      });
      console.log("[getSupabaseServiceRoleClient] New admin client instance CREATED successfully.");
  } catch (error) {
       console.error("❌ [getSupabaseServiceRoleClient] Error during createClient:", error);
       throw error; // Re-throw
  }


  return supabaseAdmin;
}

// Export the flag if needed elsewhere, though direct access might be simpler
export const checkServiceKeyLoaded = () => serviceKeyLoadedAtInit; 