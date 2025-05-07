---
description: 
globs: src/lib/supabase.ts,src/lib/storage.ts,src/server-actions/trackActions.ts,src/server-actions/orderActions.ts
alwaysApply: false
---
---
ruleType: Auto Attached
filePatterns:
  - "src/lib/supabase.ts"             # Supabase client setup
  - "src/lib/storage.ts"              # Storage utility functions
  - "src/server-actions/trackActions.ts" # Upload logic
  - "src/server-actions/orderActions.ts" # Download link generation
description: Conventions for using Supabase Client and Storage for file uploads (tracks) and generating secure download links in Wavhaven. Covers utilities and RLS.
---
# Supabase Storage Conventions for Wavhaven

- **Purpose:** Use Supabase Storage for storing user-uploaded track files (previews, main files, stems).
- **Client:** Interact with Supabase Storage via the initialized Supabase client (`src/lib/supabase.ts`).
- **Utilities:** Use the helper functions defined in `src/lib/storage.ts` for common operations:
    - `uploadFile`: Handles uploading files (e.g., in `uploadTrack` server action). Use structured paths (e.g., `user_<id>/track_<id>/filename.mp3`).
    - `getPublicUrl`: For accessing publicly readable files (like preview MP3s).
    - `createSignedUrl`: For generating secure, time-limited download links for purchased files (WAV, stems). This is essential for order fulfillment, especially for guests. Called from server actions checking purchase authorization.
- **RLS Policies:** Configure Row Level Security (RLS) policies directly in the Supabase dashboard for the storage bucket:
    - Allow public read access only for necessary files (e.g., preview audio).
    - Restrict read access for licensed files (require signed URLs).
    - Restrict write access (allow uploads only via the backend using the Service Role Key).
- **Environment Variables:** Ensure Supabase URL, Anon Key, and Service Role Key are correctly configured in `.env`.