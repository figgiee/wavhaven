---
description: 
globs: **/*.ts,**/*.tsx,src/app/globals.css,tailwind.config.ts
alwaysApply: false
---
---
ruleType: Auto Attached
filePatterns:
  - "**/*.{ts,tsx}"              # Components where styles are applied
  - "src/app/globals.css"        # Global styles
  - "tailwind.config.ts"         # Tailwind config
description: Styling conventions using Tailwind CSS and Shadcn/ui for Wavhaven components and layout.
---
# Styling Conventions for Wavhaven

- **Framework:** Use **Tailwind CSS** for all styling. Follow utility-first principles.
- **Class Merging:** Use the `cn` utility function (from `src/lib/utils.ts`, provided by Shadcn/ui) for conditionally applying or merging Tailwind classes, especially in components.
- **UI Primitives:** Utilize **Shadcn/ui** components for core UI elements (Button, Input, Card, etc.). Add new components via `npx shadcn-ui@latest add <component-name>`. Customize appearance primarily through Tailwind classes passed via the `className` prop.
- **Custom Components:** Build custom, reusable components in `src/components/`. Style them using Tailwind and compose them using Shadcn primitives where possible.
- **Responsiveness:** Ensure components and layouts are responsive using Tailwind's breakpoint modifiers (sm:, md:, lg:, etc.).