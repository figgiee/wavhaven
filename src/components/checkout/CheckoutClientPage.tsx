'use client';

import React, { useMemo, useEffect } from 'react';
import { useCartStore } from '@/stores/useCartStore';
import { CheckoutItemsList } from './CheckoutItemsList';
import { CheckoutOrderSummary } from './CheckoutOrderSummary';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from 'lucide-react';
import { createCheckoutSession } from '@/server-actions/stripeActions';
import { toast } from 'sonner';
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

// Define Billing Info Schema
const billingSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  // Basic address for now, can be expanded
  addressLine1: z.string().min(1, { message: "Address is required." }),
  city: z.string().min(1, { message: "City is required." }),
  country: z.string().min(1, { message: "Country is required." }),
  postalCode: z.string().min(1, { message: "Postal code is required." }),
});

// Load Stripe outside component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type BillingFormValues = z.infer<typeof billingSchema>;

export function CheckoutClientPage() {
  const items = useCartStore((state) => state.items);
  const itemCount = items.length;
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price, 0);
  }, [items]);

  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  // State for checkout process
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = React.useState(false);

  // --- Form Setup ---
  const form = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      addressLine1: '',
      city: '',
      country: '',
      postalCode: '',
    },
  });
  
  // --- Pre-fill Form Effect ---
  useEffect(() => {
    if (isSignedIn && user) {
      form.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.primaryEmailAddress?.emailAddress || '',
        // Add address pre-filling if available from user data in Clerk
        addressLine1: '', 
        city: '',
        country: '',
        postalCode: '',
      });
    }
  }, [isSignedIn, user, form.reset]);
  
  // --- Handle Form Submission ---
  async function onSubmit(values: BillingFormValues) {
    console.log("Billing Info Submitted (ignored for now):", values);
    if (!isSignedIn) {
      toast.error('Please sign in to complete the checkout.');
      // Optionally redirect to sign-in
      return;
    }
    if (itemCount === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    setIsSubmitting(true);
    
    // TODO: Future - Call a separate action here to save 'values' (billing info) if needed.

    // Call the existing action to create the Stripe session
    const itemsForCheckout = items.map((item) => ({ licenseId: item.licenseId }));
    try {
      const result = await createCheckoutSession({ items: itemsForCheckout });
      if (!result.success) {
        toast.error(`Checkout failed: ${result.error}`);
      } else if (result.clientSecret) {
        setClientSecret(result.clientSecret);
        setShowCheckoutDialog(true);
      } else {
        toast.error('Checkout failed: Could not initialize payment form.');
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast.error(`Checkout failed: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- Handle Dialog Close ---
   const handleDialogClose = (open: boolean) => {
    if (!open) {
      setShowCheckoutDialog(false);
      setClientSecret(null);
    }
  };

  // --- Empty Cart Handling ---
  if (!isLoaded) {
    // Optional: Show a loading state while auth is loading
    return <div className="text-center py-16"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  
  if (itemCount === 0 && isLoaded) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold mb-4">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Add some beats to proceed to checkout.</p>
        <Button asChild>
          <Link href="/explore">Explore Beats</Link>
        </Button>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 py-8">
          {/* Left Side: User Info Form */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-semibold border-b pb-3">Billing Information</h2>
            
            {/* Replace placeholder with actual form */}
            <div className="p-6 bg-card border rounded-lg space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Address Fields */}
               <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-1">
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Anytown" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-1">
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        {/* TODO: Replace with a Select component for countries */}
                        <Input placeholder="USA" {...field} /> 
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-1">
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* TODO: Add Shipping Info section if needed */}
            
            <div className="flex justify-end pt-4">
              <Button 
                type="submit"
                size="lg" 
                disabled={isSubmitting || !form.formState.isValid || !isLoaded || !isSignedIn}
                className="min-w-[180px]"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {!isLoaded ? 'Loading...' : isSubmitting ? 'Processing...' : !isSignedIn ? 'Sign in to Continue' : 'Proceed to Payment'}
              </Button>
            </div>
          </div>

          {/* Right Side: Order Summary & Items */}
          <div className="lg:col-span-1 space-y-6">
            <div className="sticky top-24">
              <h3 className="text-lg font-medium mb-3">Your Order</h3>
              <CheckoutItemsList items={items} />
              <Separator className="my-6" />
              <CheckoutOrderSummary itemCount={itemCount} subtotal={subtotal} />
            </div>
          </div>
        </form>
      </Form>

      {/* --- Checkout Dialog --- */}
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
    </>
  );
} 