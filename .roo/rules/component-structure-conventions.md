---
description: 
globs: src/components/**/*.ts,src/components/**/*.tsx,src/app/**/*.ts,src/app/**/*.tsx
alwaysApply: false
---
---
ruleType: Auto Attached
filePatterns:
  - "src/components/**/*.{ts,tsx}" # Target component files
  - "src/app/**/*.{ts,tsx}"       # Pages/Layouts composing components
description: Guidelines for structuring React components, organizing them into folders, and managing props/state within Wavhaven.
---
# Component Structure Conventions for Wavhaven

- **Organization:**
    - Place general reusable UI primitives under `src/components/ui/` (primarily managed by Shadcn/ui).
    - Place custom, reusable application components under `src/components/layout/`, `src/components/shared/`, or similar general categories.
    - Place components specific to a major feature or domain under `src/components/features/<feature-name>/` (e.g., `src/components/features/upload/UploadForm.tsx`, `src/components/features/cart/CartView.tsx`).
- **Composition:** Favor composition over inheritance. Build complex UIs by combining smaller, focused components.
- **Props:** Keep component props explicit and clearly typed using TypeScript interfaces or types. Avoid overly complex prop objects where possible.
- **State Management:**
    - Use local component state (`useState`) for UI state that isn't needed elsewhere.
    - Use Zustand (`src/stores/`) for global state shared across multiple components (like the shopping cart).
    - Use React Context sparingly for state that needs to be shared down a specific component tree but isn't truly global.
- **Server vs. Client:** Clearly distinguish between Server Components (default) and Client Components (`"use client"`). Keep client-side logic confined to Client Components. Pass data down from Server to Client Components via props where possible.