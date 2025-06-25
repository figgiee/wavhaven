// src/middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

// Rely entirely on Clerk's default behavior and ENV vars for public routes
console.log('[Middleware] Using clerkMiddleware with default configuration.');

// Export the clerk middleware directly
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes/Server Actions
    '/(api|trpc)(.*)',
  ],
};