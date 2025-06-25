'use client';

import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import React from 'react';

interface ConditionalLayoutWrapperProps {
  children: React.ReactNode;
}

export function ConditionalLayoutWrapper({ children }: ConditionalLayoutWrapperProps) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col pb-24">
        {children}
      </main>
      <SiteFooter />
    </>
  );
} 