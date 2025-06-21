import React from 'react';
import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { UserButton, SignInButton, SignUpButton } from '@clerk/nextjs';

export default async function Header() {
  const user = await currentUser(); // Clerk user object

  return (
    <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex items-center justify-between p-4 mx-auto h-16">
        {/* Left Side: Logo/Brand */} 
        <Link href="/" className="font-bold text-lg">
          Wavhaven
        </Link>

        {/* Center: Navigation Links - Show extra links if user is logged in */} 
        <div className="hidden md:flex gap-6 items-center">
          <Link href="/browse" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Browse</Link>
          
          {/* Links for Authenticated Users */} 
          {user && (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/upload" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Upload</Link>
              <Link href="/downloads" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">My Downloads</Link>
            </>
          )}
        </div>

        {/* Right Side: Cart & Auth */} 
        <div className="flex items-center gap-4">
          {/* Cart Icon/Link - TODO: Implement later */}
          
          {user ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <>
              <SignInButton mode="modal">
                 <span className="text-sm font-medium cursor-pointer hover:text-primary transition-colors">Sign In</span>
              </SignInButton>
              <SignUpButton mode="modal">
                 <span className="text-sm font-medium cursor-pointer hover:text-primary transition-colors">Sign Up</span>
              </SignUpButton>
            </>
          )}
        </div>
      </nav>
    </header>
  );
} 