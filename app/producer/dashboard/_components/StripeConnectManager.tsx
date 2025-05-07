'use client';

import * as React from 'react';
import { createStripeAccountLink } from '@/server-actions/stripeActions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ExternalLink } from 'lucide-react';

interface StripeConnectProps {
  stripeAccountId: string | null | undefined;
  // We might need more status info from Stripe later (e.g., if onboarding is complete)
  // For now, just presence of ID means potentially connected.
}

export function StripeConnectManager({ stripeAccountId }: StripeConnectProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const result = await createStripeAccountLink();
      if (result.success && result.url) {
        // Redirect user to Stripe onboarding
        window.location.href = result.url;
        // Don't need to setIsLoading(false) as page will redirect
      } else {
        toast.error(result.error || 'Failed to create Stripe connection link.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error connecting Stripe account:", error);
      toast.error('An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  // Basic status display
  if (stripeAccountId) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-green-600">Stripe Account Connected</p>
        <p className="text-xs text-muted-foreground">Payouts are enabled. You can manage your account on Stripe.</p>
        {/* Optionally add a link to manage Stripe account (requires different API call) */}
      </div>
    );
  }

  // Button to initiate onboarding
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Connect your Stripe account to receive payouts for your sales.</p>
      <Button onClick={handleConnect} disabled={isLoading}>
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</>
        ) : (
          <><ExternalLink className="mr-2 h-4 w-4" /> Connect with Stripe</>
        )}
      </Button>
    </div>
  );
} 