'use client';

import React from 'react';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/lib/utils';

interface CheckoutOrderSummaryProps {
  itemCount: number;
  subtotal: number; // Expect price in cents
  // Add props for discounts, taxes, shipping if needed later
}

export function CheckoutOrderSummary({ itemCount, subtotal }: CheckoutOrderSummaryProps) {
  const total = subtotal; // Add taxes, shipping etc. here later if needed

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
      <h2 className="text-lg font-semibold mb-4 text-foreground">Order Summary</h2>
      <Separator className="mb-4 bg-border/50" />
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
          <span>{formatPrice(subtotal / 100)}</span>
        </div>
        {/* Placeholder for future additions */}
        {/* <div className="flex justify-between text-sm text-muted-foreground">
          <span>Taxes</span>
          <span>Calculated at next step</span>
        </div> */}
        {/* <div className="flex justify-between text-sm text-muted-foreground">
          <span>Shipping</span>
          <span>Calculated at next step</span>
        </div> */}
        <Separator className="my-2 bg-border/50"/>
        <div className="flex justify-between font-semibold text-base text-foreground">
          <span>Order total</span>
          <span>{formatPrice(total / 100)}</span>
        </div>
      </div>
      {/* Button will be outside this component on the checkout page */}
    </div>
  );
} 