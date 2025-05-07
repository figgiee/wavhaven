import { supabaseAdmin } from './supabase/admin'; // Import the admin client

export async function getInternalUserId(clerkId: string | null | undefined): Promise<string | null> {
  // console.log("--- Inside getInternalUserId (Supabase Client) ---");
  if (!clerkId) {
    console.warn("[getInternalUserId] Called with null or undefined clerkId");
    return null;
  }

  // Log the Supabase URL being used by the admin client (optional)
  // console.log(`[getInternalUserId] Using Supabase URL: ${supabaseAdmin.supabaseUrl}`);

  // console.log(`[getInternalUserId] Attempting Supabase query for clerkId: ${clerkId}`);

  // --- REMOVE TEMPORARY DIAGNOSTIC LOG ---
  // console.log(`[getInternalUserId] supabaseAdmin object exists: ${!!supabaseAdmin}`);
  // -------------------------------------

  try {
    // console.log(`[getInternalUserId] supabaseAdmin object exists: ${!!supabaseAdmin}`);
    const { data: user, error } = await supabaseAdmin
      .from("User")
      .select("id")
      .eq("clerkId", clerkId)
      .single();

    if (error) {
      // Keep this error log as it indicates a potentially serious issue
      console.error(`[getInternalUserId] Supabase Error fetching user for clerkId ${clerkId}:`, error);
      return null;
    }

    if (user) {
      // console.log(`[getInternalUserId] Found user ID: ${user.id} for clerkId: ${clerkId}`);
      // console.log("--- Exiting getInternalUserId (Supabase Client) ---"); // Moved exit log here
      return user.id;
    } else {
      // console.warn(`[getInternalUserId] Internal user ID not found in DB for clerkId: ${clerkId}`);
      // console.log("--- Exiting getInternalUserId (Supabase Client) ---"); // Moved exit log here
      return null;
    }
  } catch (error) {
    console.error(`[getInternalUserId] Unexpected Error for clerkId ${clerkId}:`, error);
    // console.log("--- Exiting getInternalUserId (Supabase Client) ---"); // Moved exit log here
    return null;
  }
}