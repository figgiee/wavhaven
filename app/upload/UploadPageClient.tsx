'use client';

import * as React from 'react';
import { TrackUploadForm } from '@/components/forms/TrackUploadForm';
import { Container } from '@/components/layout/Container';

export default function UploadPageClient() {
  return (
    <Container className="py-8 md:py-12">
      <h1 className="text-3xl font-bold mb-8">Upload Your Track</h1>
      <TrackUploadForm />
    </Container>
  );
} 