---
description:
globs:
alwaysApply: false
---
# Typography Guidelines

## Project Fonts

The primary fonts used in this project are:

*   **Inter:** Used for general body text, UI elements, and most headings.
*   **Rubik:** Used selectively for prominent Calls-to-Action (CTAs) or specific display headings for emphasis.

## Implementation

Fonts are loaded using `next/font/google` within [src/app/layout.tsx](mdc:src/app/layout.tsx) and assigned to CSS variables (`--font-sans` for Inter, `--font-rubik` for Rubik).

These variables are then integrated into the Tailwind configuration in [tailwind.config.ts](mdc:tailwind.config.ts):

```javascript
// tailwind.config.ts
// ...
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
        rubik: ['var(--font-rubik)', ...fontFamily.sans], // Fallback to sans
      },
      // ...
    },
  },
// ...
```

## Usage

*   Apply Inter (the default sans-serif font) using standard Tailwind text utilities (e.g., `text-lg`, `font-medium`). No explicit class is usually needed.
*   Apply Rubik selectively using the `font-rubik` utility class (e.g., `<Button className="font-rubik">Action</Button>`).

Avoid setting fonts directly in [src/app/globals.css](mdc:src/app/globals.css) to maintain consistency through Tailwind utilities.
