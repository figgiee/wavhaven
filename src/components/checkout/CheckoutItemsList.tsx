'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/stores/useCartStore'; // Keep for type definition
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatPrice } from '@/lib/utils';

// Get the specific type for a single cart item from the store
type CartItem = ReturnType<typeof useCartStore.getState>['items'][number];

interface CheckoutItemsListProps {
  items: CartItem[];
}

export function CheckoutItemsList({ items }: CheckoutItemsListProps) {
  if (!items || items.length === 0) {
    return <p className="text-muted-foreground text-sm">No items in cart.</p>;
  }

  return (
    // Use ScrollArea in case of many items, limit height
    <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-muted/30">
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.licenseId} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/track/${item.trackId}`} className="flex-shrink-0" tabIndex={-1}> 
                <Image
                  src={item.imageUrl || '/coverart/default-cover.png'}
                  alt={item.trackTitle ?? 'Track cover'}
                  width={40} // Smaller image for checkout
                  height={40}
                  className="rounded-sm object-cover aspect-square border border-border/50"
                />
              </Link>
              <div className="flex-grow">
                 <Link href={`/track/${item.trackId}`} className="hover:text-primary transition-colors text-sm font-medium leading-tight line-clamp-1">
                    {item.trackTitle}
                 </Link>
                <p className="text-xs text-muted-foreground">{item.licenseName}</p>
              </div>
            </div>
            <p className="text-sm font-medium text-foreground flex-shrink-0 ml-4">
              {formatPrice(item.price / 100)}
            </p>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
} 