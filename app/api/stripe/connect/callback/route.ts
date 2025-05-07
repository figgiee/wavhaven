import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

// Handles the user being redirected back from Stripe Connect onboarding
export async function GET(request: NextRequest) {
  // You could potentially fetch the Stripe account status here if needed,
  // but often just redirecting is sufficient as Stripe handles the flow.
  // const searchParams = request.nextUrl.searchParams
  // const accountId = searchParams.get('account_id') // Example: If Stripe sends account ID back

  // Redirect the user back to their dashboard
  // The dashboard page should ideally check the Stripe account status again if needed.
  console.log("User returned from Stripe Connect onboarding, redirecting to dashboard...");
  redirect('/producer/dashboard');
} 