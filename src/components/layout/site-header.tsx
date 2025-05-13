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
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import CartDropdown from '@/components/features/cart/CartDropdown';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useAuth, useUser } from "@clerk/nextjs";
import { useUIStore } from '@/stores/use-ui-store';
import { ThemeToggleDropdown } from '@/components/theme/theme-toggle-dropdown';
import { GlobalSearchInput } from '@/components/features/search/global-search-input';
import { MainNav } from "./main-nav";
import { MobileNav } from "./mobile-nav";
import { sharedClerkAppearance } from "@/lib/clerk-appearance";

// Reusable NavLink component for main navigation
function NavLink({ href, children, className }: { href: string; children: React.ReactNode, className?: string }) {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

    return (
        <Link
            href={href}
            className={cn(
                "nav-button text-sm font-medium transition-colors px-3 py-2 rounded-md",
                isActive
                    ? "text-cyan-glow bg-cyan-glow/10"
                    : "text-neutral-300 hover:text-cyan-glow hover:bg-cyan-glow/10",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/50",
                className
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
        <Link 
            href="/" 
            className={cn(
                "flex items-center gap-2.5 group mr-4 space-x-2 rounded-sm",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/50"
            )}
            aria-label="Wavhaven Home"
        >
            <div className="relative w-7 h-7 flex items-center justify-center">
                <div className="sound-wave-container absolute inset-0 flex items-center justify-between px-0.5">
                    <div className="sound-bar w-[3px] h-[50%] bg-gradient-to-b from-cyan-glow to-magenta-spark rounded-full opacity-90 group-hover:animate-pulse animation-delay-0"/>
                    <div className="sound-bar w-[3px] h-[80%] bg-gradient-to-b from-cyan-glow to-magenta-spark rounded-full opacity-90 group-hover:animate-pulse animation-delay-150"/>
                    <div className="sound-bar w-[3px] h-[100%] bg-gradient-to-b from-cyan-glow to-magenta-spark rounded-full opacity-90 group-hover:animate-pulse animation-delay-300"/>
                    <div className="sound-bar w-[3px] h-[80%] bg-gradient-to-b from-cyan-glow to-magenta-spark rounded-full opacity-90 group-hover:animate-pulse animation-delay-450"/>
                    <div className="sound-bar w-[3px] h-[50%] bg-gradient-to-b from-cyan-glow to-magenta-spark rounded-full opacity-90 group-hover:animate-pulse animation-delay-600"/>
                </div>
            </div>
            <span className="text-xl font-semibold tracking-wider text-neutral-100 group-hover:text-cyan-glow transition-colors">WAVHAVEN</span>
        </Link>
    );
}

export function SiteHeader() {
    const { isSignedIn } = useUser();
    const { openSearchModal } = useUIStore();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const headerClasses = cn(
        "sticky top-0 z-50 w-full transition-all duration-200 ease-in-out",
        isScrolled ? "border-b border-neutral-700/80 bg-background/80 backdrop-blur-lg shadow-md" : "bg-transparent border-b border-transparent"
    );

    return (
        <>
            <header className={headerClasses}>
                <div className="max-w-screen-xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center">
                        {/* <Link href="/" className="mr-4 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-cyan-glow/50 rounded-sm" aria-label="Wavhaven Home"> */}
                            <AnimatedLogo />
                        {/* </Link> */}
                        {/* Desktop Navigation - hidden on small screens */}
                        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-neutral-300">
                            <NavLink href="/explore">Explore</NavLink>
                            <NavLink href="/upload">Upload</NavLink>
                            <NavLink href="/dashboard">Dashboard</NavLink>
                        </nav>
                    </div>

                    {/* Desktop Search Input - Centered and takes available space on medium+ screens */}
                    <div className="hidden md:flex flex-1 justify-center px-4">
                        <GlobalSearchInput className="w-full" />
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Mobile Search Button - only on small screens */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={openSearchModal} 
                                    className="md:hidden text-neutral-300 hover:text-cyan-glow hover:bg-cyan-glow/10 rounded-full w-9 h-9"
                                    aria-label="Open search"
                                >
                                    <Search size={20} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-200">
                                <p>Search</p>
                            </TooltipContent>
                        </Tooltip>
                        
                        <ThemeToggleDropdown />

                        {hasMounted && (
                            <SignedOut>
                                <Button variant="outline" size="sm" asChild className="border-neutral-600 hover:border-cyan-glow hover:text-cyan-glow text-neutral-300">
                                    <Link href="/sign-in">Sign In</Link>
                                </Button>
                                <Button variant="default" size="sm" asChild className="bg-cyan-glow text-abyss-blue hover:bg-cyan-glow/80 shadow-glow-cyan-sm">
                                    <Link href="/sign-up">Sign Up</Link>
                                </Button>
                            </SignedOut>
                        )}
                        {hasMounted && (
                            <SignedIn>
                                <UserButton 
                                    afterSignOutUrl="/" 
                                    appearance={sharedClerkAppearance}
                                />
                            </SignedIn>
                        )}
                        <CartDropdown />
                        
                        {/* Mobile Menu Button - only on small screens */}
                        <div className="md:hidden"> 
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                                className="text-neutral-300 hover:text-cyan-glow"
                                aria-expanded={isMobileMenuOpen}
                                aria-controls="mobile-menu-content"
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </header>
            {/* Mobile Navigation Menu - Rendered outside the main header flow */}
            <MobileNav isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} id="mobile-menu-content" />
        </>
    );
} 