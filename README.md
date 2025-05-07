# Wavhaven

Wavhaven is a modern marketplace platform for music producers to sell licenses for their beats, loops, soundkits, and presets, and for artists and creators to discover and purchase high-quality audio assets for their projects.

## Tech Stack

*   **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
*   **Backend:** Next.js Server Actions
*   **Database:** Supabase (PostgreSQL)
*   **Authentication:** Clerk
*   **File Storage:** Supabase Storage
*   **Payments:** Stripe (Checkout & Connect)
*   **State Management:** Zustand
*   **Email:** Resend (or other, specify if changed)
*   **Analytics:** PostHog
*   **Testing:** Vitest, React Testing Library, Playwright

## Project Structure

*   `src/app/`: Next.js App Router routes and page components.
*   `src/components/`: Shared UI components.
    *   `src/components/features/`: Feature-specific components.
    *   `src/components/forms/`: Reusable form components.
    *   `src/components/layout/`: Layout components (header, footer).
    *   `src/components/ui/`: Shadcn/ui components.
*   `src/lib/`: Core utilities, API clients, server actions.
    *   `src/lib/actions/`: Server Actions.
    *   `src/lib/supabase/`: Supabase client configurations.
*   `src/stores/`: Zustand state management stores.
*   `src/types/`: TypeScript type definitions.
*   `src/emails/`: React Email templates.
*   `prisma/`: Prisma schema and migrations.
*   `supabase/`: Supabase specific configurations (e.g., RLS policies, migrations).
*   `public/`: Static assets.

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
        *   Run the following SQL to ensure the `uuid-ossp` extension (and any others your project might implicitly rely on from Prisma migrations) is enabled:
            ```sql
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
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

## Deployment

This project is optimized for deployment on [Vercel](https://vercel.com).

## Contributing

[Details on how to contribute to the project, coding standards, pull request process, etc.]

## License

[Specify project license, e.g., MIT]
