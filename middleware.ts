// src/middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server'; // Import NextRequest

// Rely entirely on Clerk's default behavior and ENV vars for public routes
console.log('[Middleware] Using explicit function wrapper around clerkMiddleware().');

// Create the handler once
const clerkHandler = clerkMiddleware();

// Define the middleware function to intercept the request
export default function middleware(request: NextRequest) {
  // Optional: Log headers again if needed for debugging
  // console.log('[Middleware] Request Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));

  // Call the actual Clerk middleware handler
  return clerkHandler(request);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes/Server Actions
    '/(api|trpc)(.*)',
  ],
};