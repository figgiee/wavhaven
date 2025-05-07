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
import { Trash2, Loader2, ShoppingCartIcon, Music } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
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
      <div className="min-h-screen text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-4">Shopping Cart</h1>
          <p className="text-lg text-gray-400 text-center mb-10 sm:mb-12">Review and checkout your selected beats</p>

          {items.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center">
              <ShoppingCartIcon className="w-16 h-16 text-indigo-500/50 mb-6" />
              <h2 className="text-xl font-semibold mb-2">Your Cart is Empty</h2>
              <p className="text-gray-400 mb-8">Add some beats to your cart and start making music!</p>
              <Button asChild variant="outline" className="bg-indigo-600 hover:bg-indigo-700 border-indigo-500 hover:border-indigo-400 text-white">
                <Link href="/explore">
                  <Music className="mr-2 h-4 w-4" />
                  Browse Beats
                </Link>
              </Button>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Your Items ({items.length})</h2>
                <Button
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    clearCart();
                    toast.info("Cart cleared!");
                  }}
                  disabled={items.length === 0 || isCheckingOut || isPending}
                  className="text-gray-400 hover:text-red-500 hover:bg-red-900/10 px-3"
                  aria-label="Clear entire cart"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Clear Cart
                </Button>
              </div>

              <ScrollArea className="max-h-[60vh] p-6">
                <div className="space-y-5">
                  {items.map((item) => (
                    <React.Fragment key={item.licenseId || item.id}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-grow min-w-0">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.title || 'Track Cover'}
                              width={56}
                              height={56}
                              className="rounded-md object-cover aspect-square border border-white/10"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-gray-800/50 rounded-md flex items-center justify-center text-gray-500">
                              <Music className="h-6 w-6" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate">{item.trackTitle || 'Unknown Track'}</p> 
                            <p className="text-sm text-gray-400 truncate">By {item.producerName || 'Unknown Artist'}</p>
                            {item.licenseName && 
                              <p className="text-xs text-indigo-400 mt-0.5">License: {item.licenseName}</p>
                            }
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="font-medium w-20 text-right text-white">{formatPrice(item.price)}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-gray-500 hover:text-red-500 hover:bg-red-900/20 w-8 h-8"
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
                      <Separator className="bg-white/10" />
                    </React.Fragment>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="p-6 bg-white/[.03] border-t border-white/10">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-lg font-medium text-white">Total</p>
                  <p className="text-xl font-semibold text-white">{formatPrice(totalPrice)}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild variant="outline" className="flex-1 bg-white/5 hover:bg-white/10 border-white/20 text-white">
                    <Link href="/explore">Continue Shopping</Link>
                  </Button>
                  <Button 
                    size="lg" 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={handleCheckout}
                    disabled={isCheckingOut || isPending || items.length === 0}
                  >
                    {isCheckingOut || isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
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
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
                <DialogTitle>Guest Checkout</DialogTitle>
                <DialogDescription>
                    Please enter your email address to proceed. Your download links will be sent here.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="guest-email" className="text-right text-gray-400">
                    Email
                </Label>
                <Input 
                    id="guest-email" 
                    type="email"
                    value={guestEmail}
                    onChange={(e) => {
                        setGuestEmail(e.target.value);
                        setGuestEmailError(null);
                    }}
                    className="col-span-3 bg-white/5 border-white/10 text-white focus:ring-indigo-500" 
                    placeholder="you@example.com"
                    aria-invalid={!!guestEmailError}
                    aria-describedby={guestEmailError ? "guest-email-error" : undefined}
                />
                </div>
                {guestEmailError && (
                    <p id="guest-email-error" className="col-span-4 text-sm text-red-500 text-right">
                        {guestEmailError}
                    </p>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline" className="bg-white/5 hover:bg-white/10 border-white/20 text-white">Cancel</Button>
                </DialogClose>
                <Button 
                    type="button" 
                    onClick={handleGuestEmailSubmit}
                    disabled={isCheckingOut || isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    {isCheckingOut || isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                        'Continue to Checkout'
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCheckoutDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[800px] bg-white dark:bg-gray-950 text-black dark:text-white">
          <DialogHeader>
            <DialogTitle>Complete Your Purchase</DialogTitle>
            <DialogDescription>
              Please enter your payment details below.
            </DialogDescription>
          </DialogHeader>
          <div id="checkout" className="p-4 min-h-[400px]">
            {clientSecret && stripePromise ? (
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ clientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            ) : (
               <div className="flex items-center justify-center h-full">
                 <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                 <span className="ml-2 text-gray-500">Loading payment form...</span>
               </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 