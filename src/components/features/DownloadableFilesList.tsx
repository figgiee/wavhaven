import React from 'react';
import Image from 'next/image';
import { DownloadButton } from './DownloadButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// This type should be defined where it's fetched, but duplicated here for clarity
export type PermissionWithTrackAndFiles = {
    id: string;
    licenseType: string;
    track: {
        id: string;
        title: string;
        imageUrl: string | null;
        producer: {
            username: string | null;
        } | null;
        trackFiles: {
            id: string;
            fileType: string;
            fileName: string | null;
        }[];
    };
};

interface DownloadableFilesListProps {
  permissions: PermissionWithTrackAndFiles[];
}

export function DownloadableFilesList({ permissions }: DownloadableFilesListProps) {
  if (permissions.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardHeader>
          <CardTitle>No Downloads Yet</CardTitle>
          <CardDescription>When you purchase a track, your downloadable files will appear here.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {permissions.map((permission) => (
        <Card key={permission.id} className="overflow-hidden">
          <CardContent className="p-6 flex items-start justify-between gap-6">
            <div className="flex items-center gap-5 flex-1">
              <Image
                src={permission.track.imageUrl || '/coverart/default-cover.png'}
                alt={permission.track.title}
                width={80}
                height={80}
                className="rounded-lg object-cover aspect-square border"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{permission.track.title}</h3>
                <p className="text-sm text-muted-foreground">by {permission.track.producer?.username || 'Unknown Artist'}</p>
                <Badge variant="outline" className="mt-2">{permission.licenseType} License</Badge>
              </div>
            </div>

            <div className="flex flex-col items-end space-y-2 w-[300px] flex-shrink-0">
               {permission.track.trackFiles.length > 0 ? (
                    permission.track.trackFiles.map((file) => (
                      <DownloadButton
                        key={file.id}
                        trackFileId={file.id}
                        suggestedFilename={file.fileName || `${permission.track.title} (${file.fileType})`}
                      />
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-right">No downloadable files available for this license.</p>
                )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 