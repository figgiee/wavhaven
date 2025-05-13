'use client';

import React, { useEffect, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Package, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/stores/useCartStore';
import { usePostHog } from 'posthog-js/react';
import { verifyCheckoutSession } from '@/server-actions/stripeActions';
import { cn } from "@/lib/utils";
import { CheckoutItemsList } from '@/components/checkout/CheckoutItemsList';
import { CheckoutOrderSummary } from '@/components/checkout/CheckoutOrderSummary';

interface OrderItem {
  description: string;
  quantity: number;
  amount_total: number; // cents
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const clearCart = useCartStore((state) => state.clearCart);
  const posthogClient = usePostHog();
  
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<{ items: OrderItem[], total: number, orderId?: string } | null>(null);

  useEffect(() => {
    if (sessionId && verificationStatus === 'idle') {
      setVerificationStatus('loading');
      verifyCheckoutSession(sessionId)
        .then(result => {
          if (result.success && result.orderItems && result.orderTotal !== undefined) {
            console.log('[OrderSuccess] Verification successful:', result);
            setVerificationStatus('success');
            setOrderDetails({
              items: result.orderItems.map(item => ({
                 description: item.description,
                 quantity: item.quantity,
                 amount_total: item.amount_total,
                 price: item.amount_total,
                 trackId: '',
                 licenseId: '',
                 imageUrl: '',
                 trackTitle: item.description,
                 licenseName: '',
                 slug: '',
                 producerName: ''
              })),
              total: result.orderTotal,
              orderId: result.orderId
            });
            posthogClient?.capture('order_completed', { 
                stripeSessionId: sessionId, 
                customerEmail: result.customerEmail,
                orderId: result.orderId,
                totalAmount: result.orderTotal / 100
            });
            clearCart();
            console.log('[OrderSuccess] Cart cleared.');
          } else {
            console.error('[OrderSuccess] Verification failed or missing data:', result.error || result.message);
            setVerificationError(result.error || result.message || "Verification failed or order data incomplete.");
            setVerificationStatus('error');
            posthogClient?.capture('order_verification_failed', { 
                 stripeSessionId: sessionId, 
                 reason: result.error || result.message 
             });
          }
        })
        .catch(err => {
          console.error('[OrderSuccess] Exception during verification:', err);
          setVerificationError("An unexpected error occurred during verification.");
          setVerificationStatus('error');
        });
    } else if (!sessionId && verificationStatus === 'idle') {
        console.warn('[OrderSuccess] No session_id found in URL.');
        setVerificationError("Invalid access: Missing order reference.");
        setVerificationStatus('error');
    }
  }, [sessionId, clearCart, posthogClient, verificationStatus]);

  if (verificationStatus === 'loading' || verificationStatus === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 text-neutral-100">
        <Loader2 className="h-16 w-16 text-cyan-glow animate-spin mb-6" />
        <h1 className="text-2xl font-bold mb-3">Verifying Order...</h1>
        <p className="text-neutral-400">Please wait while we confirm your payment.</p>
      </div>
    );
  }

  if (verificationStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertTriangle className="h-16 w-16 text-magenta-spark mb-6" />
        <h1 className="text-2xl font-bold mb-3 text-magenta-spark">Verification Failed</h1>
        <p className="text-neutral-400 mb-6">
          {verificationError || "We couldn't verify your order status. Please contact support if payment was made."}
        </p>
        <Button variant="outline" asChild className="border-magenta-spark text-magenta-spark hover:bg-magenta-spark/10 hover:text-magenta-spark focus-visible:ring-magenta-spark">
          <Link href="/support">Contact Support</Link>
        </Button>
      </div>
    );
  }

  if (verificationStatus === 'success' && orderDetails) {
    const displayItems = orderDetails.items.map(item => ({
        trackId: `item-${item.description.replace(/\s+/g, '-')}`,
        licenseId: `license-${item.description.replace(/\s+/g, '-')}`,
        price: item.amount_total,
        trackTitle: item.description,
        licenseName: '',
        imageUrl: '/coverart/default-cover.png',
        slug: '',
        producerName: '',
    }));

    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <CheckCircle className="h-16 w-16 text-cyan-glow mb-6 mx-auto" />
        <h1 className="text-3xl font-bold mb-3 text-neutral-100">Payment Successful!</h1>
        <p className="text-lg text-neutral-300 mb-8 max-w-md mx-auto">
          Thank you for your purchase. Your order has been processed.
        </p>
        
        <div className="bg-card border border-border rounded-lg p-6 mb-8 text-left shadow-md">
           <h2 className="text-xl font-semibold mb-4 text-foreground">Order Summary</h2>
           <CheckoutItemsList items={displayItems} />
           <Separator className="my-6" />
           <CheckoutOrderSummary itemCount={orderDetails.items.length} subtotal={orderDetails.total} />
           {orderDetails.orderId && (
              <p className="text-xs text-muted-foreground mt-4">Order ID: {orderDetails.orderId}</p>
           )}
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-8 text-left shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Downloads</h2>
            <p className="text-neutral-300 mb-4">
             You can access your purchased licenses and download the files from your Downloads page.
            </p>
            <Button asChild className="w-full sm:w-auto bg-cyan-glow text-abyss-blue hover:bg-cyan-glow/90 active:bg-cyan-glow/80 shadow-glow-cyan-sm font-semibold">
             <Link href="/downloads">
                 <Package className="mr-2 h-4 w-4" />
                 Go to Downloads
             </Link>
            </Button>
        </div>

        <Button variant="outline" asChild className="border-cyan-glow/50 text-cyan-glow bg-transparent hover:bg-cyan-glow/10 hover:text-cyan-glow focus-visible:ring-cyan-glow">
          <Link href="/explore">Continue Browsing</Link>
        </Button>
        {sessionId && (
          <p className="text-xs text-neutral-500 mt-8">Stripe Reference: {sessionId}</p>
        )}
      </div>
    );
  }

  return null;
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><p>Loading success page...</p></div>}>
      <SuccessContent />
    </Suspense>
  );
} 