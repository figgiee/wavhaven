'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { 
    ChevronDown, 
    Search, 
    ShoppingCart, 
    Menu, 
    X, 
    Upload, 
    LayoutDashboard, 
    User, 
    Settings, 
    Heart, 
    Download, 
    LogOut, 
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
    Popover, 
    PopoverContent, 
    PopoverTrigger 
} from "@/components/ui/popover";
import { 
    HoverCard, 
    HoverCardContent, 
    HoverCardTrigger 
} from "@/components/ui/hover-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import CartDropdown from '@/components/features/cart/CartDropdown';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MainNav } from "@/components/layout/main-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ModeToggle } from "@/components/shared/mode-toggle";
import GlobalSearch from '@/components/features/search/GlobalSearch';
import { useAuth } from "@clerk/nextjs";

// Reusable NavLink component for main navigation
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link
            href={href}
            className={cn(
                "font-rubik nav-button text-sm font-medium transition-colors",
                isActive
                    ? "text-primary font-semibold" // Use text-primary for active
                    : "text-muted-foreground hover:text-foreground" // Use themed colors
            )}
            aria-current={isActive ? 'page' : undefined}
        >
            {children}
        </Link>
    );
}

// Reusable component for the animated logo
export function AnimatedLogo() {
    return (
        <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-7 h-7 flex items-center justify-center">
                <div className="sound-wave-container absolute inset-0 flex items-center justify-between px-0.5">
                    {/* Apply animation via CSS or Framer Motion if needed, simplified here */}
                    <div className="sound-bar w-[2px] h-[60%] bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full opacity-80 group-hover:animate-pulse"/>
                    <div className="sound-bar w-[2px] h-[90%] bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full opacity-80 group-hover:animate-pulse animation-delay-200"/>
                    <div className="sound-bar w-[2px] h-[100%] bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full opacity-80 group-hover:animate-pulse animation-delay-400"/>
                    <div className="sound-bar w-[2px] h-[90%] bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full opacity-80 group-hover:animate-pulse animation-delay-600"/>
                    <div className="sound-bar w-[2px] h-[60%] bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full opacity-80 group-hover:animate-pulse animation-delay-800"/>
                </div>
            </div>
            <span className="text-lg font-light tracking-[0.1em] text-foreground">wavhaven</span>
        </Link>
    );
}

export function SiteHeader() {
    const { isSignedIn } = useAuth();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    // State to track component mount status for hydration safety
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        // This effect runs only on the client, after initial mount
        setHasMounted(true);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // ESC key listener effect for search overlay
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsSearchOpen(false);
            }
        };

        if (isSearchOpen) {
            document.addEventListener('keydown', handleKeyDown);
        } else {
            document.removeEventListener('keydown', handleKeyDown);
        }

        // Cleanup listener on component unmount or when search closes
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isSearchOpen]); // Re-run effect when isSearchOpen changes

    return (
        <TooltipProvider delayDuration={100}>
            <header 
                className={cn(
                    "site-header fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                    isScrolled || isSearchOpen 
                        ? "bg-background/80 backdrop-blur-xl border-b border-border"
                        : "bg-transparent border-b border-transparent"
                )}
            >
                <div className="header-container max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="header-nav flex items-center justify-between h-20">
                        {/* Left Section: Logo & Main Nav */}
                        <div className="flex items-center gap-8">
                            <AnimatedLogo />

                            {/* Desktop Navigation Links */}
                            <div className="nav-links hidden md:flex items-center gap-8">
                                 {/* Explore Dropdown */} 
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="font-rubik nav-button flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 hover:bg-accent">
                                            <span>Explore</span>
                                            <ChevronDown size={16} className="ml-1" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-popover border-border text-popover-foreground w-48">
                                        <DropdownMenuItem className="p-0 focus:bg-accent focus:text-accent-foreground">
                                            <Link href="/explore?type=beat" className="block px-2 py-1.5 w-full h-full">Beats</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="p-0 focus:bg-accent focus:text-accent-foreground">
                                            <Link href="/explore?type=loop" className="block px-2 py-1.5 w-full h-full">Loops</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="p-0 focus:bg-accent focus:text-accent-foreground">
                                            <Link href="/explore?type=soundkit" className="block px-2 py-1.5 w-full h-full">Soundkits</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="p-0 focus:bg-accent focus:text-accent-foreground">
                                            <Link href="/explore?type=preset" className="block px-2 py-1.5 w-full h-full">Presets</Link>
                                        </DropdownMenuItem>
                                         <DropdownMenuSeparator className="bg-border" />
                                        <DropdownMenuItem className="p-0 focus:bg-accent focus:text-accent-foreground">
                                             <Link href="/trending" className="block px-2 py-1.5 w-full h-full">Trending</Link> 
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {hasMounted && (
                                    <SignedIn>
                                        <NavLink href="/upload">Upload</NavLink>
                                        <NavLink href="/dashboard">Dashboard</NavLink>
                                    </SignedIn>
                                )}
                            </div>
                        </div>

                        {/* Right Section: Search, Auth, Theme Toggle and Cart */}
                        <div className="header-actions flex items-center gap-4">
                            <Button 
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                className="icon-button hidden md:flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                                aria-label="Open search"
                            >
                                <Search size={20} />
                            </Button>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <ThemeToggle />
                                </TooltipTrigger>
                                <TooltipContent 
                                    className="bg-popover border-border text-popover-foreground text-xs"
                                >
                                    <p>Toggle theme</p>
                                </TooltipContent>
                            </Tooltip>

                            {hasMounted && (
                                <SignedIn>
                                    <UserButton 
                                        afterSignOutUrl="/" 
                                        appearance={{
                                             elements: {
                                                 userButtonAvatarBox: "w-8 h-8",
                                                 userButtonPopoverCard: "!bg-popover !border-border",
                                                 userButtonPopoverActions: "!text-popover-foreground",
                                                 userButtonPopoverActionButton: "hover:!bg-accent",
                                                 userButtonPopoverActionButton__manageAccount: "text-muted-foreground hover:!text-foreground",
                                                 userButtonPopoverActionButton__signOut: "!text-destructive hover:!text-destructive/90 focus:!bg-destructive/10",
                                             }
                                         }}
                                     />
                                </SignedIn>
                            )}
                            {hasMounted && (
                                <SignedOut>
                                    {/* Add Sign In and Sign Up buttons */}
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href="/sign-in">Sign In</Link>
                                        </Button>
                                        <Button variant="default" size="sm" asChild>
                                            <Link href="/sign-up">Sign Up</Link>
                                        </Button>
                                    </div>
                                </SignedOut>
                            )}
                            
                            {/* Render CartDropdown directly */}
                                    <CartDropdown />

                            {/* Mobile Menu Button & Sheet */} 
                             <Sheet>
                                 <SheetTrigger asChild>
                                     <Button variant="ghost" size="icon" className="mobile-menu-button md:hidden flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                                         <Menu size={22}/>
                                         <span className="sr-only">Open menu</span>
                                     </Button>
                                 </SheetTrigger>
                                 <SheetContent side="left" className="mobile-sheet w-full sm:max-w-xs p-0 flex flex-col">
                                     <SheetHeader className="p-4 border-b border-border">
                                         <SheetTitle className="text-left">
                                            <AnimatedLogo />
                                         </SheetTitle>
                                     </SheetHeader>
                                     <nav className="flex flex-col p-4 gap-4 flex-1">
                                        {/* Example: Mobile Explore Links */}
                                        <Link href="/explore?type=beat" className="mobile-nav-link">Beats</Link>
                                        <Link href="/explore?type=loop" className="mobile-nav-link">Loops</Link>
                                        <Link href="/explore?type=soundkit" className="mobile-nav-link">Soundkits</Link>
                                        <Link href="/explore?type=preset" className="mobile-nav-link">Presets</Link>
                                        <Link href="/trending" className="mobile-nav-link">Trending</Link>

                                        {hasMounted && (
                                            <SignedIn>
                                                {/* Mobile versions of Upload, Dashboard, etc. */}
                                                <Link href="/upload" className="mobile-nav-link">Upload</Link>
                                                <Link href="/dashboard" className="mobile-nav-link">Dashboard</Link>
                                                {/* Add other SignedIn links needed for mobile */} 
                                            </SignedIn>
                                        )}
                                     </nav>
                                     <div className="mt-auto p-4 border-t border-border">
                                        {hasMounted && (
                                            <SignedOut>
                                                {/* Mobile Sign In / Sign Up */} 
                                                <div className="flex flex-col gap-2">
                                                    <Button variant="outline" asChild><Link href="/sign-in">Sign In</Link></Button>
                                                    <Button variant="default" asChild><Link href="/sign-up">Sign Up</Link></Button>
                                                </div>
                                            </SignedOut>
                                        )}
                                        {hasMounted && (
                                            <SignedIn>
                                                {/* Optionally add mobile User management or Sign Out here */}
                                            </SignedIn>
                                        )}
                                    </div>
                                 </SheetContent>
                             </Sheet>
                        </div>
                    </nav>
                </div>

                {/* Search Bar Overlay Container with Transitions */}
                <div
                    className={cn(
                        "search-overlay-container absolute top-full left-0 right-0 z-40",
                        "transition-all duration-300 ease-in-out", // Base transition
                        isSearchOpen
                            ? "opacity-100 visible translate-y-0" // Open state
                            : "opacity-0 invisible -translate-y-2" // Closed state
                    )}
                    aria-hidden={!isSearchOpen}
                >
                    {/* Search Bar Content */}
                    <div
                        className="search-bar bg-background/95 backdrop-blur-lg border-b border-border shadow-lg"
                    >
                        <div className="search-container max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                             {/* TODO: Convert search form with category select */}
                            <form action="/explore" method="GET" className="relative flex items-center gap-2">
                                 <Input
                                    type="search"
                                    name="q"
                                    placeholder="Search beats, loops, soundkits..."
                                    className="flex-1 h-12 px-5 rounded-lg placeholder-muted-foreground focus:ring-ring border-input"
                                 />
                                <Button type="submit" size="icon" variant="ghost" className="absolute right-14 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                                    <Search size={20} />
                                </Button>
                                {/* Close button */}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsSearchOpen(false)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-accent"
                                    aria-label="Close search"
                                >
                                    <X size={22} />
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </header>
        </TooltipProvider>
    );
} 