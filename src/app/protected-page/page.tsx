import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import React from 'react';

// Minimal Server Component page to test direct auth check
export default async function ProtectedPage() {
  const { userId } = await auth();
  console.log('[ProtectedPage] Rendering. Clerk User ID:', userId);

  // Note: Middleware should handle the redirect if not logged in,
  // but we add a check here for clarity / robustness.
  if (!userId) {
    console.log('[ProtectedPage] No userId found, redirecting...');
    redirect('/sign-in'); 
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Simple Protected Page</h1>
      <p>If you see this, you are authenticated and the page rendered.</p>
      <p>Your User ID: {userId}</p>
    </div>
  );
} 