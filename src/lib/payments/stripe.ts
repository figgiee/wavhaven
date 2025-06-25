import Stripe from 'stripe';

// Ensure the Stripe secret key environment variable is defined
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Stripe secret key is not defined in environment variables.');
}

// Initialize the Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use the latest API version or your preferred version
  typescript: true,
}); 
