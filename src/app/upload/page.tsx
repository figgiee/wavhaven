import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UploadForm } from '@/components/features/UploadForm';

export const metadata: Metadata = {
  title: 'Share Your Sound - Wavhaven',
  description: 'Choose your content type and share your music with the world on Wavhaven.',
};

export default async function UploadPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-2">Share Your Sound</h1>
        <p className="text-xl text-muted-foreground">
          Choose your content type and start sharing
        </p>
      </div>

      <UploadForm />
    </div>
  );
} 