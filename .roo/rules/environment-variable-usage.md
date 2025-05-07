---
description: 
globs: **/*.ts,**/*.tsx,**/*.mjs,.env,.env.example
alwaysApply: false
---
---
ruleType: Auto Attached
filePatterns:
  - "**/*.{ts,tsx,mjs}"        # Any file potentially accessing env vars
  - ".env"                     # The env file itself (as context)
  - ".env.example"             # The example file
description: Conventions for accessing and managing environment variables in Wavhaven, distinguishing between server/client access.
---
# Environment Variable Usage Conventions for Wavhaven

- **Source:** Environment variables are loaded from the `.env` file (do not commit `.env`). Use `.env.example` to document required variables.
- **Server-Side Access:** Access variables directly using `process.env.VARIABLE_NAME` in server-side code (Server Components, Server Actions, API Routes, `lib` files used server-side).
- **Client-Side Access:** Variables needed in the browser **must** be prefixed with `NEXT_PUBLIC_`. Access them as `process.env.NEXT_PUBLIC_VARIABLE_NAME`. Ensure only non-sensitive variables are exposed this way.
- **Type Safety:** (Optional but recommended) Consider using Zod or a similar library to validate and provide type safety for environment variables, especially on the server side during application startup.
- **Never commit `.env` files.** Use `.env.example` for tracking required variables.