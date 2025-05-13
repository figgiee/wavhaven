import React from 'react';
import { cn } from '@/lib/utils'; // Assuming cn utility exists

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Container({ children, className, ...props }: ContainerProps) {
  return (
    <div
      className={cn('mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-6', className)} // Common container styling
      {...props}
    >
      {children}
    </div>
  );
} 