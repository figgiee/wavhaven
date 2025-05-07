---
description: 
globs: prisma/schema.prisma,src/lib/prisma.ts,src/server-actions/**/*.ts,src/app/**/*.ts,src/app/**/*.tsx
alwaysApply: false
---
---
ruleType: Auto Attached
filePatterns:
  - "prisma/schema.prisma"       # The schema file itself
  - "src/lib/prisma.ts"          # Prisma client setup
  - "src/server-actions/**/*.ts" # Actions likely interacting with DB
  - "src/app/**/*.{ts,tsx}"      # Server components fetching data
description: Conventions for using Prisma ORM, managing the schema, writing queries, and handling migrations in Wavhaven. Applies to schema, client setup, and data access code.
---
# Prisma & Database Usage Conventions for Wavhaven

- **ORM:** Use **Prisma** as the ORM for interacting with the PostgreSQL database.
- **Schema:** The single source of truth for database structure is `prisma/schema.prisma`. Ensure models (`User`, `Track`, `License`, `Order`, etc.) and relations are correctly defined. Remember `User.clerkId` is nullable.
- **Client:** Use the singleton Prisma Client instance initialized in `src/lib/prisma.ts` for all database operations. Import this instance (`import prisma from '@/lib/prisma';`).
- **Queries:** Write type-safe database queries using the Prisma Client API (e.g., `prisma.user.findUnique`, `prisma.track.create`). Use `include` or `select` options to fetch related data efficiently.
- **Migrations:** Manage database schema changes using Prisma Migrate (`npx prisma migrate dev`). Always generate descriptive migration names.
- **Generation:** Run `npx prisma generate` after any schema changes to update the Prisma Client types.