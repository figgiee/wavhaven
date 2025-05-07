---
description:
globs:
alwaysApply: false
---
# Layout and Spacing Conventions

## Standard Page Container

Most pages should use a consistent container structure to ensure proper width constraints and padding. Use the following pattern:

```tsx
<div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-12 sm:pb-16">
  {/* Page content goes here */}
</div>
```

*   `max-w-screen-xl`: Sets the maximum width.
*   `mx-auto`: Centers the container horizontally.
*   `px-*`: Provides horizontal padding (responsive).
*   `pt-*`, `pb-*`: Provides vertical padding (responsive). Adjust top/bottom padding as needed for specific page layouts (e.g., less top padding if there's a sticky header).

See [src/app/explore/page.tsx](mdc:src/app/explore/page.tsx) for an example implementation.

## Spacing Scale

Use Tailwind's default spacing scale consistently for margins (`m-*`), padding (`p-*`), and gaps (`gap-*`). Avoid arbitrary pixel values. Common values used: `gap-3`, `gap-5`, `p-4`, `mb-6`, `mb-10`, `mt-12`.

## Layout Approach for Filters

On pages like "Explore", prefer using a trigger button that opens a `Sheet` component for filters, rather than a persistent sidebar, to ensure main content remains centered. See [src/app/explore/page.tsx](mdc:src/app/explore/page.tsx) for the implementation using `@/components/ui/sheet` and [src/components/explore/filter-sidebar.tsx](mdc:src/components/explore/filter-sidebar.tsx).
