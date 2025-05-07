---
description: 
globs: src/server-actions/**/*.ts,src/app/api/**/*.ts,src/app/api/**/*.tsx,src/components/**/*.ts,src/components/**/*.tsx
alwaysApply: false
---
---
ruleType: Auto Attached
filePatterns:
  - "src/server-actions/**/*.ts" # Primarily for actions/backend logic
  - "src/app/api/**/*.{ts,tsx}"   # API routes
  - "src/components/**/*.{ts,tsx}" # Client components handling action calls
description: Conventions for handling errors gracefully, providing user feedback, and logging in Wavhaven.
---
# Error Handling Conventions for Wavhaven

- **Server Actions/API Routes:**
    - Use `try...catch` blocks to handle potential errors during database operations, API calls, file system access, etc.
    - Return clear success/error states or objects from Server Actions. Include meaningful error messages for debugging (log them server-side). Example return: `{ success: boolean; data?: T; error?: string; }`.
    - Log unexpected errors server-side (e.g., using `console.error`) for monitoring. Do not expose detailed internal errors directly to the client unless necessary and safe.
- **Client-Side:**
    - When calling Server Actions or fetching data, handle potential errors returned from the server.
    - Use the **Toaster/Sonner** component (configured in `layout.tsx`) to display user-friendly error messages (e.g., "Failed to add item to cart. Please try again."). Avoid showing technical details to the end-user.
    - Update UI state appropriately (e.g., set loading to false, show error state).
- **Validation:** Use libraries like Zod for validating data in Server Actions and API routes before processing to catch errors early.