import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Get the necessary headers
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set in .env');
    return new Response('Error occured: Missing webhook secret', {
      status: 500,
    });
  }

  // Get headers from the request object
  const svix_id = req.headers.get('svix-id');
  const svix_timestamp = req.headers.get('svix-timestamp');
  const svix_signature = req.headers.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured: No svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured: Invalid signature', {
      status: 400,
    });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Webhook with an ID of ${id} and type of ${eventType}`);
  // console.log('Webhook body:', body);

  // --- Handle Specific Events ---

  // USER CREATED
  if (eventType === 'user.created') {
    const { id: clerkId, email_addresses, first_name, last_name, image_url, primary_email_address_id, username } = evt.data;

    // --- Find Primary Email More Robustly ---
    const primaryEmail = email_addresses?.find(e => e.id === primary_email_address_id)?.email_address;
    if (!primaryEmail) {
        console.error(`Clerk user.created event for ${clerkId}: Primary email not found.`);
        // Decide handling: error out, or proceed without email? 
        // Proceeding might be okay if email isn't strictly required immediately.
        // For now, return error to indicate problem.
        return NextResponse.json({ message: 'Primary email not found for created user' }, { status: 400 });
    }
    // -------------------------------------

    try {
      await prisma.user.create({
        data: {
          clerkId: clerkId,
          username: username || null, // Use the username from Clerk, fallback to null
          email: primaryEmail, // Use the robustly found primary email
          name: `${first_name || ''} ${last_name || ''}`.trim() || null, // Combine names, handle nulls
        },
      });
      console.log(`Successfully created user record for Clerk ID: ${clerkId}`);
      return NextResponse.json({ message: 'User created' }, { status: 201 });
    } catch (error) {
      console.error('Error creating user in DB:', error);
      return NextResponse.json(
        { message: 'Error creating user' },
        { status: 500 }
      );
    }
  }

  // USER UPDATED
  if (eventType === 'user.updated') {
    const { id: clerkId, email_addresses, first_name, last_name, image_url, primary_email_address_id, username } = evt.data;

    // --- Find Primary Email More Robustly ---
    const primaryEmail = email_addresses?.find(e => e.id === primary_email_address_id)?.email_address;
    if (!primaryEmail) {
        console.error(`Clerk user.updated event for ${clerkId}: Primary email not found.`);
        // If email update is critical, return error. Otherwise, maybe update other fields?
        // For consistency, return error like in create.
        return NextResponse.json({ message: 'Primary email not found for updated user' }, { status: 400 });
    }
    // -------------------------------------

    try {
      const updatedUser = await prisma.user.update({
        where: { clerkId: clerkId },
        data: {
          username: username || null, // Update username from Clerk, fallback to null
          email: primaryEmail, // Use the robustly found primary email
          name: `${first_name || ''} ${last_name || ''}`.trim() || null,
        },
      });
      console.log(`Successfully updated user record for Clerk ID: ${clerkId}`);
      return NextResponse.json({ message: 'User updated' }, { status: 200 });
    } catch (error: any) {
       // Handle case where user might not exist in our DB yet (e.g., if created before webhook setup)
      if (error.code === 'P2025') { // Prisma code for record not found
         console.warn(`User update webhook received for Clerk ID ${clerkId}, but DB record not found. Ignoring.`);
         return NextResponse.json({ message: 'User not found in DB, update ignored' }, { status: 200 }); // Still acknowledge webhook
      } else {
        console.error('Error updating user in DB:', error);
        return NextResponse.json(
          { message: 'Error updating user' },
          { status: 500 }
        );
      }
    }
  }

  // USER DELETED
  if (eventType === 'user.deleted') {
    const { id: clerkId, deleted } = evt.data; // Get deleted status

    // Check if deletion is permanent or just marked
    // Note: Clerk might send user.deleted even for soft deletes depending on settings.
    // We assume we want to delete from our DB if Clerk says deleted. Adjust if needed.
    if (!clerkId) {
       console.error('User deleted event missing ID:', evt.data);
       return NextResponse.json({ message: 'User deleted event missing ID' }, { status: 400 });
    }

    try {
      // Use deleteMany just in case (though clerkId should be unique)
      // Ignore if the user doesn't exist in our DB (idempotency)
      await prisma.user.deleteMany({
        where: { clerkId: clerkId },
      });
      console.log(`Successfully deleted user record for Clerk ID: ${clerkId}`);
      return NextResponse.json({ message: 'User deleted' }, { status: 200 });
    } catch (error: any) {
      // Handle case where user might not exist (e.g., already deleted)
      if (error.code === 'P2025') {
         console.warn(`User delete webhook received for Clerk ID ${clerkId}, but DB record already gone. Ignoring.`);
         return NextResponse.json({ message: 'User not found in DB, delete ignored' }, { status: 200 });
      } else {
         console.error('Error deleting user from DB:', error);
         return NextResponse.json(
            { message: 'Error deleting user' },
            { status: 500 }
         );
      }
    }
  }

  // If event type is not handled
  console.log(`Unhandled webhook event type: ${eventType}`);
  return NextResponse.json(
    { message: 'Webhook received but event type not handled' },
    { status: 200 } // Acknowledge receipt even if not handled
  );
} 