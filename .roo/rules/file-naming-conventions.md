---
description: 
globs: 
alwaysApply: false
---
---
ruleType: Manual                 # General guidance, attach manually if needed.
filePatterns: []
description: Recommended naming conventions for files and folders within the Wavhaven project structure.
---
# File Naming Conventions for Wavhaven

- **Components (React):** Use **PascalCase** (e.g., `TrackCard.tsx`, `AudioPlayer.tsx`).
- **Pages & Layouts (Next.js App Router):** Use **lowercase** standard names (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`). Directory names define the route path (use `kebab-case` or descriptive names). Route groups use parentheses `(group-name)`. Dynamic segments use brackets `[segmentName]`.
- **Server Actions:** Use **camelCase** or **PascalCase** for the file containing related actions (e.g., `trackActions.ts`, `UserActions.ts`). Function names within should be descriptive camelCase (e.g., `uploadTrack`, `ensureUserRecord`).
- **Library/Utility Files (`src/lib`, `src/utils`):** Use **camelCase** or **kebab-case** (e.g., `prisma.ts`, `storage.ts`, `userUtils.ts`, `cn.ts` or `utils.ts`).
- **Store Files (`src/stores`):** Use **camelCase** with "Store" suffix (e.g., `cartStore.ts`).
- **Configuration Files:** Use standard names (e.g., `tailwind.config.ts`, `prisma.schema`, `.env`, `middleware.ts`).
- **Test Files:** Match the name of the file being tested, adding `.test.ts` or `.spec.ts` (e.g., `storage.test.ts`, `UploadForm.spec.tsx`). E2E tests can be descriptive `kebab-case.spec.ts` (e.g., `guest-checkout.spec.ts`).
- **Directories:** Use **kebab-case** (e.g., `server-actions`, `components/features/track-upload`) or **camelCase/lowercase** where conventional (e.g., `lib`, `app`, `stores`). Be consistent within a category.