// Keep as Server Component

import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Keep Inter
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes'; // Use dark theme for Clerk components

import './globals.css';
import { cn } from '@/lib/utils'; // Keep cn
import { SiteHeader } from '@/components/layout/site-header'; // Placeholder import
import { SiteFooter } from '@/components/layout/site-footer'; // Import SiteFooter
import { AudioPlayerContainer } from '@/components/features/audio-player/AudioPlayerContainer'; // ADDED new player import
import { PostHogProvider } from '@/components/providers/PostHogProvider'; // Based on rules
import { Toaster } from '@/components/ui/sonner'; // Import Toaster
import { ThemeProvider } from '@/components/providers/theme-provider'; // Added ThemeProvider import
import { TooltipProvider } from "@/components/ui/tooltip"; // Import TooltipProvider

// Re-define Inter font
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

// {/* TODO: Update metadata with actual site info */}
export const metadata: Metadata = {
  title: 'WavHaven', // Default title
  description: 'High-quality beats, loops, and sounds.',
  // Add other metadata: themeColor, icons, openGraph, etc.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider 
       appearance={{
         baseTheme: dark, // Apply dark theme to Clerk components
         variables: { colorPrimary: '#6366f1' }, // Example: Use indigo for primary color
         elements: {
           userButtonPopoverCard: "bg-gray-900 border-gray-700",
           userButtonPopoverActions: "text-white",
           userButtonPopoverActionButton__signOut: "focus:bg-red-500/20",
           // Add more Clerk component overrides if needed
         }
       }}
    >
      {/* Keep <html> outside ThemeProvider */}
      <html lang="en" suppressHydrationWarning className="h-full">
        <head>
          {/* <ColorSchemeScript /> */}{/* Removed Mantine ColorSchemeScript */}
        </head>
        <body className={cn(
          "h-full", 
          inter.variable, 
          "font-sans antialiased"
        )}> 
          {/* Wrap content INSIDE body with ThemeProvider */}
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            disableTransitionOnChange
          >
            <PostHogProvider>
              <TooltipProvider>
                <div className="relative flex min-h-screen flex-col">
                  <SiteHeader /> 
                  <main className="flex flex-1 flex-col pb-24">
                    {children}
                  </main>
                  <SiteFooter /> 
                  <AudioPlayerContainer />
                </div>
              </TooltipProvider>
              <Toaster 
                position="top-right" 
                richColors 
                theme="dark" 
                closeButton 
              />
            </PostHogProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
} 