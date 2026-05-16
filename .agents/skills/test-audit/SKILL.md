---
name: test-audit
description: Audit E2E and Unit tests to identify maintenance needs before starting new work. Use when starting a new feature, fixing a bug, or when E2E tests are slow/brittle.
---

# Test Audit

## Quick Start

1. **Identify Area**: List the files or features you are about to change.
2. **Run Audit**: Use `task agent:audit AREA=<area>` to find related tests and heuristics.
3. **Analyze**: Categorize tests into "Must Update", "Migration Candidates" (⚠️), and "Brittle Selectors" (❌).

## Workflows

### 1. Pre-Implementation Audit
Before touching a line of code:
- [ ] **Find Coverage**: Locate all Unit tests (`*.test.ts*`) and E2E specs (`*.spec.ts`) that exercise the target logic.
- [ ] **Establish Baseline**: Run tests using `task agent:test:impact` to verify the current state is green.
- [ ] **Harden Selectors**: If the audit finds ❌ brittle selectors, replace them with `data-testid` in the source and the test.
- [ ] **Contract Check**: Run `task agent:drift` to ensure the current state respects the OpenAPI law.

### 2. E2E-to-Unit Migration Audit
Keep E2E tests lean and fast:
- [ ] **Identify Logic-Heavy E2E**: Find ⚠️ tests with high assertion counts but low DOM interaction.
- [ ] **Establish Shared Fixtures**: Ensure both the Unit test and the E2E mock use builders from `pwa/src/testing/builders.ts` to prevent "Shadow Drift."
- [ ] **Port & Prune**: Move business logic to Vitest, then prune those assertions from the E2E suite.
- [ ] **Preserve the Seam**: Retain a "Happy Path" E2E test for every vertical slice to verify UI <-> API integration (SSE, navigation, data loading).

## Audit Criteria

| Priority | Type | Condition | Action |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | Failure | Test is already failing. | Fix BEFORE new work. |
| **HIGH** | Impacted | Test covers code being modified. | Update to match new spec. |
| **MEDIUM** | Migration | E2E test covers pure component logic. | Move to Unit Test after implementation. |
| **LOW** | Cleanup | Redundant test covering same path. | Remove. |

## Migration Priority (E2E -> Unit)

Move tests to Vitest/Unit when:
1. **Logic-Heavy (⚠️)**: The test asserts on complex data structures or state.
2. **Brittle (❌)**: The test uses non-standard locators (h2, span, classes) or fails due to timing.
3. **Redundant**: The UI state is already covered by component tests.

## Tools

- `task agent:audit AREA=<keyword>`: Generate report with ⚠️ and ❌ heuristics.
- `task agent:test:impact`: Run only the tests affected by current changes.
- `task test:unit`: Run unit tests.
- `task agent:drift`: Check contract alignment.

## Example Report

```markdown
# Test Audit Report: grocery
## PWA E2E Tests (Playwright)
- [ ] `pwa/e2e/grocery.spec.ts` ⚠️ Logic-Heavy: Good candidate for Unit Test. ❌ 1 brittle selector(s) found (e.g., `span`).
```
In this case, you should first harden the `span` selector, verify the E2E is green, implement changes, and then migrate the sorting logic to a Vitest test using shared builders.
