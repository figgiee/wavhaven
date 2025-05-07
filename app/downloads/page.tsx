'use client'; // Task 2: Convert to Client Component

import React, { useState, useEffect } from 'react'; // Task 2 & 3: Import hooks
import { useAuth } from '@clerk/nextjs'; // Task 4: Import Clerk client hook
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import Link from 'next/link';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import DownloadButton from '@/components/features/DownloadButton';
import type { TrackFile } from '@prisma/client';
// Task 5: Import the Server Action using relative path
import { fetchUserDownloads } from '@/lib/actions/downloadActions';
import DownloadsClientPage from './DownloadsClientPage';

// Define the type for downloaded items locally (or import if shared)
interface DownloadableItem {
  orderId: string;
  trackId: string;
  licenseId: string;
  trackTitle: string;
  trackCoverUrl?: string | null;
  licenseName: string;
  trackFiles: Pick<TrackFile, 'id' | 'fileType' | 'fileName' | 'storagePath'>[];
}

export default function DownloadsPage() {
  // Task 3: Client-side state management
  const [downloads, setDownloads] = useState<DownloadableItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Task 4: Get auth state from Clerk
  const { userId, isLoaded, getToken } = useAuth();

  // Task 5: Data fetching effect
  useEffect(() => {
    // Reset state on user change (e.g., logout/login)
    setIsLoading(true);
    setError(null);
    setDownloads([]);

    if (isLoaded && userId) {
      console.log("[DownloadsPage Client] Auth loaded, user found. Fetching token...");
      
      // Fetch the token first
      getToken()
        .then(token => {
          if (!token) {
            console.error("[DownloadsPage Client] Failed to get session token.");
            setError("Authentication session error. Please try refreshing.");
            setIsLoading(false);
            return;
          }
          
          console.log("[DownloadsPage Client] Token obtained. Fetching downloads...");
          // Pass the token to the server action
          fetchUserDownloads(token) 
            .then(result => {
              if (result.error) {
                console.error("[DownloadsPage Client] Error from server action:", result.error);
                setError(result.error);
              } else {
                console.log("[DownloadsPage Client] Successfully fetched downloads:", result.downloads?.length);
                setDownloads(result.downloads || []);
              }
            })
            .catch(err => {
              console.error("[DownloadsPage Client] Client-side fetch error:", err);
              setError("An unexpected error occurred while loading your downloads.");
            })
            .finally(() => {
              setIsLoading(false);
              console.log("[DownloadsPage Client] Fetch attempt finished.");
            });
        })
        .catch(tokenError => {
            console.error("[DownloadsPage Client] Error getting token:", tokenError);
            setError("Failed to retrieve authentication token.");
            setIsLoading(false);
        });

    } else if (isLoaded && !userId) {
       console.log("[DownloadsPage Client] Auth loaded, no user found.");
       setError("Please log in to view your downloads.");
       setIsLoading(false);
    } else {
        // Clerk is not loaded yet, isLoading remains true
        console.log("[DownloadsPage Client] Waiting for Clerk auth state...");
    }
  }, [isLoaded, userId, getToken]); // Add getToken to dependency array

  // Task 6: Update Rendering Logic
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Downloads</h1>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           <p className="ml-2 text-muted-foreground">Loading downloads...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center text-center p-6 border border-destructive/50 bg-destructive/10 rounded-md">
           <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
           <p className="text-destructive font-semibold">Error Loading Downloads</p>
           <p className="text-muted-foreground text-sm mt-1">{error}</p>
           {!userId && (
             <Button asChild variant="link" className="mt-4">
                <Link href="/sign-in">Go to Sign In</Link>
             </Button>
           )}
        </div>
      ) : downloads.length === 0 ? (
        <p className="text-muted-foreground">You haven't purchased any tracks yet.</p>
      ) : (
        <div className="space-y-4">
          {downloads.map((item) => (
            <Card key={`${item.orderId}-${item.licenseId}`} className="flex flex-col sm:flex-row items-center p-4 gap-4">
              <Image
                src={item.trackCoverUrl || '/placeholder-image.png'}
                alt={`${item.trackTitle} cover`}
                width={80}
                height={80}
                className="rounded-md aspect-square object-cover flex-shrink-0"
              />
              <div className="flex-grow">
                <h2 className="font-semibold text-lg">{item.trackTitle}</h2>
                <p className="text-sm text-muted-foreground">License: {item.licenseName}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                {item.trackFiles.length > 0 ? (
                  item.trackFiles.map(file => (
                    <DownloadButton
                      key={file.id}
                      trackFileId={file.id}
                      filename={file.fileName || `${item.trackTitle}_${file.fileType}`}
                      trackTitle={item.trackTitle}
                      licenseName={item.licenseName}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">No download files found for this license.</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 