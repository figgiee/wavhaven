import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import UploadPageClient from './UploadPageClient';

export const metadata: Metadata = {
  title: 'Upload Your Track - Wavhaven',
  description: 'Upload your track details, audio files, cover art, and define licenses.',
};

export default async function Page() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }
  // This is a Server Component, keep structure simple
  return <UploadPageClient />;
} 