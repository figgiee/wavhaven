import React from 'react';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db/prisma';
import { getInternalUserId } from '@/lib/userUtils';
import { DownloadableFilesList, PermissionWithTrackAndFiles } from '@/components/features/DownloadableFilesList';
import { redirect } from 'next/navigation';

async function getDownloadableFiles(userId: string): Promise<PermissionWithTrackAndFiles[]> {
  const permissions = await prisma.userDownloadPermission.findMany({
    where: {
      userId: userId,
      order: {
        status: 'COMPLETED',
      },
    },
    include: {
      track: {
        include: {
          producer: {
            select: {
              username: true,
            },
          },
          trackFiles: {
            select: {
              id: true,
              fileType: true,
              fileName: true,
            },
            // You might want to filter which file types are shown
            // For example, only show downloadable types, not image types
          },
        },
      },
    },
    orderBy: {
      order: {
        createdAt: 'desc',
      },
    },
  });

  // Since Prisma's type generation doesn't automatically create the nested type,
  // we cast it here. This is safe because of the `include` structure above.
  return permissions as unknown as PermissionWithTrackAndFiles[];
}

export default async function DownloadsPage() {
  const user = await currentUser();
  if (!user) {
    redirect('/sign-in'); // Redirect unauthenticated users
  }

  const internalUserId = await getInternalUserId(user.id);
  if (!internalUserId) {
    return (
      <div className="container py-8">
        <p className="text-red-500">Error: Could not find your user account.</p>
      </div>
    );
  }

  const downloadableFiles = await getDownloadableFiles(internalUserId);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Downloads</h1>
        <p className="text-muted-foreground mt-1">Access all the tracks you've licensed.</p>
      </div>
      <DownloadableFilesList permissions={downloadableFiles} />
    </div>
  );
} 