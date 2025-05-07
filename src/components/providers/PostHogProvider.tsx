'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useAuth, useUser } from '@clerk/nextjs'

// Ensure these are set in your .env file and exposed to the client
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

// Component to handle user identification and resetting
function PostHogAuthHandler() {
  const posthogClient = usePostHog()
  const { isSignedIn, userId } = useAuth()
  const { user } = useUser()

  useEffect(() => {
    if (isSignedIn && userId && user && posthogClient) {
      const currentDistinctId = posthogClient.get_distinct_id()
      // Alias anonymous id to signed in user id if necessary
      if (currentDistinctId !== userId) {
        console.log(`Aliasing PostHog ID ${currentDistinctId} to ${userId}`)
        posthogClient.alias(userId, currentDistinctId)
      }
      // Identify the user
      console.log('Identifying user with PostHog:', userId)
      posthogClient.identify(userId, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName
      })
    } else if (!isSignedIn && posthogClient) {
      // User logged out, reset PostHog identification
      console.log('Resetting PostHog identification.')
      posthogClient.reset()
    }
  }, [isSignedIn, userId, user, posthogClient])

  return null
}

// Component to handle pageview tracking
function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthogClient = usePostHog()

  useEffect(() => {
    if (pathname && posthogClient) {
      let url = window.origin + pathname
      const search = searchParams.toString()
      if (search) {
        url = url + `?${search}`
      }
      console.log(`Capturing PostHog pageview: ${url}`)
      posthogClient.capture('$pageview', {
        '$current_url': url
      })
    }
  }, [pathname, searchParams, posthogClient])

  return null
}

// Wrap pageview tracking in Suspense as per PostHog integration docs
function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  )
}

// Main Exported Provider
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (posthogKey && posthogHost) {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        capture_pageview: false, // We'll capture pageviews manually
        capture_pageleave: true
      })
    }
  }, [])

  if (!posthogKey || !posthogHost) {
    console.warn('PostHog keys not configured. Analytics disabled.')
    return <>{children}</>
  }

  return (
    <PHProvider client={posthog}>
      {/* Auth Handler needs to be inside the provider to use usePostHog */}
      <PostHogAuthHandler />
      {/* Wrap the pageview handler in Suspense as per docs */}
      <SuspendedPostHogPageView />
      {children}
    </PHProvider>
  )
}
