'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/stores/useCartStore';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area'; // If needed for long lists
import { X, ShoppingCart as ShoppingCartIcon, Loader2 } from 'lucide-react'; // Renamed to avoid conflict
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { createCheckoutSession } from '@/lib/actions/checkoutActions';
import { usePostHog } from 'posthog-js/react';
// Import Dialog components for checkout if using the same embedded checkout as dropdown
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function CartClientContent() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const itemCount = items.length;
  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price, 0);
  }, [items]);

  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const posthogClient = usePostHog();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);

  const handleRemoveItem = (trackId: string, licenseId: string, trackTitle: string) => {
    removeItem(trackId, licenseId);
    toast.info(`"${trackTitle}" removed from cart.`);
  };

  const handleCheckout = async () => {
    if (itemCount === 0) {
      toast.error('Your cart is empty.');
      return;
    }
    if (!isLoaded) {
      toast.info("Authentication check in progress...");
      return;
    }
    if (!isSignedIn) {
      toast.error('Please sign in to proceed to checkout.');
      router.push('/sign-in');
      return;
    }

    setIsCheckoutLoading(true);
    posthogClient?.capture('checkout_started', { 
      itemCount: items.length, 
      totalAmount: total,
      source: 'cart_page' // Differentiate from dropdown checkout
    });

    const licenseIds = items.map((item) => item.licenseId);
    try {
      const result = await createCheckoutSession(licenseIds);
      if (result?.error) {
        toast.error(`Checkout failed: ${result.error}`);
      } else if (result?.clientSecret) {
        setClientSecret(result.clientSecret);
        setShowCheckoutDialog(true);
      } else {
        toast.error('Checkout failed: Could not initialize payment form.');
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast.error(`Checkout failed: ${errorMessage}`);
    } finally {
      setIsCheckoutLoading(false);
    }
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setShowCheckoutDialog(false);
      setClientSecret(null);
    }
  };

  if (itemCount === 0) {
    return (
      <div className="text-center py-20 border border-dashed rounded-md">
        <ShoppingCartIcon className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
        <p className="text-xl font-semibold text-foreground mb-2">Your cart is empty.</p>
        <p className="text-muted-foreground mb-6">Looks like you haven't added any beats yet.</p>
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/explore">Browse Beats</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      {/* Cart Items Section */}
      <div className="lg:col-span-2 space-y-6">
        <ul className="space-y-6">
          {items.map((item) => (
            <li key={item.licenseId} className="flex items-start justify-between border-b border-border pb-6 last:border-b-0 last:pb-0">
              <div className="flex items-start gap-4">
                <Link href={`/track/${item.trackId}`} className="flex-shrink-0">
                  <Image
                    src={item.imageUrl || '/coverart/default-cover.png'}
                    alt={item.trackTitle ?? 'Track cover'}
                    width={80} // Larger image for cart page
                    height={80}
                    className="rounded-md object-cover aspect-square border border-border hover:opacity-80 transition-opacity"
                  />
                </Link>
                <div className="flex-grow pt-1">
                  <Link href={`/track/${item.trackId}`} className="hover:text-primary transition-colors">
                    <h3 className="font-semibold leading-snug text-foreground text-lg">{item.trackTitle}</h3>
                  </Link>
                  <p className="text-sm text-muted-foreground">by {item.producerName || 'Unknown Artist'}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">License: {item.licenseName}</p>
                  <p className="text-md font-semibold text-primary mt-1">{formatPrice(item.price / 100)}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="ml-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0 mt-1"
                onClick={() => handleRemoveItem(item.trackId, item.licenseId, item.trackTitle)}
                aria-label={`Remove ${item.trackTitle} - ${item.licenseName}`}
              >
                <X className="h-5 w-5" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {/* Order Summary Section */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 bg-card p-6 rounded-lg shadow-md border border-border">
          <h2 className="text-xl font-semibold mb-1 text-foreground">Order Summary</h2>
          <p className="text-sm text-muted-foreground mb-5">Review your order and proceed to payment.</p>
          <Separator className="mb-6 bg-border" />
          <div className="space-y-3">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
              <span>{formatPrice(total / 100)}</span>
            </div>
            {/* Placeholder for discounts/taxes if needed */}
            {/* <div className="flex justify-between text-muted-foreground">
              <span>Discount</span>
              <span className="text-green-500">-$0.00</span>
            </div> */}
            <Separator className="bg-border"/>
            <div className="flex justify-between font-semibold text-lg text-foreground">
              <span>Total</span>
              <span>{formatPrice(total / 100)}</span>
            </div>
            <Button 
              className="w-full bg-primary text-primary-foreground py-3 text-base mt-4 hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50 shadow-md"
              onClick={handleCheckout}
              disabled={isCheckoutLoading || !isLoaded}
            >
              {isCheckoutLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {!isLoaded ? 'Auth Loading...' : isCheckoutLoading ? 'Processing...' : 'Proceed to Secure Checkout'}
            </Button>
            <p className="text-xs text-muted-foreground text-center pt-2">
              Secure checkout powered by Stripe.
            </p>
          </div>
        </div>
      </div>

      {/* Checkout Dialog (same as in CartDropdown) */}
      <Dialog open={showCheckoutDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[800px] bg-neutral-900/95 backdrop-blur-lg border-neutral-700 text-neutral-100 rounded-xl shadow-2xl p-0">
          <DialogHeader className="p-6 pb-4 border-b border-neutral-700">
            <DialogTitle className="text-xl font-semibold text-primary">Complete Your Purchase</DialogTitle>
            <DialogDescription className="text-neutral-400 mt-1">
              Please enter your payment details below.
            </DialogDescription>
          </DialogHeader>
          <div id="checkout" className="p-6 min-h-[350px]">
            {clientSecret && stripePromise && (
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{clientSecret}}
              >
                <EmbeddedCheckout className="stripe-checkout-override" />
              </EmbeddedCheckoutProvider>
            )}
            {!clientSecret && 
              <div className="flex flex-col items-center justify-center h-full text-neutral-500 pt-10">
                <Loader2 className="h-10 w-10 animate-spin mb-4" />
                <p className="text-lg">Loading payment form...</p>
              </div>
            }
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 