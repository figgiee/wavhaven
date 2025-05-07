'use client';

import * as React from 'react';
import { getStripeBalance } from '@/server-actions/stripeActions';
import { Loader2, AlertCircle } from 'lucide-react';

interface StripeBalanceDisplayProps {
  stripeAccountId: string | null | undefined; // Only fetch if account ID exists
}

// Helper to format currency
function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
}

export function StripeBalanceDisplay({ stripeAccountId }: StripeBalanceDisplayProps) {
  const [balance, setBalance] = React.useState<{ available: number; currency: string } | null>(null);
  const [pending, setPending] = React.useState<{ amount: number; currency: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!stripeAccountId) {
      setIsLoading(false);
      // Don't set an error, just don't display balance if not connected
      return;
    }

    let isMounted = true;
    const fetchBalance = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getStripeBalance();
        if (isMounted) {
          if (result.success) {
            // Assuming USD is the primary currency for now
            const usdAvailable = result.available?.find(b => b.currency === 'USD');
            const usdPending = result.pending?.find(b => b.currency === 'USD');
            setBalance(usdAvailable ? { available: usdAvailable.amount, currency: usdAvailable.currency } : null);
            setPending(usdPending ? { amount: usdPending.amount, currency: usdPending.currency } : null);
          } else {
            setError(result.error || 'Failed to fetch balance.');
            setBalance(null);
            setPending(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('An unexpected error occurred while fetching balance.');
          setBalance(null);
          setPending(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchBalance();

    return () => { isMounted = false; };
  }, [stripeAccountId]); // Refetch if account ID changes (e.g., after connecting)

  if (!stripeAccountId) {
    return null; // Don't render anything if not connected
  }

  if (isLoading) {
    return <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading balance...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center text-sm text-red-600">
        <AlertCircle className="mr-2 h-4 w-4" /> Error: {error}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-1 border-t pt-4">
      {balance ? (
        <div>
          <p className="text-xs text-muted-foreground">Available Balance</p>
          <p className="text-xl font-semibold">{formatCurrency(balance.available, balance.currency)}</p>
        </div>
      ) : (
         <p className="text-sm text-muted-foreground">Available balance unavailable.</p>
      )}
      {pending && pending.amount > 0 && (
        <div>
           <p className="text-xs text-muted-foreground">Pending Balance</p>
           <p className="text-lg font-medium text-muted-foreground">{formatCurrency(pending.amount, pending.currency)}</p>
        </div>
      )}
      {/* Add button/link to initiate payout later */}
    </div>
  );
} 