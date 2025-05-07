'use client';

import React, { useEffect, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Package, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/useCartStore';
import { usePostHog } from 'posthog-js/react';
import { verifyCheckoutSession } from '@/server-actions/stripeActions';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const clearCart = useCartStore((state) => state.clearCart);
  const posthogClient = usePostHog();
  
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId && verificationStatus === 'idle') {
      setVerificationStatus('loading');
      verifyCheckoutSession(sessionId)
        .then(result => {
          if (result.success) {
            console.log('[OrderSuccess] Verification successful:', result);
            setVerificationStatus('success');
            posthogClient?.capture('order_completed', { 
                stripeSessionId: sessionId, 
                customerEmail: result.customerEmail,
            });
            clearCart();
            console.log('[OrderSuccess] Cart cleared.');
          } else {
            console.error('[OrderSuccess] Verification failed:', result.error || result.message);
            setVerificationError(result.error || result.message || "Verification failed.");
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <Loader2 className="h-16 w-16 text-muted-foreground animate-spin mb-6" />
        <h1 className="text-2xl font-bold mb-3">Verifying Order...</h1>
        <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
      </div>
    );
  }

  if (verificationStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
        <h1 className="text-2xl font-bold mb-3 text-destructive">Verification Failed</h1>
        <p className="text-muted-foreground mb-6">
          {verificationError || "We couldn't verify your order status. Please contact support if payment was made."}
        </p>
        <Button variant="outline" asChild>
          <Link href="/support">Contact Support</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <CheckCircle className="h-16 w-16 text-green-500 mb-6" />
      <h1 className="text-3xl font-bold mb-3">Payment Successful!</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        Thank you for your purchase. Your order has been processed, and your downloads should be available shortly.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild>
          <Link href="/downloads">
            <Package className="mr-2 h-4 w-4" />
            Go to Downloads
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/explore">Continue Browsing</Link>
        </Button>
      </div>
      {sessionId && (
        <p className="text-xs text-muted-foreground mt-8">Order Reference: {sessionId}</p>
      )}
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><p>Loading success page...</p></div>}>
      <SuccessContent />
    </Suspense>
  );
} 