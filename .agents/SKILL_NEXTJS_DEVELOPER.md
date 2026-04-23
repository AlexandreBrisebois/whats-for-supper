---
name: nextjs-developer
description: Procedural guidance for Next.js 15 development, focusing on React Server Components, performance, and TDD.
---

# Skill: Next.js Developer

Procedural guidance for frontend development using Next.js 15 and modern React patterns.

## 1. The TDD Workflow (Mandatory)
1. **PWA Specs**: Update specs in `specs/01_FRONTEND/`.
2. **E2E Tests**: Write/Update Playwright tests in `pwa/e2e/` using `data-testid`.
3. **Mock API**: Update `pwa/mock-api.js` to provide the required data/behavior.
4. **Implementation**: Write the React code to satisfy the tests.
5. **Verify**: Run `task review` to confirm everything passes.

## 2. Next.js 15 & React Standards
- **App Router**: Use the `app/` directory exclusively.
- **Server Components (RSC)**: Default to Server Components for data fetching and static content.
- **Client Components**: Use `"use client"` only for interactivity (hooks, event listeners) or browser-only APIs.
- **Optimized Images**: Always use `next/image` with proper `sizes` and `priority` for LCP elements.
- **Typography**: Use modern fonts (Inter, Roboto, Outfit) to maintain the "Solar Earth" aesthetic.

## 3. Styling & Aesthetics
- **Solar Earth Design**: Focus on glassmorphism, subtle gradients, and airy layouts.
- **Consistency**: Use CSS variables for tokens (colors, spacing, shadows).
- **Animations**: Use Framer Motion for premium feel (spring transitions, staggered entries).

## 4. Interaction Best Practices
- **Data Attributes**: Every interactive element MUST have a `data-testid` for testing stability.
- **Accessibility**: Use semantic HTML (`<main>`, `<nav>`, `<section>`) and ARIA labels where necessary.
- **Loading States**: Implement skeleton screens or "Solar Earth" loaders for all async transitions.
