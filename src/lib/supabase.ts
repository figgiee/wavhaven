import { createClient } from '@supabase/supabase-js';
import { useAuth } from "@clerk/nextjs"; // Import Clerk's useAuth hook

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Initialize the Supabase client for client-side interactions
// Updated to include Clerk token
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    // Get the Supabase token with a custom fetch method
    fetch: async (url, options = {}) => {
      const { getToken } = useAuth(); // Get Clerk's getToken function
      const supabaseToken = await getToken({ template: "supabase" }); // Assuming you have a 'supabase' template in Clerk

      // Construct fetch headers
      const headers = new Headers(options.headers);
      headers.set('Authorization', `Bearer ${supabaseToken}`);

      // Call the original fetch
      return fetch(url, {
        ...options,
        headers,
      });
    },
  },
}); 