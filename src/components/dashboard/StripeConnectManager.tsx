'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Rocket, AlertTriangle, ExternalLink } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { createStripeLoginLink, createStripeAccountLink } from '@/server-actions/stripeActions';

interface StripeConnectManagerProps {
  stripeAccountId: string | null;
  stripeAccountReady: boolean;
}

export function StripeConnectManager({ stripeAccountId, stripeAccountReady }: StripeConnectManagerProps) {
  const [isPending, startTransition] = useTransition();

  const handleManageAccount = () => {
    if (!stripeAccountId) return;
    startTransition(async () => {
      toast.info("Redirecting to your Stripe Dashboard...");
      const result = await createStripeLoginLink(stripeAccountId);
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.error || "Could not connect to Stripe. Please try again.");
      }
    });
  };
  
  const handleResumeOnboarding = () => {
    startTransition(async () => {
        toast.info("Resuming your Stripe onboarding...");
        const result = await createStripeAccountLink();
        if (result.success && result.url) {
          window.location.href = result.url;
        } else {
          toast.error(result.error || "Could not resume onboarding. Please try again.");
        }
    });
  };

  return (
    <Card className="mb-8 bg-neutral-900/50 border-neutral-700/50">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-xl">Payouts & Account</CardTitle>
                <CardDescription className="text-neutral-400">Manage your Stripe account and view your earnings.</CardDescription>
            </div>
            <Badge variant={stripeAccountReady ? 'success' : 'warning'}>
                {stripeAccountReady ? 'Account Ready' : 'Setup Incomplete'}
            </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!stripeAccountReady && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              Your account setup is incomplete. You must complete the onboarding process with Stripe to receive payouts.
            </AlertDescription>
          </Alert>
        )}
         <div className="flex items-center space-x-4">
            <Rocket className="h-10 w-10 text-cyan-glow"/>
            <div className="flex-1">
                <p className="text-neutral-200">
                    {stripeAccountReady 
                        ? "Your account is connected. Manage your financial details, view payout schedules, and more directly on Stripe."
                        : "To start selling and receiving payments, you need to set up an account with Stripe, our secure payment partner."
                    }
                </p>
            </div>
         </div>
      </CardContent>
      <CardContent className="border-t border-neutral-800 pt-4">
        {stripeAccountReady ? (
            <Button onClick={handleManageAccount} disabled={isPending || !stripeAccountId} className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                {isPending ? 'Redirecting...' : 'Manage Stripe Account'}
            </Button>
        ) : (
             <Button onClick={handleResumeOnboarding} disabled={isPending} className="w-full">
                {isPending ? 'Redirecting...' : 'Continue Onboarding with Stripe'}
            </Button>
        )}
      </CardContent>
    </Card>
  );
} 