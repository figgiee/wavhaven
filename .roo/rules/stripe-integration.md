---
description: 
globs: src/server-actions/stripeActions.ts,src/app/api/webhooks/stripe/route.ts,src/lib/stripe.ts
alwaysApply: false
---
---
ruleType: Auto Attached
filePatterns:
  - "src/server-actions/stripeActions.ts" # Checkout session creation
  - "src/app/api/webhooks/stripe/route.ts" # Webhook handler
  - "src/lib/stripe.ts"                   # Stripe client setup (if exists)
description: Conventions for integrating Stripe Checkout, handling sessions, webhooks (checkout.session.completed), and differentiating guest/registered user fulfillment.
---
# Stripe Integration Conventions for Wavhaven

- **Usage:** Use Stripe for processing payments via Stripe Checkout.
- **Client:** Use the initialized Stripe server-side client (e.g., in server actions or `src/lib/stripe.ts`).
- **Checkout Session:**
    - Create sessions using `stripe.checkout.sessions.create` within the `createCheckoutSession` server action.
    - Include `line_items` based on the cart.
    - Pass the **internal `User.id`** (for both registered and guest users) as `client_reference_id`.
    - If the user is a guest, pass their email using the `customer_email` parameter.
    - Include necessary metadata (e.g., license IDs) if needed for fulfillment in the webhook.
    - Set `success_url` and `cancel_url`.
- **Webhook:**
    - Implement a webhook handler at `/api/webhooks/stripe` to listen for `checkout.session.completed`.
    - **Verify** the webhook signature using `STRIPE_WEBHOOK_SECRET`.
    - Retrieve the session and extract the internal `User.id` from `client_reference_id`.
    - Fetch the corresponding `User` record.
    - Create `Order` and `OrderItem` records in the database.
    - **Crucially:** Check if the user is a `GUEST`. If so, trigger the email sending process (`src/lib/email.ts`) with download links.
    - Implement idempotency checks (e.g., using the `StripeEvent` table).
- **Environment Variables:** Ensure Stripe Secret Key, Publishable Key, and Webhook Secret are correctly set in `.env`.