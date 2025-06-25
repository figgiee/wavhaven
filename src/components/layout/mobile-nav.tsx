'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X, Menu } from 'lucide-react'; // Icons for menu toggle
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';

// Example navigation items - replace with your actual nav structure
const mobileNavItems = [
  { href: '/', label: 'Home' },
  { href: '/explore?type=beat', label: 'Explore Beats' },
  { href: '/explore?type=soundkit', label: 'Sound Kits' },
  { href: '/blog', label: 'Blog' },
  { href: '/upload', label: 'Upload Your Music' },
  { href: '/dashboard', label: 'Dashboard' }, // Example user-specific link
];

interface MobileNavProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function MobileNav({ isOpen, setIsOpen }: MobileNavProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Close mobile menu on route change
    setIsOpen(false);
  }, [pathname, setIsOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* The SheetTrigger is usually handled by a button in SiteHeader, so it might not be needed here directly 
          but including a conceptual one if this component were to manage its own trigger. 
          In the current SiteHeader setup, SiteHeader controls isOpen state. */}
      {/* 
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger> 
      */}
      <SheetContent side="left" className="w-full max-w-xs sm:max-w-sm p-0 bg-background border-r border-neutral-800">
        <SheetHeader className="p-6 border-b border-neutral-800">
          <SheetTitle>
            <Link href="/" onClick={() => setIsOpen(false)} className="focus:outline-none focus:ring-2 focus:ring-cyan-glow/50 rounded-sm">
              <Logo 
                width={72} 
                height={40} 
                showText={false}
                hoverEffect="subtle-glow"
              />
            </Link>
          </SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-cyan-glow">
            <X size={24} />
            <span className="sr-only">Close menu</span>
          </Button>
        </SheetHeader>
        <nav className="flex flex-col space-y-2 p-6">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "block px-3 py-2.5 rounded-md text-base font-medium transition-colors",
                  isActive
                    ? "text-cyan-glow bg-cyan-glow/10"
                    : "text-neutral-200 hover:text-cyan-glow hover:bg-neutral-800"
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {/* Optional: Add Sign In/Sign Up or User Profile links here based on auth state */}
      </SheetContent>
    </Sheet>
  );
} 