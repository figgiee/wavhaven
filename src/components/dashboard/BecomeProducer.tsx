'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { createStripeAccountLink } from '@/server-actions/stripeActions';

const features = [
  "Reach a global audience of artists and creators.",
  "Secure and automated payments with Stripe.",
  "Powerful dashboard with analytics and track management.",
  "Set your own prices and licensing terms.",
  "0% commission on sales for the first year."
];

export function BecomeProducer() {
  const [isPending, startTransition] = useTransition();

  const handleOnboarding = () => {
    startTransition(async () => {
      toast.info("Redirecting to Stripe to set up your account...");
      const result = await createStripeAccountLink();
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.error || "Could not start onboarding. Please try again.");
      }
    });
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="max-w-2xl w-full bg-neutral-900/50 border-neutral-700/50 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-cyan-glow">Start Selling on Wavhaven</CardTitle>
          <CardDescription className="text-neutral-300 mt-2 text-lg">
            Join our curated community of producers and turn your beats into a business.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 py-6">
          <ul className="space-y-4">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <CheckCircle className="h-5 w-5 text-cyan-glow mt-1 mr-3 flex-shrink-0" />
                <span className="text-neutral-200">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="p-8 bg-neutral-800/40 border-t border-neutral-700/50">
          <Button 
            className="w-full text-lg py-6 bg-cyan-glow text-abyss-blue hover:bg-cyan-glow/90 active:bg-cyan-glow/80 shadow-glow-cyan-md font-semibold"
            onClick={handleOnboarding}
            disabled={isPending}
          >
            {isPending ? "Redirecting..." : "Become a Producer & Start Selling"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 