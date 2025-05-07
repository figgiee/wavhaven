---
description: 
globs: src/app/**/*.ts,src/app/**/*.tsx,src/components/**/*.ts,src/components/**/*.tsx
alwaysApply: false
---
---
ruleType: Auto Attached
filePatterns:
  - "src/app/**/*.{ts,tsx}"       # Pages and layouts where structure matters
  - "src/components/**/*.{ts,tsx}" # All UI components
description: Guidelines and reminders for building accessible UI components and pages following WCAG principles in Wavhaven.
---
# Accessibility (a11y) Guidelines for Wavhaven

- **Semantic HTML:** Use semantic HTML elements (`<nav>`, `<main>`, `<article>`, `<aside>`, `<button>`, etc.) appropriately to convey structure and meaning. Avoid using `div` or `span` for interactive elements.
- **Keyboard Navigation:** Ensure all interactive elements (links, buttons, form inputs) are focusable and operable using the keyboard alone. Test tab order. Use visible focus indicators (Tailwind's `focus:` variants).
- **ARIA Attributes:** Use ARIA (Accessible Rich Internet Applications) attributes (`role`, `aria-label`, `aria-labelledby`, `aria-hidden`, etc.) where necessary to enhance accessibility, especially for custom components or dynamic content updates. Don't overuse ARIA if semantic HTML suffices.
- **Image Alt Text:** Provide descriptive `alt` text for all meaningful images (`<img>` tags or Next.js `<Image>`). For purely decorative images, use an empty `alt=""`.
- **Form Labels:** Ensure all form inputs (`<input>`, `<textarea>`, `<select>`) have associated `<label>` elements using the `htmlFor` attribute linked to the input's `id`.
- **Color Contrast:** Check that text and UI elements have sufficient color contrast against their background to meet WCAG AA guidelines. Use browser developer tools or online contrast checkers.
- **Testing:** Use automated accessibility checking tools (like browser extensions axe DevTools) during development and perform manual keyboard navigation checks.