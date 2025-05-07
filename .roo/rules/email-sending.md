---
description: 
globs: src/lib/email.ts,src/app/api/webhooks/stripe/route.ts
alwaysApply: false
---
---
ruleType: Auto Attached
filePatterns:
  - "src/lib/email.ts"                     # Email utility setup and functions
  - "src/app/api/webhooks/stripe/route.ts"  # Webhook triggering guest emails
description: Conventions for using the configured email service (e.g., Resend) via utilities, primarily for sending guest order confirmations/download links.
---
# Email Sending Conventions for Wavhaven

- **Provider:** Use the configured email service (e.g., Resend).
- **Client:** Initialize the email service client in `src/lib/email.ts`.
- **Usage:** Primarily used for sending order confirmation and download links to **guest users** after successful payment (triggered from the Stripe webhook handler).
- **Functions:** Implement specific email sending functions within `src/lib/email.ts`, such as `sendOrderConfirmationEmail(to: string, orderDetails: any, downloadLinks: string[])`.
- **Templates:** (Optional but recommended) Use email templates (e.g., using React Email or simple template strings) for consistent formatting.
- **Environment Variables:** Ensure the Email Service API Key and From Address are set in `.env`.