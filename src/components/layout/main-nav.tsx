'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Example navigation items - replace with your actual nav structure
const mainNavItems = [
  { href: '/explore?type=beat', label: 'Explore Beats' },
  { href: '/explore?type=soundkit', label: 'Sound Kits' },
  { href: '/blog', label: 'Blog' },
  // { href: '/producers', label: 'Producers' }, // Example of a commented out link
];

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

function NavLink({ href, children, className }: NavLinkProps) {
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
                className
            )}
            aria-current={isActive ? 'page' : undefined}
        >
            {children}
        </Link>
    );
}

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("hidden md:flex items-center gap-5 text-sm font-medium", className)}
      {...props}
    >
      {mainNavItems.map((item) => (
        <NavLink key={item.href} href={item.href}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
} 