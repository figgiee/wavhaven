'use server';

import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { stripe as stripeClient } from '@/lib/stripe';
import { getInternalUserId } from '@/lib/userUtils';
import prisma from '@/lib/prisma';

// Access environment variable directly
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  // In production, you might want to throw an error or handle this more gracefully
  console.error('CRITICAL: Missing STRIPE_SECRET_KEY environment variable');
  throw new Error('Stripe configuration error.');
}

const stripe = new Stripe(stripeSecretKey || '');

interface CheckoutResult {
  error?: string;
  clientSecret?: string; // Add clientSecret for embedded checkout
}

export async function createCheckoutSession(licenseIds: string[]): Promise<CheckoutResult> {
  // Use currentUser() instead of auth()
  const user = await currentUser();
  console.log('[Server Action createCheckoutSession] currentUser() Result:', user);

  // Check if user and user.id exist
  if (!user || !user.id) {
    console.log('[Server Action createCheckoutSession] No user or user.id found. Returning error.');
    return { error: 'Unauthorized' };
  }

  const clerkUserId = user.id; // Clerk's user ID
  console.log(`[Server Action createCheckoutSession] Found valid clerkUserId: ${clerkUserId}`);

  // Optional: If you need the internal DB user ID (e.g., for relations)
  // const internalUserId = await getInternalUserId(clerkUserId);
  // if (!internalUserId) {
  //   console.error(`[Server Action createCheckoutSession] Failed to find internal user ID for clerkId: ${clerkUserId}`);
  //   return { error: 'User mapping not found.' };
  // }
  // console.log(`[Server Action createCheckoutSession] Found internalUserId: ${internalUserId}`);

  if (!licenseIds || licenseIds.length === 0) {
    console.log('[Server Action createCheckoutSession] No licenseIds provided.');
    return { error: 'License IDs are required' };
  }

  try {
    // Fetch License Details using Prisma
    const licenses = await prisma.license.findMany({
      where: {
        id: { in: licenseIds },
      },
      select: {
        id: true,
        price: true, // Prisma returns Decimal, will be handled by Stripe
        name: true, // License name
        track: { // Select the related track
          select: {
            title: true, // Use 'title' instead of 'name'
          },
        },
      },
    });

    // Prisma findMany doesn't throw an error for not found, it returns an empty array or partial results.
    // Check if we found all requested licenses.
    if (!licenses || licenses.length !== licenseIds.length) {
        const foundIds = licenses.map(l => l.id);
        const missingIds = licenseIds.filter(id => !foundIds.includes(id));
        console.error('[Server Action createCheckoutSession] License mismatch/missing:', { requested: licenseIds, found: foundIds, missing: missingIds });
        return { error: 'One or more items not found or database inconsistency.' };
    }

    // Create Stripe Line Items
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = licenses.map((license) => {
      // Access the related track title correctly via Prisma structure
      const trackName = license.track?.title || 'Beat License'; // Use '.title' here
      // Convert Prisma Decimal to cents (number) for Stripe
      const priceInCents = Math.round(Number(license.price) * 100);

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${trackName} - ${license.name} License`,
          },
          // Use the converted price
          unit_amount: priceInCents,
        },
        quantity: 1,
      };
    });

    // Determine Success/Cancel URLs
    const successUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/cart`;

    console.log(`[Server Action createCheckoutSession] Creating Stripe session for user: ${clerkUserId}`);
    // Don't log success/cancel URLs for embedded, as they are handled differently.
    // console.log(`[Server Action createCheckoutSession] Success URL: ${successUrl}`);\n    // console.log(`[Server Action createCheckoutSession] Cancel URL: ${cancelUrl}`);\n\n    // Create Stripe Checkout Session\n    const session = await stripe.checkout.sessions.create({\n      payment_method_types: ['card'],\n      line_items,\n      mode: 'payment',\n      ui_mode: 'embedded', // Specify embedded UI mode\n      return_url: successUrl, // Use return_url for embedded mode\n      // cancel_url is not used directly in embedded mode\n      metadata: {\n        internalUserId: clerkUserId, // Pass Clerk user ID\n        licenseIds: JSON.stringify(licenseIds),\n      },\n      // Include email if needed by Stripe (requires fetching user email via Clerk)\n      // customer_email: user.emailAddresses?.[0]?.emailAddress,\n    });\n\n    console.log(`[Server Action createCheckoutSession] Stripe embedded session created: ${session.id}`);\n\n    // Return the client secret instead of redirecting\n    if (session.client_secret) {\n      console.log(`[Server Action createCheckoutSession] Returning client secret.`);\n      return { clientSecret: session.client_secret };\n    } else {\n      console.error('[Server Action createCheckoutSession] Stripe session created but no client_secret found.');\n      return { error: 'Could not retrieve Stripe client secret.' };\n    }\n\n  } catch (error) {\n// ... existing code ...

    // Create Stripe Checkout Session
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      ui_mode: 'embedded', // Specify embedded UI mode
      return_url: successUrl, // Use return_url for embedded mode
      metadata: {
        internalUserId: clerkUserId, // Pass Clerk user ID
        licenseIds: licenseIds.join(','), // Join into a comma-separated string
      },
      // Include email if needed by Stripe (requires fetching user email via Clerk)
      // customer_email: user.emailAddresses?.[0]?.emailAddress,
    });

    console.log(`[Server Action createCheckoutSession] Stripe embedded session created: ${session.id}`);

    // Return the client secret instead of redirecting
    if (session.client_secret) {
      console.log(`[Server Action createCheckoutSession] Returning client secret.`);
      return { clientSecret: session.client_secret };
    } else {
      console.error('[Server Action createCheckoutSession] Stripe session created but no client_secret found.');
      return { error: 'Could not retrieve Stripe client secret.' };
    }

  } catch (error) {
    console.error('[Server Action createCheckoutSession] Error:', error);
    // Differentiate between Prisma errors and other errors if needed
    if (error instanceof Error && 'code' in error && error.code === 'P2025') { // Example Prisma error code
         return { error: 'Database record not found during checkout.' };
    }
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return { error: errorMessage };
  }
} 