'use client';

import React, { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from "@clerk/nextjs";
import { useCartStore } from '@/stores/use-cart-store';
import { createCheckoutSession } from '@/server-actions/stripeActions';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Loader2, ShoppingCartIcon, Music, AlertTriangle } from 'lucide-react';
import { formatPrice, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { z } from 'zod';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';

const emailSchema = z.string().email({ message: "Invalid email address" });

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function CartView() {
  const { isSignedIn } = useAuth();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const [isPending, startTransition] = useTransition();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showGuestEmailDialog, setShowGuestEmailDialog] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestEmailError, setGuestEmailError] = useState<string | null>(null);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);

  const totalPrice = items.reduce((total, item) => total + item.price, 0);

  const handleCheckout = () => {
    if (!isSignedIn) {
      setShowGuestEmailDialog(true);
    } else {
      processCheckout();
    }
  };

  const handleGuestEmailSubmit = () => {
    const result = emailSchema.safeParse(guestEmail);
    if (!result.success) {
      setGuestEmailError(result.error.errors[0].message);
      return;
    }
    setGuestEmailError(null);
    setShowGuestEmailDialog(false);
    processCheckout(guestEmail);
  };

  const processCheckout = (emailForGuest?: string) => {
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    setIsCheckingOut(true);
    startTransition(async () => {
      try {
        const itemsToSend = items.map(item => ({ 
            licenseId: item.licenseId,
        }));
        
        const result = await createCheckoutSession({ 
          items: itemsToSend,
          guestEmail: emailForGuest 
        });

        if (result.success && result.clientSecret) {
          setClientSecret(result.clientSecret);
          setShowCheckoutDialog(true);
        } else {
          toast.error(result.error || 'Checkout failed: Could not initialize payment.');
        }

      } catch (error) {
        console.error("Checkout process error:", error);
        toast.error('An unexpected error occurred during checkout preparation.');
      } finally {
        setIsCheckingOut(false);
      }
    });
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setShowCheckoutDialog(false);
      setClientSecret(null);
    }
  };

  return (
    <>
      <div className="min-h-[calc(100vh-var(--site-header-height,4rem))] text-neutral-100 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-glow to-magenta-spark">Shopping Cart</h1>
          <p className="text-lg text-neutral-400 text-center mb-10 sm:mb-12">Review your selected sounds and proceed to checkout.</p>

          {items.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center bg-neutral-800/30 border border-neutral-700/50 rounded-xl shadow-lg p-8">
              <ShoppingCartIcon className="w-20 h-20 text-cyan-glow/40 mb-6" strokeWidth={1.5}/>
              <h2 className="text-2xl font-semibold mb-2 text-neutral-100">Your Cart is Empty</h2>
              <p className="text-neutral-400 mb-8 max-w-sm">Looks like you haven't added any sounds yet. Explore our catalog and find your next banger!</p>
              <Button asChild variant="default" size="lg" className="bg-cyan-glow text-abyss-blue hover:bg-cyan-glow/80 shadow-glow-cyan-md font-semibold">
                <Link href="/explore">
                  <Music className="mr-2 h-5 w-5" />
                  Explore Sounds
                </Link>
              </Button>
            </div>
          ) : (
            <div className="bg-neutral-800/40 backdrop-blur-md border border-neutral-700/60 rounded-xl shadow-xl overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-neutral-700/60 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold text-neutral-100">Your Items ({items.length})</h2>
                <Button
                  variant="ghost"
                  size="sm" 
                  onClick={() => {
                    clearCart();
                    toast.info("Cart cleared!");
                  }}
                  disabled={items.length === 0 || isCheckingOut || isPending}
                  className="text-neutral-400 hover:text-magenta-spark hover:bg-magenta-spark/10 px-2.5 py-1.5 text-xs sm:text-sm rounded-md"
                  aria-label="Clear entire cart"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Clear Cart
                </Button>
              </div>

              <ScrollArea className="max-h-[calc(60vh-100px)] sm:max-h-[55vh]">
                <div className="divide-y divide-neutral-700/60">
                  {items.map((item) => (
                    <div key={item.licenseId || item.id} className="p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 hover:bg-neutral-700/30 transition-colors">
                        <div className="flex items-center gap-3 sm:gap-4 flex-grow min-w-0">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.title || 'Track Cover'}
                              width={60}
                              height={60}
                              className="rounded-md object-cover aspect-square border border-neutral-700 shadow-sm"
                            />
                          ) : (
                            <div className="w-[60px] h-[60px] bg-neutral-700/50 rounded-md flex items-center justify-center text-neutral-500 border border-neutral-600">
                              <Music className="h-7 w-7" />
                            </div>
                          )}
                          <div className="min-w-0 flex-grow">
                            <Link href={`/track/${item.trackSlug || item.id}`} className="group">
                                <p className="font-medium text-sm sm:text-base text-neutral-100 group-hover:text-cyan-glow transition-colors truncate" title={item.trackTitle || 'Unknown Track'}>{item.trackTitle || 'Unknown Track'}</p> 
                            </Link>
                            <p className="text-xs sm:text-sm text-neutral-400 truncate" title={item.producerName || 'Unknown Artist'}>By {item.producerName || 'Unknown Artist'}</p>
                            {item.licenseName && 
                              <p className="text-xs text-cyan-glow/80 mt-0.5">{item.licenseName} License</p>
                            }
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                          <span className="font-semibold w-20 text-sm sm:text-base text-right text-cyan-glow">{formatPrice(item.price)}</span>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-neutral-500 hover:text-magenta-spark hover:bg-magenta-spark/10 w-8 h-8 sm:w-9 sm:h-9 rounded-md transition-colors"
                            onClick={() => {
                              removeItem(item.trackId, item.licenseId);
                              toast.info(`${item.trackTitle || 'Item'} removed from cart.`);
                            }}
                            aria-label={`Remove ${item.trackTitle || 'item'} from cart`}
                            disabled={isCheckingOut || isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="p-5 sm:p-6 bg-neutral-800/20 border-t border-neutral-700/60">
                <div className="flex justify-between items-center mb-5">
                  <p className="text-base sm:text-lg font-medium text-neutral-200">Subtotal</p>
                  <p className="text-lg sm:text-xl font-semibold text-cyan-glow">{formatPrice(totalPrice)}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild variant="outline" className="flex-1 text-sm font-medium bg-neutral-700/50 border-neutral-600 text-neutral-200 hover:bg-neutral-700 hover:border-neutral-500 hover:text-neutral-100 shadow-sm">
                    <Link href="/explore">Continue Shopping</Link>
                  </Button>
                  <Button 
                    size="lg" 
                    className="flex-1 text-base font-semibold bg-cyan-glow text-abyss-blue hover:bg-cyan-glow/90 active:bg-cyan-glow/80 shadow-glow-cyan-sm transition-all duration-150 ease-in-out transform active:scale-95"
                    onClick={handleCheckout}
                    disabled={isCheckingOut || isPending || items.length === 0}
                  >
                    {isCheckingOut || isPending ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                    ) : (
                      'Proceed to Checkout'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showGuestEmailDialog} onOpenChange={setShowGuestEmailDialog}>
        <DialogContent className="bg-abyss-blue/95 backdrop-blur-lg border-neutral-700 text-neutral-100 shadow-xl rounded-lg">
            <DialogHeader className="mb-2">
                <DialogTitle className="text-xl font-semibold text-cyan-glow flex items-center gap-2"><AlertTriangle size={20} className="text-cyan-glow/80"/>Guest Checkout</DialogTitle>
                <DialogDescription className="text-sm text-neutral-400 pt-1">
                    Please enter your email address to proceed. Your receipt and any download links will be sent here.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
                <div>
                    <Label htmlFor="guest-email" className="text-xs text-neutral-300 mb-1.5 block">Email Address</Label>
                    <Input 
                        id="guest-email" 
                        type="email"
                        value={guestEmail}
                        onChange={(e) => {
                            setGuestEmail(e.target.value);
                            setGuestEmailError(null);
                        }}
                        className="h-10 bg-neutral-700/70 border-neutral-600 placeholder:text-neutral-500 text-neutral-100 focus:ring-1 focus:ring-cyan-glow focus:border-cyan-glow shadow-sm"
                        placeholder="you@example.com"
                        aria-invalid={!!guestEmailError}
                        aria-describedby={guestEmailError ? "guest-email-error" : undefined}
                    />
                    {guestEmailError && <p id="guest-email-error" className="text-xs text-red-400 mt-1.5">{guestEmailError}</p>}
                </div>
            </div>
            <DialogFooter className="mt-4 sm:mt-5 gap-2 sm:gap-3">
                <DialogClose asChild>
                    <Button type="button" variant="outline" className="border-neutral-600 text-neutral-300 hover:bg-neutral-700/70 hover:border-neutral-500 hover:text-neutral-100">
                        Cancel
                    </Button>
                </DialogClose>
                <Button 
                    type="submit" 
                    onClick={handleGuestEmailSubmit} 
                    className="bg-cyan-glow text-abyss-blue hover:bg-cyan-glow/80 shadow-glow-cyan-sm"
                    disabled={isPending || !guestEmail}
                >
                    {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Email'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {clientSecret && (
        <Dialog open={showCheckoutDialog} onOpenChange={handleDialogClose}>
          <DialogContent className="sm:max-w-[800px] bg-neutral-900/80 backdrop-blur-md border-neutral-700/60 text-neutral-100 rounded-xl shadow-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-neutral-700/50">
              <DialogTitle className="text-xl font-semibold text-cyan-glow">Complete Your Purchase</DialogTitle>
              <DialogDescription className="text-neutral-400 mt-1">
                Please enter your payment details below.
              </DialogDescription>
            </DialogHeader>
            <div id="checkout" className="p-4 sm:p-6 min-h-[300px]">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{clientSecret}}
              >
                <EmbeddedCheckout className="stripe-checkout-override" />
              </EmbeddedCheckoutProvider>
              {!clientSecret && 
                <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                  <Loader2 className="h-8 w-8 animate-spin mb-3" />
                  <p>Loading payment form...</p>
                </div>
              }
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 