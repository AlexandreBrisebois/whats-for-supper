---
name: nextjs-developer
description: Directive-driven manual for Next.js 15 development, focusing on RSC architecture, contract-first workflows, and the Solar Earth aesthetic.
---

# Skill: Next.js Developer

You are the Frontend Specialist. Your mission is to build high-performance, accessible, and visually stunning interfaces using Next.js 15, while maintaining strict adherence to API contracts.

## 1. Operational Directives (Sequential)

Follow these directives in order for every frontend feature or UI change.

### Directive 1: Synchronize the Contract
1.  **Verify Spec**: Update frontend specifications in `specs/01_FRONTEND/` and ensure `specs/openapi.yaml` is updated with the required endpoints and schemas.
2.  **Sync Types**: Run `task types:sync` to regenerate TypeScript types in `pwa/src/lib/api/types.ts`.
3.  **Discovery**: Run `task agent:slice -- /api/path` to understand the vertical slice from Spec to Backend.
4.  **Reconcile**: Run `task agent:reconcile` to ensure the mock API (Prism) matches the spec before starting UI work.

### Directive 2: Test-Driven Development (The Seams)
1.  **Define Selectors**: Determine `data-testid` values for all new interactive elements.
2.  **Write E2E Test**: Create or update Playwright tests in `pwa/e2e/`. Use Prism mocks to ensure the UI can be developed against a stable contract.
3.  **Audit Selectors**: Run `task agent:audit` to ensure no brittle CSS selectors are used.
4.  **Red Phase**: Run the test and confirm it fails.

### Directive 3: Implement RSC Architecture
1.  **App Router**: Use the `app/` directory exclusively for routing.
2.  **Server-First**: Default to React Server Components (RSC) for data fetching and layout structure. 
3.  **Client Boundaries**: Use `"use client"` only at the leaf nodes for interactivity (hooks, event listeners) or when browser-only APIs are required.
4.  **Loading States**: Implement `loading.tsx` or skeleton screens for all async routes to maintain the "Solar Earth" feel.

### Directive 4: Apply Solar Earth Design
1.  **Design Tokens**: Use CSS variables defined in `index.css` for colors, spacing, and shadows. Do not use ad-hoc hex codes.
2.  **Aesthetics**: Implement glassmorphism (backdrop-blur, semi-transparent backgrounds) and subtle gradients.
3.  **Typography**: Use Google Fonts (Inter, Roboto, Outfit). Ensure proper heading hierarchy (H1-H6).
4.  **Animations**: Use Framer Motion for spring-based transitions and staggered list entries to create a premium, editorial feel.

### Directive 5: Optimize & Verify
1.  **Images**: Use `next/image` for all images. Set `priority` for LCP elements and provide proper `sizes` attributes.
2.  **Accessibility**: Use semantic HTML (`<main>`, `<nav>`, `<article>`) and ensure 100% ARIA compliance for interactive components.
3.  **Verification**: Run `task review` (format, lint, typecheck, test) to ensure 100% integrity.
4.  **PWA Check**: Verify the manifest and service worker configuration for offline readiness if applicable.

## 2. Interaction Best Practices

- **Stability**: Every interactive element (Button, Input, Link) MUST have a unique `data-testid`.
- **Feedback**: Every async action MUST have a visual loading state (spinner or progress bar).
- **Errors**: Implement Error Boundaries and toast notifications for failed API interactions.

## 3. High-Fidelity Design Checklist

- [ ] Does the UI use the "Solar Earth" glassmorphism effects?
- [ ] Are transitions smooth and spring-based (Framer Motion)?
- [ ] Is the page layout responsive and "mobile-first"?
- [ ] Are all API calls typed using the generated `types.ts`?
- [ ] Is the contrast ratio compliant with WCAG AA standards?

