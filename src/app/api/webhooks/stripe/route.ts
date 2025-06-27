import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/payments/stripe'; // Your initialized Stripe client
import { prisma } from '@/lib/db/prisma';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { createSignedUrl } from '@/lib/storage';
import { TrackFileType, OrderStatus } from '@prisma/client'; // Import enum if needed for filtering
import { posthogServerClient } from '@/lib/posthog-server'; // Import PostHog client

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set.');
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
  }

  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // --- Handle specific event types ---

  // Handle the account.updated event for Stripe Connect
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;
    console.log('Processing account.updated event for Stripe Account ID:', account.id);

    const stripeAccountId = account.id;
    const isReady = account.details_submitted && account.charges_enabled;

    try {
      await prisma.sellerProfile.update({
        where: { stripeAccountId: stripeAccountId },
        data: { stripeAccountReady: isReady },
      });
      console.log(`Successfully updated SellerProfile for ${stripeAccountId}. Ready status: ${isReady}`);

      // Optional: Send PostHog event
      const sellerProfile = await prisma.sellerProfile.findUnique({
          where: { stripeAccountId: stripeAccountId },
          select: { userId: true }
      });
      if (posthogServerClient && sellerProfile) {
          posthogServerClient.capture({
            distinctId: sellerProfile.userId,
            event: 'stripe_account_updated',
            properties: {
              stripeAccountId: stripeAccountId,
              stripeAccountReady: isReady,
              detailsSubmitted: account.details_submitted,
              chargesEnabled: account.charges_enabled,
            },
          });
      }

    } catch (error) {
      console.error(`Failed to update SellerProfile for Stripe Account ${stripeAccountId}:`, error);
      // Return a 500 to indicate to Stripe that it should retry
      return NextResponse.json({ error: 'Database update failed.' }, { status: 500 });
    }
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log('Processing checkout.session.completed event for session:', session.id);

    // --- Extract necessary data from METADATA ---
    const { internalUserId, licenseIds: licenseIdsString } = session.metadata || {};
    const amountTotal = session.amount_total;
    const customerEmailFromStripe = session.customer_details?.email; 

    if (!internalUserId || !licenseIdsString) {
      console.error('Webhook Error: Missing internalUserId or licenseIds in session metadata for session:', session.id);
      return NextResponse.json({ error: 'Missing required metadata in session.' }, { status: 400 });
    }

    const licenseIds = licenseIdsString.split(',');
    if (!Array.isArray(licenseIds) || licenseIds.length === 0) {
      console.error('Webhook Error: Invalid licenseIds format in metadata:', licenseIdsString);
      return NextResponse.json({ error: 'Invalid license data in session.' }, { status: 400 });
    }
    
    console.log(`[Webhook] Extracted Metadata: internalUserId=${internalUserId}, licenseIds=${licenseIds.join(', ')}`);

    try {
      // --- Process Order --- 
      console.log(`Starting order processing for user ${internalUserId} and licenses ${licenseIds.join(', ')}`);

      // Fetch user and license details concurrently
      const [user, licensesFromDb] = await Promise.all([
        prisma.user.findUnique({
          where: { id: internalUserId },
          select: { id: true, email: true, role: true },
        }),
        prisma.license.findMany({
          where: { id: { in: licenseIds } }, // Fetch licenses matching the IDs from metadata
          select: { id: true, price: true, type: true, trackId: true, track: { select: { title: true, producerId: true}} }, 
        }),
      ]);

      if (!user) {
        console.error(`User not found for internalUserId: ${internalUserId}`);
        return NextResponse.json({ error: 'User associated with order not found.' }, { status: 404 });
      }

      // --- Handle License Mismatch Gracefully ---
      const foundLicenseIds = new Set(licensesFromDb.map(l => l.id));
      const missingLicenseIds = licenseIds.filter(id => !foundLicenseIds.has(id));
      
      if (missingLicenseIds.length > 0) {
          console.warn('License mismatch: Some requested licenses were not found in DB.', {
              sessionId: session.id,
              requested: licenseIds,
              missing: missingLicenseIds,
              found: Array.from(foundLicenseIds)
          });
          // Continue processing with the licenses that *were* found
          if (licensesFromDb.length === 0) {
              console.error(`No valid licenses found for order based on session ${session.id}. Aborting.`);
              // Update order status to FAILED if we created one? Or just return error?
              // For now, just return error before creating order.
              return NextResponse.json({ error: 'No valid licenses found for this order.' }, { status: 400 });
          }
      }
      // Use licensesFromDb (the ones confirmed to exist) for subsequent steps
      const validLicenses = licensesFromDb;
      // -----------------------------------------

      const orderData = {
        customerId: user.id,
        totalAmount: amountTotal ?? 0, // Use amount from session
        stripeCheckoutSessionId: session.id, // Use the session ID as the reference
        status: OrderStatus.PENDING, // Use Enum: Start as PENDING
      };

      // Use transaction for atomicity
      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
            data: orderData,
            select: { id: true, createdAt: true }, // Select ID and createdAt for email
        });

        // Use validLicenses (found ones) here
        const orderItemsData = validLicenses.map(license => ({
            orderId: newOrder.id,
            licenseId: license.id,
            price: license.price, 
            trackId: license.trackId, 
        }));

        await tx.orderItem.createMany({ data: orderItemsData });
        
        // --- >>> 3. Create UserDownloadPermission Records <<< ---
        const downloadPermissionsData = validLicenses.map(license => ({
            userId: user.id,
            trackId: license.trackId,
            licenseType: license.type, // Store the license type for reference
            orderId: newOrder.id, // Link back to the order
        }));

        await tx.userDownloadPermission.createMany({ data: downloadPermissionsData });
        // --- >>> END <<< ---

        console.log(`Order ${newOrder.id} and permissions created successfully in transaction.`);
        // Return order and valid licenses for fulfillment step
        return { ...newOrder, licenses: validLicenses }; 
      });
      
      console.log(`Order ${order.id} DB processing complete for user ${user.id}. Proceeding to fulfillment.`);

      // --- Post-Transaction Fulfillment & Status Update ---
      let fulfillmentSuccessful = false;
      try {
          // Update status to indicate fulfillment is starting
          await prisma.order.update({
             where: { id: order.id },
             data: { status: OrderStatus.PENDING }
          });
          console.log(`Order ${order.id} status updated to FULFILLMENT_PENDING.`);

          // --- Fulfillment Logic (Guest Email & Download Links) ---
          if (user.role === 'GUEST') {
            console.log(`User ${user.id} is a guest. Preparing email fulfillment for order ${order.id}.`);
            const userEmailForGuest = user.email ?? customerEmailFromStripe;
            if (!userEmailForGuest) {
                console.error(`Cannot send email to guest ${user.id} for order ${order.id}: No email found in user record or Stripe session.`);
                // Log this, but don't necessarily fail the whole webhook response
                // Status remains FULFILLMENT_PENDING
            } else {
                const trackIds = order.licenses.map(l => l.trackId);
                const trackFiles = await prisma.trackFile.findMany({
                    where: {
                        trackId: { in: trackIds },
                        // Define included file types for download links more clearly
                        fileType: { in: [TrackFileType.MAIN_MP3, TrackFileType.MAIN_WAV, TrackFileType.STEMS_ZIP] } 
                    },
                    // Include fileName if it exists in your schema (Added to example)
                    select: { storagePath: true, trackId: true, fileType: true /*, fileName: true */ }
                });

                const downloadLinksMap = new Map<string, { name: string, url: string }[]>(); // Store {name, url}
                
                for (const file of trackFiles) {
                    try {
                        const url = await createSignedUrl(file.storagePath);
                        const links = downloadLinksMap.get(file.trackId) || [];
                        // Attempt to create a meaningful name
                        const fileName = file.storagePath.split('/').pop() || `file-${file.fileType}`; 
                        links.push({ name: fileName, url: url }); 
                        downloadLinksMap.set(file.trackId, links);
                    } catch (urlError) {
                        // Log error but continue generating other URLs
                        console.error(`Failed to create signed URL for ${file.storagePath} (Order: ${order.id}):`, urlError);
                    }
                }
                
                // Structure data for email template
                const emailOrderDetails = {
                    orderId: order.id,
                    orderDate: order.createdAt,
                    totalPrice: amountTotal ?? 0,
                    items: order.licenses.map(l => ({ 
                        trackTitle: l.track.title,
                        licenseType: l.type.toString(),
                        price: Number(l.price), 
                        // Pass download links specific to this track/license if needed
                        // downloadLinks: downloadLinksMap.get(l.trackId) || [] 
                    }))
                };
                // Flatten all links for a simple list in the email for now - extract just URLs
                const allDownloadLinks = Array.from(downloadLinksMap.values()).flat().map(link => link.url);

                console.log(`Sending order confirmation email to guest: ${userEmailForGuest} for order ${order.id}`);
                const emailResult = await sendOrderConfirmationEmail(userEmailForGuest, emailOrderDetails, allDownloadLinks);
                
                if (!emailResult.success) {
                    console.error(`Failed to send confirmation email to ${userEmailForGuest} for order ${order.id}: ${emailResult.error}`);
                    // Keep status FULFILLMENT_PENDING for potential retry
                } else {
                    console.log(`Confirmation email sent successfully for order ${order.id}.`);
                    fulfillmentSuccessful = true;
                }
            }
          } else {
             // Logic for registered users (e.g., maybe just update DB, no email needed?)
             console.log(`Order ${order.id} for registered user ${user.id}. Assuming fulfillment complete (access via account).`);
             fulfillmentSuccessful = true; // Assume complete for registered users
          }

          // --- Final Status Update based on Fulfillment Attempt --- 
          if (fulfillmentSuccessful) {
              await prisma.order.update({
                  where: { id: order.id },
                  data: { status: OrderStatus.COMPLETED }
              });
              console.log(`Order ${order.id} status updated to COMPLETED.`);
          } else {
              // Log that status remains FULFILLMENT_PENDING
              console.log(`Order ${order.id} fulfillment incomplete/failed. Status remains FULFILLMENT_PENDING.`);
          }

      } catch (fulfillmentError) {
          console.error(`Error during post-transaction fulfillment for order ${order.id}:`, fulfillmentError);
          // Status should already be FULFILLMENT_PENDING from the try block start
          // Log error, but don't fail the webhook response itself, as DB transaction succeeded.
      }

      // --- PostHog Event Tracking (disabled) --- 
      // PostHog server-side tracking is currently disabled in posthog-server.ts
      console.log(`Order completed tracking: ${order.id} - Status: ${fulfillmentSuccessful ? 'COMPLETED' : 'PENDING'}`);
      // ----------------------------- 

    } catch (error) {
      console.error('Error processing webhook event (before/during transaction):', error);
       // --- Update Order Status to FAILED if transaction failed or error before ---
       // This requires knowing the order ID if the transaction partially started or failed.
       // If error happened before transaction, there's no order to update.
       // If error happened *during* transaction, it rolls back - nothing to update.
       // So, only update if we have an order ID AND the error is *after* the transaction block
       // but before fulfillment starts (which is now handled by the fulfillment try/catch).
       // This specific FAILED update might be less necessary now.

      // --- PostHog Event Tracking for Failure (disabled) --- 
      // PostHog server-side tracking is currently disabled in posthog-server.ts
      console.log(`Order processing failed tracking: Session ${session?.id}`);
      // -----------------------------------------
      return NextResponse.json({ error: 'Failed to process order.' }, { status: 500 });
    }
  }
  
  // Return a 200 response to acknowledge receipt of the event
  return NextResponse.json({ received: true });
} 