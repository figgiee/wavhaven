---
description: 
globs: src/app/api/**/route.ts
alwaysApply: false
---
---
ruleType: Auto Attached
filePatterns:
  - "src/app/api/**/route.ts"   # Target Next.js API Route Handlers
description: Conventions for designing API Route Handlers (e.g., webhooks) in Wavhaven, focusing on request handling, response structure, and status codes.
---
# API Route Handler Design Conventions for Wavhaven

- **Purpose:** Use API Route Handlers (`route.ts`) primarily for incoming webhooks (e.g., Stripe) or specific server-to-server communication needs. Prefer Server Actions for client-triggered mutations.
- **Request Handling:**
    - Clearly define handlers for specific HTTP methods (`GET`, `POST`, `PUT`, etc.).
    - Validate request bodies, headers (e.g., webhook signatures), and URL parameters rigorously, often using Zod.
    - Handle potential errors gracefully using `try...catch`.
- **Response Structure:**
    - Return responses using `NextResponse` from `next/server`.
    - For successful requests returning data, use `NextResponse.json(data, { status: 200 })`.
    - For successful requests with no content to return (e.g., webhook received OK), use `new NextResponse(null, { status: 204 })` or `NextResponse.json({ received: true }, { status: 200 })`.
- **Status Codes:** Use appropriate HTTP status codes:
    - `200 OK`: Standard success for GET or POST returning data.
    - `201 Created`: Success after creating a resource (if applicable).
    - `204 No Content`: Success with no response body needed.
    - `400 Bad Request`: Client error (e.g., invalid input, missing data).
    - `401 Unauthorized`: Authentication required or failed (e.g., invalid webhook signature).
    - `403 Forbidden`: Authenticated but not authorized to perform the action.
    - `404 Not Found`: Resource not found.
    - `405 Method Not Allowed`: HTTP method not supported by the route.
    - `500 Internal Server Error`: Unexpected server-side error.
- **Logging:** Log incoming requests (headers/body snippets if safe) and any errors encountered for debugging purposes.