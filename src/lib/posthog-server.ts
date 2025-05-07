import { PostHog } from 'posthog-node'

function PostHogClient() {
  // Ensure POSTHOG_API_KEY is set in your .env file (server-side only)
  const posthogKey = process.env.POSTHOG_API_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST; // Can reuse public host

  if (!posthogKey || !posthogHost) {
    console.warn(
      'POSTHOG_API_KEY or NEXT_PUBLIC_POSTHOG_HOST not found. Server-side PostHog analytics disabled.'
    );
    return null; // Return null if not configured
  }

  const posthogClient = new PostHog(posthogKey, {
    host: posthogHost,
    flushAt: 1, // Send events immediately (good for serverless/edge environments)
    flushInterval: 0, // Disable interval flushing
    // You might want to enable/disable based on environment:
    // enabled: process.env.NODE_ENV === 'production' 
  })
  return posthogClient;
}

// Export a singleton instance
export const posthogServerClient = PostHogClient(); 