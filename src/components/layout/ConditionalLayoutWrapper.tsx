'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import React from 'react';
import { cn } from '@/lib/utils';

interface ConditionalLayoutWrapperProps {
  children: React.ReactNode;
}

export function ConditionalLayoutWrapper({ children }: ConditionalLayoutWrapperProps) {
  const pathname = usePathname();
  const isAudioLabPage = pathname === '/audio-lab';

  return (
    <>
      {!isAudioLabPage && <SiteHeader />}
      <main className={cn("flex flex-1 flex-col", !isAudioLabPage && "pb-24")}>
        {children}
      </main>
      {!isAudioLabPage && <SiteFooter />}
    </>
  );
} 