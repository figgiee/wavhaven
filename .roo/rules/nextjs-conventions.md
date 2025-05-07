---
description: 
globs: src/app/**/*.ts,src/app/**/*.tsx,src/server-actions/**/*.ts,src/middleware.ts,next.config.mjs
alwaysApply: false
---
ruleType: Auto Attached
filePatterns: [ "src/app/**/*.{ts,tsx}", "src/server-actions/**/*.ts", "src/middleware.ts", "next.config.mjs" ]
description: Conventions for Next.js App Router usage, Server/Client components, routing, data fetching, and Server Actions in Wavhaven. Applies to most app code.
---
# Next.js (App Router) Conventions for Wavhaven

- **Architecture:** Use the Next.js App Router (`src/app/`).
- **Components:** Prioritize React Server Components (RSCs) by default. Use Client Components (`"use client"`) only when necessary (hooks, interactivity, browser APIs).
- **Routing:** Use file-based routing. Group routes using parentheses `(group)` where appropriate (e.g., `(auth)`, `(producer)`).
- **Data Fetching:** Fetch data in Server Components directly using async/await (e.g., with Prisma). Use Route Handlers (`route.ts`) for API endpoints like webhooks.
- **Server Actions:** Implement mutations and server-side logic callable from Client Components using Server Actions located in `src/server-actions/`. Ensure proper error handling and security checks within actions.