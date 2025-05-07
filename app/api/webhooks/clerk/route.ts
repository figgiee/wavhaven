import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import prisma from "@/lib/prisma"; // Import Prisma Client
import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client'; // Import UserRole enum if needed for default
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'; // Import Prisma error type

// Helper function for basic SQL string escaping - NO LONGER NEEDED
// function escapeSqlString(value: string | null | undefined): string {
//     if (value === null || value === undefined) {
//         return 'NULL';
//     }
//     // Basic escaping: replace single quotes with two single quotes
//     return "'" + value.replace(/'/g, "''") + "'";
// }


export async function POST(req: Request) {
  console.log("--- Clerk Webhook Received ---");

  // Get the necessary headers from the Request object
  const svix_id = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Webhook Error: Missing Svix headers");
    return new Response('Error occured -- no svix headers', { status: 400 });
  }
  console.log("Svix Headers:", { svix_id, svix_timestamp });

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);
  console.log("Webhook Payload Type:", payload.type);

  // Get the Svix webhook secret from environment variables
  const whSec = process.env.CLERK_WEBHOOK_SECRET;
  if (!whSec) {
    console.error("Webhook Error: CLERK_WEBHOOK_SECRET not set in environment variables.");
    // Use NextResponse for standard API responses
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Create a new Svix instance with your secret.
  const wh = new Webhook(whSec);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    const headersForVerification = {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
    };
    evt = wh.verify(body, headersForVerification) as WebhookEvent;
    console.log("Webhook verified successfully.");
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown verification error';
    console.error('Webhook Error: Failed to verify webhook:', error);
    // Use NextResponse
    return NextResponse.json({ error: `Webhook verification failed: ${error}` }, { status: 400 });
  }

  // Get the ID and type
  // const { id } = evt.data; // Use clerkId below directly
  const eventType = evt.type;

  // console.log(`Webhook processing event: Type=${eventType}, ID=${id}`); // Log clerkId instead

  // --- Handle User Creation/Update ---
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id: clerkId, email_addresses, first_name, last_name, image_url, username: clerkUsername } = evt.data;

    const email = email_addresses?.[0]?.email_address;
    if (!email) {
      console.error("Webhook Error: No primary email address found for user:", clerkId);
      return new Response('Error: Missing primary email address', { status: 400 });
    }

    // Prepare data for Prisma (using correct fields)
    const userData = {
      email: email,
      firstName: first_name ?? null, // Use correct field
      lastName: last_name ?? null,   // Use correct field
      username: clerkUsername ?? null,
      profileImageUrl: image_url ?? null,
      // Construct name here if needed for logging, but don't use in Prisma operation
      // combinedName: `${first_name ?? ''} ${last_name ?? ''}`.trim(), 
    };

    try {
      console.log(`Attempting Prisma upsert for Clerk ID: ${clerkId}...`);

      const upsertedUser = await prisma.user.upsert({
        where: { clerkId: clerkId },
        update: { // Data to update if user exists
          email: userData.email,
          // Use firstName and lastName instead of name
          firstName: userData.firstName,
          lastName: userData.lastName,
          username: userData.username,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(), // Ensure updatedAt is set on update
        },
        create: { // Data to create if user doesn't exist
          clerkId: clerkId,
          email: userData.email,
          // Use firstName and lastName instead of name
          firstName: userData.firstName,
          lastName: userData.lastName,
          username: userData.username,
          profileImageUrl: userData.profileImageUrl,
          role: UserRole.CUSTOMER, // Default role
          // Prisma handles id, createdAt, updatedAt defaults
        },
        select: { id: true, role: true } // Select necessary fields
      });

      console.log(`Prisma upsert successful for Clerk ID: ${clerkId}. Internal ID: ${upsertedUser.id}, Role: ${upsertedUser.role}`);

    } catch (error) {
      console.error(`Webhook Error: Failed to upsert user (Clerk ID: ${clerkId}) via Prisma:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      // Use NextResponse
      return NextResponse.json({ error: `Error processing user data in database: ${errorMessage}` }, { status: 500 });
    }
  } else if (eventType === 'user.deleted') {
     // --- Handle User Deletion ---
     const { id: clerkId, deleted } = evt.data;
     
     if (!clerkId) {
       console.error('Webhook Error: Missing clerkId for user.deleted event', evt.data);
       return NextResponse.json({ error: 'Missing user data (clerkId) for deletion' }, { status: 400 });
     }

     if (deleted) { // Ensure it's a real deletion event
       console.log(`Processing user.deleted for Clerk ID: ${clerkId}`);
       try {
         await prisma.user.delete({
           where: { clerkId: clerkId },
         });
         console.log(`Prisma delete successful for Clerk ID: ${clerkId}`);
       } catch (error) {
         // Handle cases where user might already be deleted gracefully
         if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') { // Prisma code for Record to delete does not exist
            console.log(`User with Clerk ID: ${clerkId} not found for deletion, likely already deleted.`);
         } else {
            console.error(`Webhook Error: Failed to delete user (Clerk ID: ${clerkId}) via Prisma:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            return NextResponse.json({ error: `Error deleting user data from database: ${errorMessage}` }, { status: 500 });
         }
       }
     } else {
         console.log(`Received user.deleted event for Clerk ID: ${clerkId}, but 'deleted' flag was not true.`);
     }

  } else {
     console.log(`Webhook received unhandled event type: ${eventType}`);
  }


  // console.log(`Webhook processed event: ID=${id}, Type=${eventType}`); // Can remove this or log clerkId
  console.log(`Webhook finished processing event: Type=${eventType}`);
  // Use NextResponse
  return NextResponse.json({ message: 'Webhook received successfully' }, { status: 200 });
} 