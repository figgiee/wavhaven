'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/db/prisma';
import { stripe } from '@/lib/payments/stripe'; // Assuming stripe client is initialized here
import { getInternalUserId } from '@/lib/userUtils';
import { ensureUserRecord } from '@/server-actions/users/userMutations'; // Import ensureUserRecord
import { CartItem } from '@/stores/cartStore'; // Use for input structure reference
import { posthogServerClient } from '@/lib/posthog-server'; // Import server client
import { Ratelimit } from '@upstash/ratelimit'; // Import Ratelimit
import { Redis } from '@upstash/redis';     // Import Redis
import { Decimal } from '@prisma/client/runtime/library'; // Import Decimal
import { UserRole } from '@prisma/client'; // Import UserRole enum
import Stripe from 'stripe';
import { headers } from 'next/headers';

// --- Initialize Rate Limiter ---
let redisCheckoutLimiter: Redis | null = null;
let ratelimitCheckout: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redisCheckoutLimiter = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Allow 5 checkout attempts per user per minute
  ratelimitCheckout = new Ratelimit({
    redis: redisCheckoutLimiter,
    limiter: Ratelimit.slidingWindow(5, '60 s'), // 5 requests per 60 seconds
    analytics: true,
    prefix: '@upstash/ratelimit-checkout', // Use a specific prefix
  });
} else {
  console.warn('Upstash Redis environment variables not found. Checkout rate limiting is disabled.');
}
// -----------------------------

// Define Zod schema for input validation
const checkoutSchema = z.object({
  items: z.array(z.object({
    // licenseId: z.string().min(1), // Assuming licenseId is a non-empty string
    licenseId: z.string().uuid({ message: "Invalid License ID format." }), // Validate as UUID
    // Do NOT trust price, quantity, etc., from client
  })).min(1, { message: "Cart cannot be empty." }),
  guestEmail: z.string().email({ message: "Invalid email address." }).optional(),
});

// Type definition for the action's return value
type ActionResponse = 
  | { success: true; clientSecret: string | null } // Return clientSecret for embedded
  | { success: false; error: string }; // Error message

export async function createCheckoutSession(
  // Input type remains broadly similar, Zod infers internally
  input: { items: { licenseId: string }[], guestEmail?: string }
): Promise<ActionResponse> {
  
  const { userId: clerkUserId } = await auth(); // Corrected: await auth()
  
  // --- Apply Rate Limiting Early --- 
  if (ratelimitCheckout) {
    // Use clerkUserId if available, otherwise use guestEmail as identifier
    // Ensure guestEmail is non-empty for this logic path
    const identifier = clerkUserId || input.guestEmail;
    if (!identifier) {
      // Should ideally be caught by Zod, but handle defensively
      return { success: false, error: 'User identifier missing for rate limiting.' };
    }
    const { success: limitReached } = await ratelimitCheckout.limit(identifier);
    if (!limitReached) {
      return { success: false, error: 'Too many checkout attempts. Please try again shortly.' };
    }
  }
  // --------------------------------

  // Validate input using Zod
  const validationResult = checkoutSchema.safeParse(input);

  if (!validationResult.success) {
    // Flatten errors for easier access
    const errors = validationResult.error.flatten().fieldErrors;
    // Combine messages from all fields or get the first one
    const firstError = Object.values(errors).flat()[0] || 'Invalid input data.';
    return { success: false, error: firstError };
  }
  
  const { items, guestEmail } = validationResult.data;

  let internalUserId: string | null = null;
  let userEmail: string | undefined = guestEmail;

  try {
    // 1. Determine Internal User ID (Registered or Guest)
    if (clerkUserId) {
      // Registered user
      internalUserId = await getInternalUserId(clerkUserId);
      if (!internalUserId) {
        console.log(`Internal user for Clerk ID ${clerkUserId} not found. Attempting to ensure record.`);
        const user = await currentUser(); // Fetch full user object from Clerk
        if (!user) {
          // Should not happen if clerkUserId is set, but handle defensively
          console.error("Clerk user ID exists but currentUser() returned null in createCheckoutSession.");
          return { success: false, error: "Authentication error. Please sign out and sign back in." };
        }
        try {
          // Corrected: Map fields for ensureUserRecord
          internalUserId = await ensureUserRecord({
            clerkId: user.id,
            email: user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress ?? null,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username
          });
          console.log(`Successfully ensured internal user record: ${internalUserId} for Clerk ID: ${clerkUserId}`);
        } catch (syncError: unknown) {
          console.error(`Error ensuring user record for Clerk ID ${clerkUserId}:`, syncError);
          // Safely access error message
          const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown sync error';
          return { success: false, error: `Failed to synchronize account data: ${errorMessage}` };
        }
      }
      // Fetch email for registered user if needed for Stripe (optional)
      if (internalUserId) {
        const dbUser = await prisma.user.findUnique({ where: { id: internalUserId }, select: { email: true } });
        userEmail = dbUser?.email ?? undefined;
      } else {
         // This case should now be impossible if ensureUserRecord succeeded or errored out, but handle defensively
         console.error(`Internal user ID is still null after sync attempt for Clerk ID: ${clerkUserId}`);
         return { success: false, error: 'Account synchronization failed. Please try again.' };
      }

    } else {
      // Guest user
      if (!guestEmail) {
        // This should be caught by validation, but double-check
        return { success: false, error: 'Email is required for guest checkout.' };
      }
      // Upsert guest user record
      const guestUser = await prisma.user.upsert({
        where: { email: guestEmail },
        update: { isGuest: true },
        create: {
          email: guestEmail,
          isGuest: true,
        },
        select: { id: true }, // Select the internal ID
      });
      internalUserId = guestUser.id;
      userEmail = guestEmail; // Already have it
    }

    if (!internalUserId) {
       // This case should theoretically be covered above
       return { success: false, error: 'Could not determine user identity for checkout.' };
    }

    // 2. Fetch License Details from DB (Security)
    const licenseIds = items.map(item => item.licenseId);
    // --- TEMP LOGGING --- REMOVED
    // console.log('[Action DEBUG] Requested licenseIds:', licenseIds);
    // --------------------
    const licenses = await prisma.license.findMany({
      where: {
        id: { in: licenseIds },
      },
      select: { 
        id: true, 
        price: true, // Price is now Decimal
        type: true, // For metadata/description
        track: { select: { title: true }} // For description
      },
    });
    // --- TEMP LOGGING --- REMOVED
    // console.log('[Action DEBUG] Found licenses:', JSON.stringify(licenses));
    // --------------------

    // Validate that all requested licenses were found and map prices
    // The price here is now a Decimal object
    const licensePriceMap = new Map(licenses.map(l => [
      l.id, 
      { 
        price: l.price, // Keep as Decimal for now
        description: `${l.track.title} - ${l.type} License` 
      }
    ]));
    // --- TEMP LOGGING --- REMOVED
    // console.log(`[Action DEBUG] Comparing lengths: Found=${licenses.length}, Requested=${licenseIds.length}`);
    // --------------------
    if (licenses.length !== licenseIds.length) {
        console.error("Mismatch between requested license IDs and found licenses.", { requested: licenseIds, found: licenses.map(l=>l.id)});
        return { success: false, error: 'One or more items in your cart are invalid. Please refresh and try again.' };
    }

    // Calculate total amount for PostHog event - ensure this handles Decimal
    // Decimal.js objects can be summed directly using .plus() or implicitly if needed
    // Let's convert to number for simplicity in PostHog, assuming precision loss is acceptable for tracking
    const totalAmountNumber = licenses.reduce((sum, license) => sum + Number(license.price), 0);

    // --- PostHog Event Tracking --- 
    if (posthogServerClient) {
      posthogServerClient.capture({
        distinctId: internalUserId, // Use internal ID for linking
        event: 'checkout_started',
        properties: {
          itemCount: items.length,
          totalAmount: totalAmountNumber, // Send as number
          currency: 'USD', // Or your currency
          userType: clerkUserId ? 'registered' : 'guest',
          licenseIds: licenseIds,
          // Add any other relevant properties, e.g., specific license types
        },
      });
      // await posthogServerClient.flushAsync(); 
    }
    // ----------------------------- 

    // 3. Prepare Stripe Line Items
    const lineItems = items.map(item => {
      const licenseInfo = licensePriceMap.get(item.licenseId);
      if (!licenseInfo || !(licenseInfo.price instanceof Decimal)) { // Add type check
        throw new Error(`Could not find valid price info for license ID: ${item.licenseId}`); 
      }
      
      // Corrected: Decimal to integer cents
      const priceInCents = licenseInfo.price.mul(100).round().toNumber();
      
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: licenseInfo.description,
          },
          // Use the calculated integer amount in cents
          unit_amount: priceInCents, 
        },
        quantity: 1,
      };
    });

    // --- >>> ADD CRUCIAL PRE-METADATA LOGGING <<< ---
    console.log(`[Action stripeActions] PRE-METADATA CHECK: clerkUserId = ${clerkUserId}`);
    console.log(`[Action stripeActions] PRE-METADATA CHECK: internalUserId TO BE USED IN METADATA = ${internalUserId}`);
    console.log(`[Action stripeActions] PRE-METADATA CHECK: userEmail = ${userEmail}`);
    // --- >>> END CRUCIAL LOGGING <<< ---

    // 4. Create Stripe Checkout Session for Embedded UI
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/order/success`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      ui_mode: 'embedded',
      return_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        internalUserId: internalUserId, // This is the critical value
        licenseIds: licenseIds.join(',')
      },
      customer_email: userEmail,
    });

    console.log(`[Server Action createCheckoutSession] Stripe embedded session created: ${session.id}`);

    // 5. Return client_secret for the embedded form
    return { success: true, clientSecret: session.client_secret };

  } catch (error: unknown) {
    // Catch errors from DB queries or Stripe API call
    console.error('Error creating Stripe Checkout session:', error);
    // --- Optional: Track checkout failure --- 
    // Need to check if internalUserId exists before using it
    const errorUserId = internalUserId || 'guest_checkout_error'; // Use a fallback ID
    if (posthogServerClient) {
      posthogServerClient.capture({
        distinctId: errorUserId, 
        event: 'checkout_failed',
        properties: { 
            // Safely access error message
            error_message: error instanceof Error ? error.message : 'Unknown error',
            userType: clerkUserId ? 'registered' : 'guest',
        }
      });
    }
    // -------------------------------------
    // Safely access error message for the response
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: `Checkout failed: ${errorMessage}` };
  }
} 

// --- Create Stripe Connect Account Link Action ---

interface AccountLinkResult {
  success: boolean;
  url?: string | null;
  error?: string;
}

export async function createStripeAccountLink(): Promise<AccountLinkResult> {
  try {
    // 1. Authentication & Authorization
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return { success: false, error: 'Authentication required.' };
    }

    const internalUserId = await getInternalUserId(clerkUserId);
    if (!internalUserId) {
      return { success: false, error: 'User record not found.' };
    }

    // 2. Find User and SellerProfile, ensure user is/becomes a PRODUCER
    const userWithProfile = await prisma.user.findUnique({
      where: { id: internalUserId },
      select: {
        id: true,
        role: true,
        email: true,
        sellerProfile: {
          select: { id: true, stripeAccountId: true },
        },
      },
    });

    if (!userWithProfile) {
      // Should not happen if getInternalUserId succeeded
      return { success: false, error: 'User record inconsistency.' };
    }

    let sellerProfile = userWithProfile.sellerProfile;
    let stripeAccountId = sellerProfile?.stripeAccountId;

    // If user is not yet a producer or has no seller profile, create/update them
    if (userWithProfile.role !== UserRole.PRODUCER || !sellerProfile) {
      console.log(`User ${internalUserId} is not a producer or lacks profile. Updating...`);
      await prisma.$transaction(async (tx) => {
        // Ensure role is PRODUCER
        if (userWithProfile.role !== UserRole.PRODUCER) {
          await tx.user.update({
            where: { id: internalUserId },
            data: { role: UserRole.PRODUCER },
          });
          console.log(`Updated user ${internalUserId} role to PRODUCER.`);
        }
        // Create SellerProfile if it doesn't exist
        if (!sellerProfile) {
          const newProfile = await tx.sellerProfile.create({
            data: { userId: internalUserId },
            select: { id: true, stripeAccountId: true }, // Select stripeAccountId which will be null
          });
          sellerProfile = newProfile; // Update local variable
          stripeAccountId = newProfile.stripeAccountId; // Update local variable (will be null)
          console.log(`Created SellerProfile ${newProfile.id} for user ${internalUserId}.`);
        }
      });
      // Re-fetch sellerProfile ID if it was just created
      if (!sellerProfile) {
         const refetchedProfile = await prisma.sellerProfile.findUnique({ where: { userId: internalUserId }, select: { id: true, stripeAccountId: true }});
         sellerProfile = refetchedProfile;
         stripeAccountId = refetchedProfile?.stripeAccountId;
      }
    }

    // Ensure we have a seller profile ID after potential creation
    if (!sellerProfile?.id) {
       return { success: false, error: 'Failed to create or find seller profile.' };
    }

    // 3. Create Stripe Account if needed
    if (!stripeAccountId) {
      console.log(`No Stripe account found for SellerProfile ${sellerProfile.id}. Creating...`);
      const account = await stripe.accounts.create({
        type: 'express',
        email: userWithProfile.email, // Pre-fill email if available
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        // Add business_profile, country, etc. if needed
      });

      stripeAccountId = account.id;

      // Store the new Stripe Account ID on the SellerProfile
      await prisma.sellerProfile.update({
        where: { id: sellerProfile.id },
        data: { stripeAccountId: stripeAccountId },
      });
      console.log(`Created Stripe account ${stripeAccountId} and linked to SellerProfile ${sellerProfile.id}.`);
    }

    // 4. Create Account Link
    console.log(`Creating account link for Stripe account ${stripeAccountId}.`);
    // Define your return and refresh URLs
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/producer/dashboard?stripe_return=true`; // Redirect back to dashboard
    const refreshUrl = `${process.env.NEXT_PUBLIC_APP_URL}/producer/dashboard?stripe_refresh=true`; // Handle refresh case

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
      collect: 'eventually_due',
    });

    // 5. Return URL
    return { success: true, url: accountLink.url };

  } catch (error: unknown) {
    console.error("Error creating Stripe account link:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
} 

// --- Get Stripe Balance Action ---

interface BalanceResult {
  success: boolean;
  error?: string;
  available?: { amount: number; currency: string }[]; // Array for multiple currencies
  pending?: { amount: number; currency: string }[];
}

export async function getStripeBalance(): Promise<BalanceResult> {
  try {
    // 1. Authentication & Authorization
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return { success: false, error: 'Authentication required.' };
    }

    const internalUserId = await getInternalUserId(clerkUserId);
    if (!internalUserId) {
      return { success: false, error: 'User record not found.' };
    }

    // 2. Get Stripe Account ID from SellerProfile
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: internalUserId },
      select: { stripeAccountId: true },
    });

    const stripeAccountId = sellerProfile?.stripeAccountId;

    if (!stripeAccountId) {
      return { success: false, error: 'Stripe account not connected.' };
    }

    // 3. Retrieve Balance from Stripe
    console.log(`Fetching balance for Stripe account: ${stripeAccountId}`);
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId, // Specify the connected account ID
    });
    console.log(`Retrieved balance object for ${stripeAccountId}:`, balance);

    // 4. Format and Return Balance Data
    // Filter for relevant currencies if needed, e.g., 'usd'
    const available = balance.available.map(b => ({ amount: b.amount / 100, currency: b.currency.toUpperCase() }));
    const pending = balance.pending.map(b => ({ amount: b.amount / 100, currency: b.currency.toUpperCase() }));

    return { success: true, available, pending };

  } catch (error: unknown) {
    console.error("Error fetching Stripe balance:", error);
    // Handle specific Stripe errors, e.g., account inactive
    // Check if error is an object and has a 'code' property
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'account_invalid') {
        return { success: false, error: 'Stripe account is invalid or restricted.' };
    }
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
} 

// --- Verify Checkout Session ---
interface VerifyResultItem {
  description: string;
  quantity: number;
  amount_total: number; // in cents
}

interface VerifyResult {
  success: boolean;
  message?: string;
  error?: string;
  customerEmail?: string | null;
  customerName?: string | null;
  orderItems?: VerifyResultItem[]; // Added to return fetched items
  orderTotal?: number; // Added to return total amount in cents
  orderId?: string; // If an internal order ID is created/retrieved
}

export async function verifyCheckoutSession(sessionId: string | null): Promise<VerifyResult> {
  if (!sessionId) {
    return { success: false, error: 'Session ID is missing.' };
  }

  const { userId: clerkUserId } = auth(); // Use Clerk's auth() to get current user

  if (!clerkUserId) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer', 'payment_intent'], // Expand line_items
    });

    if (!session) {
      return { success: false, error: 'Stripe session not found.' };
    }

    // --- Extract Customer Info (Optional, but good for records) --- 
    let customerEmail: string | null = null;
    let customerName: string | null = null;
    if (session.customer && typeof session.customer === 'object') {
      const customer = session.customer as Stripe.Customer;
      customerEmail = customer.email;
      customerName = customer.name; 
    } else if (session.customer_details) {
      customerEmail = session.customer_details.email;
      customerName = session.customer_details.name;
    }
    // ----------------------------------------------------------------
    
    // --- Extract Line Items & Total ---
    let fetchedOrderItems: VerifyResultItem[] = [];
    let orderTotal = session.amount_total; // This is already in cents

    if (session.line_items && session.line_items.data) {
       // If line_items were expanded, listLineItems might not be strictly necessary
      // but using it ensures we get the most accurate final state of line items.
      const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 100 }); 
      fetchedOrderItems = lineItems.data.map(item => ({
        description: item.description,
        quantity: item.quantity || 1,
        amount_total: item.amount_total, // Stripe amount_total is in cents
      }));
    } else {
      console.warn(`[verifyCheckoutSession] Line items not found or not expanded for session ${sessionId}. Order summary might be incomplete.`);
    }
    // ------------------------------------

    if (session.payment_status === 'paid' && session.status === 'complete') {
      // Payment successful and session complete
      const internalUserId = await getInternalUserId(clerkUserId);
      if (!internalUserId) {
        return { success: false, error: 'Internal user ID not found.' };
      }

      // Check if order already exists to prevent duplicates
      const existingOrder = await prisma.order.findFirst({
        where: { stripeCheckoutSessionId: sessionId },
      });

      let createdOrder;
      if (!existingOrder) {
        // Create Order and OrderItems in Prisma
        const licenseIdsString = session.metadata?.licenseIds;
        const licenseIds = licenseIdsString ? licenseIdsString.split(',') : [];

        // Basic validation for metadata
        if (!licenseIdsString || licenseIds.length === 0) {
           console.error(`[verifyCheckoutSession] Missing or invalid licenseIds in metadata for session ${sessionId}`);
           return { success: false, error: 'Order metadata missing license information.', customerEmail, customerName };
        }

        const licenses = await prisma.license.findMany({
            where: { id: { in: licenseIds } },
            select: { id: true, trackId: true, price: true, filesIncluded: true }, // Fetch filesIncluded
        });

        if (licenses.length !== licenseIds.length) {
            console.error(`[verifyCheckoutSession] License ID mismatch for session ${sessionId}`);
            return { success: false, error: 'Order data inconsistency - item details not found.', customerEmail, customerName };
        }

        const orderItemsData = licenses.map(license => ({
          trackId: license.trackId,
          licenseId: license.id,
          priceAtPurchase: license.price, // Store the price at the time of purchase
        }));

        createdOrder = await prisma.order.create({
          data: {
            customerId: internalUserId,
            stripeCheckoutSessionId: sessionId,
            status: 'COMPLETED',
            totalAmount: new Decimal((session.amount_total || 0) / 100), // Convert cents to decimal
            items: {
              create: orderItemsData,
            },
          },
          include: { items: true }, // Include items to grant permissions
        });

        // Grant download permissions
        for (const orderItem of createdOrder.items) {
          const license = licenses.find(l => l.id === orderItem.licenseId);
          if (license) {
            await prisma.userDownloadPermission.createMany({
              data: license.filesIncluded.map(fileType => ({
                userId: internalUserId,
                trackId: orderItem.trackId,
                orderId: createdOrder.id,
                licenseId: license.id,
                fileType: fileType, // This should match enum values in your schema
              })),
              skipDuplicates: true,
            });
          }
        }
        console.log(`[verifyCheckoutSession] Order ${createdOrder.id} created and permissions granted for session ${sessionId}.`);
      } else {
        console.log(`[verifyCheckoutSession] Order ${existingOrder.id} already exists for session ${sessionId}. Skipping creation.`);
        createdOrder = existingOrder;
      }

      return {
        success: true,
        message: 'Payment verified and order processed.',
        customerEmail,
        customerName,
        orderItems: fetchedOrderItems,
        orderTotal: orderTotal || 0,
        orderId: createdOrder?.id
      };
    } else if (session.status === 'open') {
      // Session is still open, payment not completed
      return { success: false, error: 'Payment not completed. The checkout session is still open.', customerEmail, customerName };
    } else {
      // Other statuses like 'expired' or payment failed
      return { success: false, error: `Checkout session status: ${session.status}. Payment not successful.`, customerEmail, customerName };
    }
  } catch (error: unknown) {
    console.error('[verifyCheckoutSession] Error verifying Stripe session:', error);
    // Explicitly check if it's an Error instance before accessing message
    const errorMessage = (error instanceof Error) ? (error as Error).message : 'An unknown error occurred.'; 
    return { success: false, error: `Verification failed: ${errorMessage}` };
  }
}
// ----------------------------------------- 