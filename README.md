# Wavhaven

Wavhaven is a modern marketplace platform for music producers to sell licenses for their beats, loops, soundkits, and presets, and for artists and creators to discover and purchase high-quality audio assets for their projects. It provides a rich feature set for artists to discover new music, including AI-powered recommendations, and engage with producers through social features like comments and playlists.

## Tech Stack

*   **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
*   **Backend:** Next.js Server Actions (organized with CQRS pattern)
*   **Database:** Supabase (PostgreSQL) with `pgvector` for AI similarity search
*   **Authentication:** Clerk
*   **AI & Machine Learning:**
    *   Supabase Edge Functions (Python) for embedding generation
*   **File Storage:** Supabase Storage
*   **Payments:** Stripe (Checkout & Connect)
*   **State Management:** Zustand
*   **Data Visualization:** Recharts
*   **Email:** Resend (or other, specify if changed)
*   **Analytics:** PostHog
*   **Testing:** Vitest, React Testing Library, Playwright

## Project Structure

*   `src/app/`: Next.js App Router routes and page components.
    *   `src/app/playlist/[playlistId]/`: Page for viewing a single playlist.
    *   `src/app/dashboard/playlists/`: User's playlists view in their dashboard.
*   `src/components/`: Shared UI components.
    *   `src/components/features/`: Feature-specific components (e.g., `SimilarTracks`, `AddToPlaylistButton`, `CreatePlaylistModal`).
    *   `src/components/dashboard/`: Components specific to the producer/user dashboard (e.g., `ProducerAnalyticsCharts`).
    *   `src/components/forms/`: Reusable form components.
    *   `src/components/layout/`: Layout components (header, footer).
    *   `src/components/ui/`: Shadcn/ui components.
*   `src/server-actions/`: Server Actions organized by domain and responsibility.
    *   `src/server-actions/tracks/`: Track-related operations.
        *   `trackQueries.ts`: Read operations (searches, fetching data).
        *   `trackMutations.ts`: Write operations (create, update, delete).
        *   `trackInteractions.ts`: User interactions (likes, play counts).
    *   `src/server-actions/users/`: User-related operations.
        *   `userQueries.ts`: User data retrieval.
        *   `userMutations.ts`: User profile management.
    *   `src/server-actions/ai/`: AI-related operations (e.g., fetching similar tracks).
    *   `src/server-actions/social/`: Social interactions (playlists, follows).
    *   `src/server-actions/admin/`: Administrative functions.
*   `src/lib/`: Core utilities, API clients, and shared services.
    *   `src/lib/db/`: Database configuration (Prisma).
    *   `src/lib/auth/`: Authentication utilities (Clerk).
    *   `src/lib/payments/`: Payment processing (Stripe).
    *   `src/lib/supabase/`: Supabase client configurations.
*   `src/services/`: Business logic and external service integrations.
*   `src/stores/`: Zustand state management stores.
*   `src/types/`: TypeScript type definitions organized by domain.
    *   `src/types/tracks/`: Track-related types.
    *   `src/types/users/`: User-related types.
    *   `src/types/licenses/`: License-related types.
*   `src/emails/`: React Email templates.
*   `prisma/`: Prisma schema and migrations.
*   `scripts/`: Standalone scripts for one-off tasks (e.g., `backfill-embeddings.js`).
*   `supabase/`: Supabase specific configurations and Edge Functions.
    *   `supabase/functions/generate-embedding/`: Python Edge Function for creating track embeddings.
*   `public/`: Static assets.

## Architecture Principles

This codebase follows **SOLID principles** and **Separation of Concerns (SoC)**:

*   **Single Responsibility Principle**: Each server action file has a focused responsibility.
*   **Command Query Responsibility Segregation (CQRS)**: Read operations are separated from write operations.
*   **Domain-Driven Organization**: Code is organized by business domain (tracks, users, etc.).
*   **Type Safety**: Comprehensive TypeScript coverage with domain-specific type organization.

## Getting Started

### Prerequisites

*   Node.js (version specified in `.nvmrc` or latest LTS)
*   pnpm (or npm/yarn)
*   Supabase account and project
*   Clerk account and application
*   Stripe account
*   PostHog account (optional)
*   Resend API key (optional, for emails)

### Environment Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/wavhaven.git
    cd wavhaven
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

3.  Set up environment variables:
    *   Copy `.env.example` to `.env.local`.
    *   Fill in the required API keys and URLs for Supabase, Clerk, Stripe, etc.
        ```
        # Example structure (refer to .env.example for all variables)
        DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-SUPABASE_PROJECT_REF].db.supabase.co:5432/postgres"
        DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-SUPABASE_PROJECT_REF].db.supabase.co:6543/postgres" # For Prisma Migrate

        NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-SUPABASE_PROJECT_REF].supabase.co"
        NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-SUPABASE_ANON_KEY]"
        SUPABASE_SERVICE_ROLE_KEY="[YOUR-SUPABASE_SERVICE_ROLE_KEY]" # For backend/admin operations

        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
        CLERK_SECRET_KEY="sk_test_..."
        NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
        NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
        NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
        NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

        STRIPE_SECRET_KEY="sk_test_..."
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
        STRIPE_WEBHOOK_SECRET="whsec_..."

        # ... other variables
        ```

4.  **Set up Supabase Database:**

    To get your database schema set up in your new Supabase project, follow these steps:

    *   **Ensure Necessary Extensions are Enabled (in Supabase SQL Editor):**
        *   Go to your Supabase project dashboard.
        *   Navigate to the "SQL Editor".
        *   Run the following SQL to enable the `uuid-ossp` and `vector` extensions:
            ```sql
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            CREATE EXTENSION IF NOT EXISTS "vector";
            -- Add any other CREATE EXTENSION IF NOT EXISTS lines here if your project requires them.
            ```

    *   **Apply Prisma Migrations (Locally):**
        *   This step will create the tables, columns, indexes, and relationships defined in `prisma/migrations/`.
        *   Open your terminal in the root of your cloned project.
        *   Run the following command:
            ```bash
            pnpm db:migrate
            ```
        *   This command connects to your Supabase database using the `DATABASE_URL` and `DIRECT_URL` from your `.env.local` file. If it's the first time or there are pending migrations, it will apply them.

    *   **Apply Supabase-Specific Migrations (Locally with Supabase CLI):**
        *   These migrations handle configurations like Row Level Security (RLS) policies, custom database functions, or other SQL not managed by Prisma, which are located in your local `supabase/migrations/` directory.
        *   **Log in to Supabase CLI and Link Project:**
            You'll use `npx` to run the Supabase CLI commands without needing a global installation.
            ```bash
            npx supabase login
            ```
            This will open a browser window asking you to authorize the CLI.
            Once logged in, link your local project to your remote Supabase project (replace `[YOUR-PROJECT-REF]` with your actual Supabase project reference ID, found in your Supabase project settings under "General"):
            ```bash
            npx supabase link --project-ref [YOUR-PROJECT-REF]
            ```
        *   **Push Supabase Migrations:**
            This command will apply any SQL files found in your local `supabase/migrations/` directory to your remote Supabase database.
            ```bash
            npx supabase db push
            ```
            Review the changes prompted by the CLI before confirming, if any.

    *   **(Optional) Seed initial data if you have a seed script:**
        If your project includes a Prisma seed script for essential initial data (e.g., default roles, categories):
        ```bash
        pnpm prisma db seed
        ```

5.  Configure Supabase Storage:
    *   Create a bucket named `wavhaven-tracks` (or as configured in `src/lib/storage.ts`).
    *   Set appropriate RLS policies for public/private access to files in the bucket.

6.  Configure Clerk:
    *   Set up your Clerk application (Frontend API Keys, Backend API Keys).
    *   Configure JWT Templates: Create one named `supabase` with the required claims (e.g., `role: 'authenticated'`).
    *   Configure Webhooks: Set up a webhook endpoint pointing to `/api/webhooks/clerk` in your application to sync user data.

7.  Configure Stripe:
    *   Set up your Stripe account keys.
    *   Configure a webhook endpoint pointing to `/api/webhooks/stripe` and subscribe to `checkout.session.completed` events.

### Running the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

*   `pnpm dev`: Starts the development server.
*   `pnpm build`: Builds the application for production.
*   `pnpm start`: Starts a production server.
*   `pnpm lint`: Lints the codebase.
*   `pnpm format`: Formats code using Prettier (if configured).
*   `pnpm db:generate`: Generates Prisma Client.
*   `pnpm db:migrate`: Applies database migrations.
*   `pnpm db:push`: Pushes Prisma schema to the database (useful for prototyping, use migrations for production).
*   `pnpm db:studio`: Opens Prisma Studio.
*   `pnpm db:reset`: Resets the database and re-applies migrations.
*   `pnpm email`: Starts the React Email development server (if using).
*   `pnpm test`: Runs Vitest tests.
*   `pnpm test:ui`: Runs Vitest tests with UI.
*   `pnpm coverage`: Runs Vitest tests and generates coverage report.
*   `node scripts/backfill-embeddings.js`: (Optional) One-time script to generate embeddings for existing tracks in the database.

## Deployment

This project is optimized for deployment on [Vercel](https://vercel.com).

## Contributing

We welcome contributions to Wavhaven! We want to make contributing to this project as easy and transparent as possible.

### Our Development Process

Wavhaven is developed in the open and we are grateful for any contributions from the community. All work happens directly on GitHub.

### Pull Request Process

1.  Fork the repo and create your branch from `master`.
2.  If you've added code that should be tested, add tests.
3.  Ensure the test suite passes (`pnpm test`).
4.  Make sure your code lints (`pnpm lint`).
5.  Issue that pull request!

### Contributor License Agreement

By contributing to Wavhaven, you agree that your contributions will be licensed under its GNU AGPLv3 License. This is a "copyleft" license that ensures the project remains free and open-source.

We look forward to your contributions!

## License

Copyright (C) 2024 Figgie

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
