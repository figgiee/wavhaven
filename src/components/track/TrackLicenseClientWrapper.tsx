'use client';

import React from 'react';
import { LicenseSelector } from '@/components/features/LicenseSelector';
import { type License } from '@/components/features/LicenseSelector';

// Define props for the wrapper - should match LicenseSelectorProps
interface TrackLicenseClientWrapperProps {
  licenses: License[];
  trackId: string;
  trackTitle: string;
  producerName: string;
  imageUrl?: string;
  selectedLicenseId: string | undefined;
  onLicenseChange: (id: string | undefined) => void;
}

// This component is a Client Component
export function TrackLicenseClientWrapper({
  licenses,
  trackId,
  trackTitle,
  producerName,
  imageUrl,
  selectedLicenseId,
  onLicenseChange,
}: TrackLicenseClientWrapperProps) {
  // It simply renders the original LicenseSelector, passing down the props.
  // Because this wrapper is a Client Component, LicenseSelector will
  // correctly inherit the Clerk context.
  return (
    <LicenseSelector 
      licenses={licenses} 
      trackId={trackId}
      trackTitle={trackTitle}
      producerName={producerName}
      imageUrl={imageUrl}
      selectedLicenseId={selectedLicenseId}
      onLicenseChange={onLicenseChange}
    />
  );
} 