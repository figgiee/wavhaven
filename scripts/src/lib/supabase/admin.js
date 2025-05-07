"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
// Ensure these environment variables are set in your .env.local or environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) {
    throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseServiceKey) {
    throw new Error('Missing environment variable SUPABASE_SERVICE_ROLE_KEY');
}
// Create a single supabase admin client for interacting with your database
// Note: This client has admin privileges and should only be used in server-side code
// where Row Level Security needs to be bypassed.
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
