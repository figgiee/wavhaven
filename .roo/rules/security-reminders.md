---
description: 
globs: 
alwaysApply: false
---
---
ruleType: Manual                 # Good to review periodically or attach when dealing with sensitive operations.
filePatterns: []
description: Key security reminders and best practices relevant to the Wavhaven application stack.
---
# Security Reminders for Wavhaven

- **Authorization:** ALWAYS verify user authentication (`auth().userId`) and authorization (roles/ownership via internal DB checks) in Server Actions and API Routes before performing mutations or accessing sensitive data. Do not rely solely on client-side checks.
- **Input Validation:** Validate ALL input received from the client (form data, URL parameters, request bodies) in Server Actions and API Routes using libraries like Zod. Sanitize data appropriately before database insertion or display. Protect against common vulnerabilities like Cross-Site Scripting (XSS) and SQL Injection (Prisma helps with SQLi, but validation is still key).
- **Secrets Management:** NEVER commit secrets (API keys, database URLs, webhook secrets) directly into the codebase. Use environment variables loaded from `.env` (which is in `.gitignore`).
- **Environment Variables:** Only expose variables to the client-side using the `NEXT_PUBLIC_` prefix if they are explicitly non-sensitive.
- **Dependencies:** Keep dependencies updated to patch known vulnerabilities. Regularly audit dependencies.
- **Rate Limiting:** Consider implementing rate limiting on sensitive endpoints (like login, signup, potentially high-cost actions) if abuse becomes a concern.
- **Secure Downloads:** Ensure download links for purchased tracks (especially via Supabase signed URLs) are time-limited and cannot be easily guessed or enumerated. Verify purchase authorization before generating a link.