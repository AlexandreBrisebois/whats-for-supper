---
name: nextjs-testing-best-practices
description: Procedural guidance for Next.js E2E testing with Playwright, focusing on robustness (data-testid) and TDD.
---

# Skill: Next.js E2E Testing & TDD

Procedural guidance for creating robust, maintainable E2E tests for the Next.js PWA.

## 1. The TDD Workflow (Mandatory)
Every feature or bug fix must follow this sequence:
1. **Specs**: Update/Create specifications in `specs/`.
2. **Tests**: Update/Create Playwright tests in `pwa/e2e/`.
3. **Mock API**: Update `specs/openapi.yaml` with schemas and rich examples. Prism will serve this data, providing a **High-Fidelity Contract** that allows frontend work to proceed independently of the backend.
4. **Implementation**: Write the code to satisfy the tests.

## 2. Robust Locators (Zero Brittle Policy)
Avoid using `getByText` or `getByRole` for elements that are likely to change their text or structure.
- **MANDATORY**: Use `data-testid` for all interactive elements (buttons, inputs, links) and key containers.
- **Selector Priority**:
  1. `page.getByTestId('...')` or `locator('[data-testid="..."]')`
  2. `page.getByRole('...', { name: '...' })` (Only if the role/name is extremely stable)
  3. `page.locator(...)` with CSS/XPath (Avoid unless necessary for complex interactions)

### Example
```typescript
// ❌ Avoid (Brittle if text changes to "Start" or "Go")
await page.getByRole('button', { name: 'Cook Now' }).click();

// ✅ Recommended (Stable even if text/icon changes)
await page.getByTestId('start-cook-mode').click();
```

## 3. Testing Environment & Integrity Gates
We use a two-tier verification strategy to ensure zero regressions:

- **Tier 1: Local Development (`task review`)**:
  - Runs formatting, linting, type-checking, and E2E tests.
  - Relies on Playwright's automatic `webServer` management.
  - **Best for**: Rapid iteration and pre-commit checks.

- **Tier 2: The Integrity Gate (`scripts/run-e2e-ci.sh`)**:
  - **High-Fidelity**: Kills lingering processes and waits for stable PWA hydration (5 consecutive health checks).
  - **CI Parity**: Mimics the exact environment used in GitHub Actions.
  - **MANDATORY**: This script MUST pass before a feature is considered "Integrated."

### Assumption Validation
If `scripts/run-e2e-ci.sh` passes, `task review` should also pass. If they diverge, it usually indicates a race condition or hydration issue that the CI script's "stable wait" logic is catching.

## 4. Test Maintenance & Pruning
- **False Positives**: If a test fails because a behavior *intentionally* changed, the test must be updated or pruned immediately. Do not waste tokens or time trying to "fix" code to satisfy an obsolete test.
- **Cleanup**: Remove tests for features that have been removed or significantly refactored.

## 5. Next.js Specifics
- **Hydration**: Wait for specific elements to be visible to ensure React hydration is complete.
- **App Router**: Don't rely on `__NEXT_DATA__`. Use user-visible outcomes.
