'use client';

import React, { useState, useTransition, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/stores/useCartStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatPrice } from '@/lib/utils';
import { ShoppingCart, Trash2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { usePostHog } from 'posthog-js/react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { createCheckoutSession } from '@/lib/actions/checkoutActions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CartDropdown() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const itemCount = items.length;
  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price, 0);
  }, [items]);
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const posthogClient = usePostHog();
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);

  const dropdownVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2, ease: 'easeOut' } },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: 'easeIn' } },
  };

  const closeMenu = useCallback(() => { setIsOpen(false); }, []);
  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);
  const handleMouseEnter = useCallback(() => { clearTimer(); setIsOpen(true); }, [clearTimer]);
  const handleMouseLeave = useCallback(() => { timerRef.current = setTimeout(closeMenu, 200); }, [closeMenu]);

  const handleCheckout = async () => {
    console.log('[handleCheckout] Triggered (for Embedded Checkout)');
    if (items.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    console.log('[handleCheckout] Checking Clerk state:', { isLoaded, isSignedIn });
    if (!isLoaded) {
      console.log('[handleCheckout] Clerk not loaded yet.');
      toast.info("Authentication check in progress...");
      return;
    }
    if (!isSignedIn) {
      console.log('[handleCheckout] User NOT signed in. Redirecting to sign-in.');
      toast.error('Please sign in to proceed to checkout.');
      router.push('/sign-in');
      return;
    }

    console.log('[handleCheckout] User IS signed in. Proceeding to call Server Action...');
    setIsLoading(true);
    posthogClient?.capture('checkout_started', { itemCount: items.length, totalAmount: total });

    const licenseIds = items.map((item) => item.licenseId);
    console.log('[handleCheckout] Calling createCheckoutSession Server Action with items:', licenseIds);

    try {
      const result = await createCheckoutSession(licenseIds);

      if (result?.error) {
          console.error('[handleCheckout] Server Action returned explicit error:', result.error);
          toast.error(`Checkout failed: ${result.error}`);
      } else if (result?.clientSecret) {
          console.log('[handleCheckout] Received clientSecret. Opening embedded checkout.');
          setClientSecret(result.clientSecret);
          setShowCheckoutDialog(true);
          setIsOpen(false);
      } else {
          console.error('[handleCheckout] Server Action returned unexpected result:', result);
          toast.error('Checkout failed: Could not initialize payment form.');
      }

    } catch (error: any) {
        console.error('[handleCheckout] Caught error during Server Action call:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        toast.error(`Checkout failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setShowCheckoutDialog(false);
      setClientSecret(null);
    }
  };

  return (
    <>
      <div
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Link href="/cart" aria-label="View shopping cart page">
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative rounded-full text-neutral-300 hover:text-cyan-glow focus-visible:ring-cyan-glow" 
            asChild
          >
            <div>
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-glow text-xs font-bold text-abyss-blue">
                  {itemCount}
                </span>
              )}
              <span className="sr-only">Open Cart</span>
            </div>
          </Button>
        </Link>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="cart-content"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={dropdownVariants}
              className="absolute top-full right-0 mt-2 w-80 rounded-xl border border-neutral-700/50 bg-neutral-900/80 p-0 text-neutral-100 shadow-xl backdrop-blur-md z-50 outline-none overflow-hidden"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <ShoppingCart className="h-10 w-10 text-neutral-500" />
                  <p className="text-sm text-neutral-300">Your shopping cart is currently empty.</p>
                  <Button asChild variant="link" className="text-cyan-glow hover:text-cyan-glow/80 p-0 h-auto text-sm">
                    <Link href="/explore">Start Browsing</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="p-4 border-b border-neutral-700/50">
                    <h3 className="text-lg font-semibold text-neutral-100">Shopping Cart ({itemCount})</h3>
                  </div>
                  <ScrollArea className="h-[250px] px-4">
                    <div className="flex flex-col gap-3 py-2 pr-2">
                      {items.map((item) => (
                        <div key={item.licenseId} className="flex items-center gap-3 group">
                          <Avatar className="h-12 w-12 rounded border border-neutral-700/50 flex-shrink-0">
                            <AvatarImage src={item.imageUrl ?? '/placeholder-track.jpg'} alt={item.trackTitle} className="object-cover" />
                            <AvatarFallback className="bg-neutral-700 text-neutral-100">
                              {item.trackTitle?.charAt(0)?.toUpperCase() ?? ' '}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <Link href={`/track/${item.slug || item.trackId}`} className="block group/link">
                              <p className="truncate font-medium text-sm text-neutral-100 hover:text-cyan-glow transition-colors">{item.trackTitle}</p>
                            </Link>
                            <p className="text-xs text-neutral-400 truncate">{item.producerName ?? 'Unknown Artist'} - {item.licenseName}</p>
                            <p className="text-sm font-semibold text-cyan-glow">{formatPrice(item.price / 100)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-neutral-500 hover:text-magenta-spark hover:bg-magenta-spark/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log(`[CartDropdown] Remove button clicked for track: ${item.trackId}, license: ${item.licenseId}`);
                              removeItem(item.trackId, item.licenseId);
                              toast.info(`"${item.trackTitle}" removed.`);
                            }}
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Remove {item.trackTitle}</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="border-t border-neutral-700/50 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-base font-medium text-neutral-100">Total</span>
                      <span className="text-lg font-semibold text-cyan-glow">{formatPrice(total / 100)}</span>
                    </div>
                    <Button
                      className="w-full bg-cyan-glow text-abyss-blue hover:bg-cyan-glow/90 active:bg-cyan-glow/80 shadow-glow-cyan-sm font-semibold"
                      onClick={handleCheckout}
                      disabled={isLoading || !isLoaded}
                    >
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {!isLoaded ? 'Loading Auth...' : isLoading ? 'Processing...' : 'Checkout'}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={showCheckoutDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[800px] bg-neutral-900/80 backdrop-blur-md border-neutral-700/60 text-neutral-100 rounded-xl shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-neutral-700/50">
            <DialogTitle className="text-xl font-semibold text-cyan-glow">Complete Your Purchase</DialogTitle>
            <DialogDescription className="text-neutral-400 mt-1">
              Please enter your payment details below.
            </DialogDescription>
          </DialogHeader>
          <div id="checkout" className="p-4 sm:p-6 min-h-[300px]">
            {clientSecret && stripePromise && (
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{clientSecret}}
              >
                <EmbeddedCheckout className="stripe-checkout-override" />
              </EmbeddedCheckoutProvider>
            )}
            {!clientSecret && 
              <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p>Loading payment form...</p>
              </div>
            }
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 