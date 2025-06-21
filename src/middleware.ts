// src/middleware.ts
// import { clerkMiddleware } from '@clerk/nextjs/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server'; // Import if using NextResponse for redirects

// Define public routes that don't require authentication - Use patterns
// const publicPaths = ['/', '/browse', '/api/webhooks/clerk', '/api/webhooks/stripe'];
const isPublicRoute = createRouteMatcher([
  '/',                  // Homepage
  '/browse(.*)',        // Browse page and any sub-paths like /browse/track/123
  '/sign-in(.*)',       // Clerk sign-in routes
  '/sign-up(.*)',       // Clerk sign-up routes
  '/api/webhooks(.*)', // All webhook routes
]);

// Check if the request path matches any of the public paths
// const isPublicPath = (path: string) => {
//   return publicPaths.some(publicPath => path === publicPath || path.startsWith(`${publicPath}/`));
// }; <-- No longer needed with createRouteMatcher

export default clerkMiddleware((auth, req) => {
  // Let Clerk handle protection based on the matcher
  // Remove the explicit check and protect() call
  // if (!isPublicRoute(req)) {
  //   auth().protect(); 
  // }

  // Role checks (if added later) would go here, potentially using NextResponse.redirect
  // Example:
  // const { userId, sessionClaims } = auth();
  // const isProducerRoute = req.nextUrl.pathname.startsWith('/producer');
  // if (isProducerRoute && !sessionClaims?.metadata?.isProducer) {
  //   const homeURL = new URL('/', req.url);
  //   return NextResponse.redirect(homeURL);
  // }
  
  // If no explicit action is taken (like redirect), allow the request to proceed
  // Clerk will handle auth checks based on route matching.
  return NextResponse.next(); // Or simply return void/undefined
});

// // Minimal middleware for debugging - Ensure this is commented out or removed
// export function middleware(req: NextRequest) {

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)', // Don't run middleware on static files
    '/', // Run middleware on index page
    '/(api|trpc)(.*)' // Run middleware on API routes
  ],
};