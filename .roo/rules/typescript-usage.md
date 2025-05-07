---
description: 
globs: **/*.ts,**/*.tsx
alwaysApply: false
---
---
ruleType: Auto Attached
filePatterns: [ "**/*.ts", "**/*.tsx" ]
description: TypeScript usage conventions for Wavhaven, focusing on strictness, explicit typing, enums, and utility types. Applies to all TS/TSX files.
---
# TypeScript Usage Conventions for Wavhaven

- **Strictness:** Enable and adhere to strict mode (`strict: true` in `tsconfig.json`).
- **Typing:** Use explicit types wherever possible. Leverage Prisma-generated types for database interactions. Define clear interfaces or types for function parameters, return values, component props, and API payloads. Avoid `any` unless absolutely necessary and justified.
- **Enums:** Use TypeScript enums for defined sets of values (e.g., `UserRole` as defined in Prisma schema, but potentially mirrored or imported in TS).
- **Utility Types:** Utilize TypeScript utility types (e.g., `Partial`, `Required`, `Pick`, `Omit`) where appropriate to create new types based on existing ones.