import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { posthogServerClient } from '@/lib/posthog-server';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

// Ensure secrets are present, throwing an error during startup if not.
// Using non-null assertions (`!`) can hide runtime errors if variables are missing.
const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
}

// Ensure required environment variables are present
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ CRITICAL ERROR: Missing Supabase URL or Service Role Key environment variables.");
  // Throw an error or handle appropriately - this prevents the route from working
  // For now, we'll let it fail later, but ideally check upfront.
}

// Define expected metadata structure
interface CheckoutSessionMetadata {
  internalUserId?: string;
  licenseIds?: string;
}

// --- Define Type for RPC result ---
interface LicenseDetailsResult {
  id: string; // uuid is represented as string in JS/TS
  price: number | string; // Prisma Decimal can be string or number, handle appropriately
  trackId: string; // uuid
}
// --- End Type Definition ---

// Define the type for the data used in createMany
// This should match the expected input for prisma.userDownloadPermission.createMany
// It might be Prisma.UserDownloadPermissionCreateManyInput if using default Prisma types
type UserDownloadPermissionCreateData = {
    userId: string;
    trackId: string;
    orderId: string;
    orderItemId: string;
    // Add other fields if they are part of the createMany call and non-optional
};

export async function POST(req: NextRequest) {
  console.log("Stripe webhook received...");
  
  let body: Buffer;
  try {
    body = Buffer.from(await req.arrayBuffer());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error reading body";
    console.error(`Webhook Error: Failed to read request body: ${message}`);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  const sig = req.headers.get('stripe-signature');

  if (!sig) {
     console.error("Webhook Error: Missing Stripe signature.");
     return new NextResponse('Webhook Error: Missing Stripe signature.', { status: 400 });
  }
  if (!webhookSecret) {
     console.error("Webhook Error: Missing Stripe webhook secret.");
     return new NextResponse('Webhook Error: Missing configuration.', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log(`Stripe event constructed successfully: ${event.id} (Type: ${event.type})`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown signature verification error";
    console.error(`Webhook signature verification failed: ${message}`);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const sessionData = event.data.object as Stripe.Checkout.Session;
      const sessionId = sessionData.id;
      const metadata = sessionData.metadata as CheckoutSessionMetadata | null;
      const clerkIdFromMetadata = metadata?.internalUserId;
      const licenseIdsString = metadata?.licenseIds;
      const totalAmount = sessionData.amount_total ? sessionData.amount_total / 100 : 0;
      const paymentStatus = sessionData.payment_status;

      console.log(`Processing checkout.session.completed for Session ID: ${sessionId}`);

      // --- Fulfillment Logic --- 
      if (paymentStatus !== 'paid') {
        console.log(`Session ${sessionId} payment status is ${paymentStatus}, skipping fulfillment.`);
        return new NextResponse(JSON.stringify({ received: true, skipped: 'payment not completed' }), { status: 200 });
      }
      if (!sessionId || !clerkIdFromMetadata || !licenseIdsString) {
        console.error(`Webhook Error: Missing critical metadata for session ${sessionId}. Clerk User ID: ${clerkIdFromMetadata}, Licenses: ${licenseIdsString}`);
        return new NextResponse(JSON.stringify({ received: true, error: 'missing metadata' }), { status: 200 }); 
      }

      let licenseIds: string[];
      try {
        licenseIds = licenseIdsString.split(',').map(id => id.trim()).filter(id => !!id);
        if (licenseIds.length === 0) {
          throw new Error('Parsed licenseIds resulted in an empty array.');
        }
      } catch (parseError: unknown) {
        const errorMessage = parseError instanceof Error 
          ? (parseError as Error).message 
          : 'Unknown parsing error'; 
        console.error(`Webhook Error: Failed to parse licenseIds from metadata string "${licenseIdsString}" for session ${sessionId}:`, errorMessage);
        return new NextResponse(JSON.stringify({ received: true, error: 'invalid licenseIds format' }), { status: 200 }); 
      }

      try {
        await prisma.$transaction(async (tx) => {
          const existingOrder = await tx.order.findUnique({
            where: { stripeCheckoutSessionId: sessionId },
            select: { id: true }
          });

          if (existingOrder) {
            console.log(`Order for session ${sessionId} already processed (Order ID: ${existingOrder.id}). Skipping.`);
            return;
          }

          const user = await tx.user.findUnique({
            where: { clerkId: clerkIdFromMetadata },
            select: { id: true }
          });

          if (!user) {
            console.error(`Webhook Error: No internal user found for Clerk ID: ${clerkIdFromMetadata} from session ${sessionId}. Cannot create order.`);
            throw new Error(`User not found for Clerk ID: ${clerkIdFromMetadata}. Fulfillment cannot proceed for session ${sessionId}.`);
          }
          const actualInternalUserId = user.id;

          console.log(`Creating Order record for user ${actualInternalUserId}, session ${sessionId}`);
          const order = await tx.order.create({
            data: {
              customerId: actualInternalUserId,
              stripeCheckoutSessionId: sessionId,
              totalAmount: totalAmount, 
              status: 'COMPLETED',
            },
            select: { id: true }
          });
          console.log(`Created Order ID: ${order.id}`);

          // --- BEGIN DETAILED LOGGING FOR LICENSE IDS ---
          console.log(`[Webhook DEBUG] Raw licenseIdsString from metadata: "${licenseIdsString}"`);
          console.log(`[Webhook DEBUG] Parsed licenseIds array before query:`, licenseIds);
          // --- END DETAILED LOGGING FOR LICENSE IDS ---

          console.log(`Fetching details for licenses: ${licenseIds.join(', ')}`);
          const licensesDetails = await tx.license.findMany({
            where: { id: { in: licenseIds } },
            select: {
              id: true,
              price: true, 
              trackId: true,
            }
          });

          if (licensesDetails.length !== licenseIds.length) {
             console.error(`License mismatch for order ${order.id}. Requested: ${licenseIds.length}, Found: ${licensesDetails.length}`);
             throw new Error('License data mismatch during order creation.');
          }

          console.log(`Creating ${licensesDetails.length} OrderItem records for Order ID: ${order.id}`);
          const orderItemsData = licensesDetails.map(lic => ({
            orderId: order.id,
            licenseId: lic.id,
            trackId: lic.trackId,
            price: lic.price, 
          }));

          await tx.orderItem.createMany({ data: orderItemsData });
          console.log(`Created OrderItems successfully.`);

          console.log(`Granting download permissions for user ${actualInternalUserId}, order ${order.id}`);
          const downloadPermissionsData = await Promise.all(licensesDetails.map(async (lic) => {
            const relatedOrderItem = await tx.orderItem.findFirst({
                where: {
                    orderId: order.id,
                    licenseId: lic.id,
                    trackId: lic.trackId
                },
                select: { id: true }
            });
            if (!relatedOrderItem) {
                console.warn(`Could not find OrderItem for license ${lic.id} in order ${order.id} when granting permissions.`);
                return null;
            }
            return {
                userId: actualInternalUserId!,
                trackId: lic.trackId,
                orderId: order.id,
                orderItemId: relatedOrderItem.id
            };
          }));
          
          // Use type predicate for filtering and type safety
          const validPermissions = downloadPermissionsData.filter(
            (p): p is UserDownloadPermissionCreateData => p !== null
          );
          if (validPermissions.length > 0) {
              await tx.userDownloadPermission.createMany({ data: validPermissions });
              console.log(`Granted download permissions successfully.`);
          } else {
              console.warn(`No valid download permissions to grant for order ${order.id}.`);
          }

          const trackIdsToIncrement = [...new Set(licensesDetails.map(l => l.trackId))];
          console.log(`Incrementing sales count for tracks: ${trackIdsToIncrement.join(', ')}`);
          await tx.track.updateMany({
              where: { id: { in: trackIdsToIncrement } },
              data: { salesCount: { increment: 1 } }, 
          });
          console.log(`Incremented sales counts.`);

        }); 

        console.log(`Successfully processed order for session ${sessionId}`);

      } catch (error) {
        console.error(`Error processing fulfillment for session ${sessionId}:`, error);
        return new NextResponse(JSON.stringify({ received: true, error: 'fulfillment failed' }), { status: 200 });
      }
      break;
    }
    default:
      console.warn(`Unhandled Stripe event type: ${event.type}`);
  }

  return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
}
