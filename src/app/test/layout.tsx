import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import React from 'react';

// Minimal layout to test Clerk auth protection
export default async function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  console.log('[TestLayout] Attempting to render. Clerk User ID:', userId);

  if (!userId) {
    console.log('[TestLayout] No userId, redirecting to sign-in.');
    redirect('/sign-in');
  }

  console.log('[TestLayout] Auth check passed, rendering children.');
  return (
    <div className="p-4 border border-dashed border-blue-500">
      <h2 className="font-bold text-blue-600">Test Layout Wrapper</h2>
      {children}
    </div>
  );
} 