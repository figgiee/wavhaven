import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Or your preferred font
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes'; // Use dark theme for Clerk components

import '@/app/globals.css';
import { cn } from '@/lib/utils';
import { SiteHeader } from '@/components/layout/site-header'; // Placeholder import
import { SiteFooter } from '@/components/layout/site-footer'; // Import SiteFooter
import { PersistentPlayer } from '@/components/player/persistent-player'; // Placeholder import
import { PostHogProvider } from '@/components/providers/PostHogProvider'; // Based on rules
import { Toaster } from '@/components/ui/sonner'; // Import Toaster
import { ThemeProvider } from '@/components/providers/theme-provider'; // Added ThemeProvider import

// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import { ColorSchemeScript } from '@mantine/core'; // Keep for script

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
      <html lang="en" suppressHydrationWarning className="h-full">
        <head>
          {/* <ColorSchemeScript /> */}{/* Removed Mantine ColorSchemeScript */}
        </head>
        {/* Apply height to html */}
        <body className={cn(
          "h-full", 
          inter.variable, 
          "font-sans antialiased text-white", // Base text color might need adjustment based on theme
          // Restore aurora background effect
          // "bg-gray-950", // Removed hardcoded background
          "bg-aurora", 
          "animate-aurora", 
          "[background-size:200%_100%]"
        )}> 
          <ThemeProvider
            attribute="class"
            defaultTheme="dark" // Set default to dark explicitly
            enableSystem
            disableTransitionOnChange
          >
            <PostHogProvider> { /* Wrap body contents with PostHog Provider */}
              {/* Removed bg-gradient-to-br from here */}
              {/* Also removed bg-black/30 overlay from this div */}
              <div className="relative flex min-h-screen flex-col">
                {/* SiteHeader component */}
                <SiteHeader /> 
                     
                {/* Main content area with padding for player */}
                <main className="flex-1 pb-24">
                  {children}
                </main>
                     
                {/* SiteFooter component */}
                <SiteFooter /> 

                {/* PersistentPlayer component */}
                <PersistentPlayer />
              </div>
              <Toaster 
                position="top-right" 
                richColors 
                theme="dark" 
                closeButton 
              /> { /* Add Toaster here */}
            </PostHogProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
} 