---
description: 
globs: src/stores/cartStore.ts,src/components/**/*.ts,src/components/**/*.tsx,src/server-actions/stripeActions.ts,src/app/api/webhooks/stripe/route.ts,src/lib/email.ts
alwaysApply: false
---
---
ruleType: Auto Attached
filePatterns:
  - "src/stores/cartStore.ts"         # Cart state management
  - "src/components/**/*.{ts,tsx}"    # UI components needing guest logic (cart view, checkout button)
  - "src/server-actions/stripeActions.ts" # Checkout action handling guests
  - "src/app/api/webhooks/stripe/route.ts" # Webhook handling guest fulfillment
  - "src/lib/email.ts"                # Email sending for guests
description: Specific conventions for handling unauthenticated Guest users in Wavhaven, including state management, checkout flow, email capture, and fulfillment.
---
# Guest User Handling Conventions for Wavhaven

- **Identification:** Guests are unauthenticated (`auth().userId` is null). They interact anonymously until checkout.
- **State:** Use client-side state (Zustand store `src/stores/cartStore.ts` persisted to localStorage) to manage guest actions like adding items to the cart.
- **Checkout:**
    - Capture the guest's email address via the UI before calling the `createCheckoutSession` server action.
    - The `createCheckoutSession` action must handle the `guestEmail` input.
    - Find or create a `User` record with `role = GUEST`, the provided `email`, and `clerkId = null`. Use this internal `User.id` as the `client_reference_id` for Stripe.
- **Fulfillment:** The Stripe webhook handler must identify guest orders (by checking the `User` record linked via `client_reference_id`). For guests, it must trigger sending an email (via `src/lib/email.ts`) containing secure, time-limited download links generated using `createSignedUrl` from `src/lib/storage.ts`.
- **UI:** Conditionally render UI elements. Actions requiring login (upload, like, comment, access dashboards) should be hidden, disabled, or prompt guests to log in/sign up.