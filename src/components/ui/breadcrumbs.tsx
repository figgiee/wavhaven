'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Import usePathname
import { ChevronRight, Home } from 'lucide-react'; // Icon for separator and optional Home icon
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent?: boolean; // Optional: to style the last item differently
}

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[]; // Make items optional
  className?: string;
  includeHome?: boolean; // Option to prepend a Home link
  // Transformer function for labels if needed, e.g., to look up titles
  labelTransformer?: (segment: string) => string; 
}

// Helper to capitalize first letter
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Breadcrumbs({ items: propItems, className, includeHome = true, labelTransformer }: BreadcrumbsProps) {
  const pathname = usePathname();

  const generateBreadcrumbsFromPath = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(segment => segment);
    const breadcrumbs: BreadcrumbItem[] = [];

    if (includeHome) {
      breadcrumbs.push({ label: 'Home', href: '/' });
    }

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = labelTransformer ? labelTransformer(segment) : capitalize(segment.replace(/-/g, ' '));
      breadcrumbs.push({
        label,
        href: currentPath,
        isCurrent: index === pathSegments.length - 1,
      });
    });
    return breadcrumbs;
  };

  const itemsToRender = propItems && propItems.length > 0 ? propItems : generateBreadcrumbsFromPath();

  if (!itemsToRender || itemsToRender.length === 0) {
    return null;
  }
  // If only "Home" is present and it's the current page, don't render breadcrumbs (unless it's explicitly passed)
  if (!propItems && itemsToRender.length === 1 && itemsToRender[0].label === 'Home' && pathname === '/') {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-neutral-500 py-2", className)}>
      <ol className="flex items-center space-x-1 sm:space-x-1.5">
        {itemsToRender.map((item, index) => (
          <li key={item.href + '-' + item.label + '-' + index} className="flex items-center">
            {index > 0 && (
              <ChevronRight size={14} className="mx-1 sm:mx-1.5 text-neutral-600 flex-shrink-0" />
            )}
            {/* Optional: Render Home icon for the first item if it's Home */}
            {index === 0 && item.label === 'Home' && includeHome && (
                <Home size={14} className="mr-1.5 text-neutral-500 flex-shrink-0" />
            )}
            {item.isCurrent || index === itemsToRender.length - 1 ? (
              <span className="font-medium text-neutral-300 truncate" aria-current="page" title={item.label}>
                {item.label}
              </span>
            ) : (
              <Link 
                href={item.href}
                className="hover:text-cyan-glow hover:underline transition-colors truncate" title={item.label}
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
} 