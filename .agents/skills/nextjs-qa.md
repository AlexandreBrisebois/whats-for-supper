---
name: nextjs-qa
description: Operational directives for Next.js E2E testing with Playwright, focusing on contract-first verification and the Integrity Gate.
---

# Skill: Next.js Testing Specialist

This skill defines the mandatory directives for creating and maintaining robust, contract-first End-to-End (E2E) tests for the Next.js Progressive Web App (PWA).

## 1. The Next.js TDD Loop (Mandatory)
Every feature or bug fix must follow this exact sequence:

1.  **Contract Alignment**: Verify [specs/openapi.yaml](specs/openapi.yaml) contains the schemas and examples required for the feature.
2.  **Spec Initialization**: Create or update the relevant specification in `specs/`.
3.  **Test Definition**: Create or update Playwright tests in `pwa/e2e/`. Use `.spec.ts` for functional flows and `.mobile.spec.ts` for PWA-specific mobile views.
4.  **Mock Verification**: Start the Playwright mock server using `npm run mock-api` in `pwa/`. Verify that the test fails against the mock if the logic is missing.
5.  **Logic Implementation**: Write the minimal React/Next.js code to satisfy the test assertions.
6.  **Local Validation**: Run `task review` to confirm the local dev loop passes.

## 2. Zero-Brittle Locator Directives
You must ensure locators are resilient to UI refactors and design changes.

-   **Directive 1: Prioritize `data-testid`**: Use `page.getByTestId('...')` as the primary selection method for all interactive elements (buttons, inputs, links).
-   **Directive 2: Semantic Roles**: Use `page.getByRole('...', { name: '...' })` only for elements where the role and name are part of the core accessibility contract (e.g., "Main Menu").
-   **Directive 3: Forbidden Locators**: Do not use CSS selectors based on generated class names (e.g., `_button_1a2b3`) or deeply nested DOM paths.
-   **Directive 4: Test ID Hygiene**: Name IDs based on function, not appearance (e.g., `data-testid="submit-recipe"` instead of `data-testid="green-button"`).

### Standard Pattern
```typescript
// ✅ MANDATORY: Use stable test IDs
await page.getByTestId('nav-cook-mode').click();
await expect(page.getByTestId('step-indicator')).toBeVisible();
```

## 3. The Integrity Gate Protocol
A feature is not "Done" until it passes the Tier 2 Integrity Gate.

### Tier 1: Local Dev Loop (`task review`)
-   Runs linting, type-checking, and local Playwright tests.
-   Best for rapid iteration and component-level verification.

### Tier 2: CI Integrity Gate (`task test:pwa:ci`)
-   **Mechanism**: Executes `scripts/run-e2e-ci.sh`.
-   **Validation**: This script kills lingering processes, starts a fresh Playwright mock, and waits for stable PWA hydration (5 consecutive health checks).
-   **MANDATORY**: You must run this command before declaring a task complete. If it fails while `task review` passes, you have a race condition or hydration mismatch.

## 4. Next.js Specific Operational Logic
-   **Hydration Awareness**: Always wait for a specific interactive element to be visible before clicking. Do not rely on page load events; wait for React hydration to complete.
-   **App Router State**: Verify outcomes, not internal state. Test that the URL changed or the DOM updated, rather than checking private Next.js data structures.
-   **PWA Assets**: When testing PWA features, verify the existence of the manifest and service worker registration if applicable.

## 5. Test Maintenance & Pruning
1.  **Intentional Regressions**: If a behavior is changed by design, you must update the test before implementing the code change.
2.  **Zombie Test Removal**: Conduct a "Death Audit" on the `pwa/e2e/` directory regularly. Remove tests for deprecated features or components.
3.  **Flakiness Zero-Tolerance**: If a test is flaky, you must either stabilize it using better locators/waits or prune it. Never ignore a failing test.

## 6. Post-Implementation Checklist
Before completing a testing-related task, verify:
- [ ] Every interactive element has a `data-testid`.
- [ ] `task test:pwa:ci` (Integrity Gate) passes 100%.
- [ ] The test covers both "Happy Path" and critical error states (e.g., 404 or API failure).
- [ ] No hardcoded URLs or environment-specific strings are in the test files.
