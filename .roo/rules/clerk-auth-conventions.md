---
description: 
globs: src/middleware.ts,src/app/**/*.ts,src/app/**/*.tsx,src/components/**/*.ts,src/components/**/*.tsx,src/lib/userUtils.ts,src/server-actions/userActions.ts
alwaysApply: false
---
---
ruleType: Auto Attached
filePatterns:
  - "src/middleware.ts"          # Middleware for route protection
  - "src/app/**/*.{ts,tsx}"      # Pages/layouts/components using auth state
  - "src/components/**/*.{ts,tsx}" # Components potentially using auth hooks/buttons
  - "src/lib/userUtils.ts"       # Utility for internal ID mapping
  - "src/server-actions/userActions.ts" # Actions for user sync/role updates
description: Conventions for using Clerk for authentication, session management, user syncing, middleware, and role checks (via internal DB) in Wavhaven.
---
# Clerk Authentication Conventions for Wavhaven

- **Provider:** Use **Clerk** for registered user (`CUSTOMER`, `PRODUCER`) authentication and session management. The root layout (`src/app/layout.tsx`) should include `<ClerkProvider>`.
- **Components:** Use Clerk components like `<SignIn>`, `<SignUp>`, `<UserButton>` for standard auth UI.
- **Accessing User Data:**
    - Server-side (RSCs, Server Actions, Route Handlers): Use `auth()` and `currentUser()` from `@clerk/nextjs/server`.
    - Client-side (`"use client"` components): Use hooks like `useAuth()` and `useUser()` from `@clerk/nextjs`.
- **Middleware:** Use `clerkMiddleware` in `src/middleware.ts` to protect routes and define public routes. Implement logic to check roles if necessary within the middleware or on protected pages/layouts.
- **User Sync:** Ensure the `ensureUserRecord` server action (or similar logic) syncs Clerk user data (especially `userId`) to the internal `User` table upon first sign-in/access, associating it with the internal `id` and setting the initial role (e.g., `CUSTOMER`).
- **Role Management:** User roles (`CUSTOMER`, `PRODUCER`) are stored in the internal `User` table, not directly as Clerk metadata (unless explicitly decided otherwise later). Authorization checks should query the internal `User` record based on the `clerkId`.