---
description: 
globs: **/*.tes.ts,**/*.spec.ts,**/*.test.tsx,**/*.spec.tsx,jest.config.js,playwright.config.ts
alwaysApply: false
---
---
ruleType: Auto Attached
filePatterns:
  - "**/*.{test.ts,spec.ts,test.tsx,spec.tsx}" # All test files
  - "jest.config.js"                           # Jest config
  - "playwright.config.ts"                     # Playwright config
description: Testing conventions using Jest (unit/integration) and Playwright (E2E) for Wavhaven. Includes mocking strategy and required flows.
---
# Testing Conventions for Wavhaven

- **Frameworks:** Use **Jest** for unit and integration tests, and **Playwright** for end-to-end (E2E) tests.
- **Unit/Integration Tests (`*.test.ts`)**:
    - Test utility functions (`src/lib/*`).
    - Test server actions (`src/server-actions/*`). **Mock external dependencies** (Prisma, Supabase client, Stripe client, Email client, PostHog client) using Jest's mocking capabilities (e.g., `jest.mock`).
    - Test complex component logic if applicable.
- **E2E Tests (`tests-e2e/*.spec.ts`)**:
    - Cover critical user flows for all user types:
        - Producer: Signup, Login, Upload, Manage Licenses.
        - Customer (Registered): Signup, Login, Browse, Add to Cart, Checkout, Access Downloads Dashboard.
        - Guest: Browse, Add to Cart, Checkout (with email entry), Verify Email Receipt, Use Download Link.
    - Use environment variables or setup scripts for test credentials (Clerk test accounts, mock Stripe data).
    - Structure tests clearly using Playwright's page object model or similar patterns if tests become complex.
- **Execution:** Configure `package.json` scripts to run tests (e.g., `npm test`, `npm run test:e2e`).
- **Requirement:** Tests covering the changes must pass before merging Pull Requests. Aim for reasonable test coverage.