// Keep as Server Component

import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Keep Inter
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes'; // Use dark theme for Clerk components

import './globals.css';
import { cn } from '@/lib/utils'; // Keep cn
import { SiteHeader } from '@/components/layout/site-header'; // ADDED
import { SiteFooter } from '@/components/layout/site-footer'; // ADDED
// SiteHeader and SiteFooter will be rendered by ConditionalLayoutWrapper
import { AudioPlayerContainer } from '@/components/features/audio-player/AudioPlayerContainer'; // ADDED new player import
import { PostHogProvider } from '@/components/providers/PostHogProvider'; // Based on rules
import { Toaster } from '@/components/ui/sonner'; // Import Toaster
import { ThemeProvider } from '@/components/providers/theme-provider'; // Added ThemeProvider import
import { TooltipProvider } from "@/components/ui/tooltip"; // Import TooltipProvider
import { ConditionalLayoutWrapper } from '@/components/layout/ConditionalLayoutWrapper'; // Import the new wrapper
import { GlobalSearchModal } from '@/components/features/search/GlobalSearchModal'; // <-- Import GlobalSearchModal
import { TailwindIndicator } from "@/components/theme/tailwind-indicator";
import { Breadcrumbs } from "@/components/ui/breadcrumbs"; // Import Breadcrumbs

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
         variables: { colorPrimary: '#00E0FF' }, // Updated to cyan-glow
         elements: {
           userButtonPopoverCard: "bg-gray-900 border-gray-700", // These could also use our theme's neutral colors
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
            defaultTheme="system"
            enableSystem={true}
            disableTransitionOnChange
          >
            <PostHogProvider>
              <TooltipProvider>
                <div className="relative flex min-h-screen flex-col">
                  <ConditionalLayoutWrapper>
                    {/* <SiteHeader /> */}
                    <main className="flex-1">
                      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
                        <Breadcrumbs /> {/* Add Breadcrumbs here */}
                      </div>
                      {children}
                    </main>
                    {/* <SiteFooter /> */}
                  </ConditionalLayoutWrapper>
                  <AudioPlayerContainer />
                  <GlobalSearchModal /> {/* <-- Render GlobalSearchModal here */}
                </div>
              </TooltipProvider>
              <Toaster 
                position="top-right" 
                richColors 
                theme="dark" 
                closeButton 
              />
              <TailwindIndicator />
            </PostHogProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
} 