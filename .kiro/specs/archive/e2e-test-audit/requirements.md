# E2E-to-Unit Test Migration Audit

## Vision
Optimize the testing lifecycle of "What's For Supper" by reducing reliance on slow, non-deterministic Playwright E2E tests for logic verification. We aim to move "Logic-Heavy" and "Component-Internal" assertions to Vitest unit/component tests, reserving E2E for critical user journeys and cross-system "seams" (UI <-> API).

## Product Decisions
1. **Zero Coverage Loss**: Every assertion removed from an E2E test MUST be represented in a faster unit/component test.
2. **Speed Priority**: Unit tests must run in < 1s. E2E tests should focus on high-level integration.
3. **Deterministic First**: If a test is flaky in Playwright but stable in Vitest, it must be migrated.
4. **Mock Fidelity (Zero-Drift)**: Unit tests MUST use shared builders extracted from the E2E suite to ensure they operate on contract-accurate data.
5. **Seam Preservation**: Every vertical slice MUST retain a "Happy Path" E2E test that verifies the integration between PWA and API, even after logic is moved to unit tests.
6. **Data-TestID Retention**: Even if logic is moved to unit tests, E2E tests must retain basic `data-testid` navigation to ensure the UI is reachable.

## Acceptance Criteria
1. **Audit Coverage**: All `*.spec.ts` files in `pwa/e2e/` must be reviewed and categorized.
2. **Migration Candidates**: Identification of tests that:
    - Verify pure data transformation (e.g., parsers).
    - Verify pure component state (e.g., "is button active when X").
    - Verify static UI presence (e.g., "is badge hidden").
3. **Seam Preservation**: Integration tests verifying SSE events, real API contracts (via `mock-api.ts`), and cross-page navigation must remain in E2E.
4. **Task Decomposition**: A clear list of migration tasks grouped by feature area.

## Glossary
- **Logic-Heavy E2E**: A Playwright test that uses `page.goto` just to check if a function returned the right data.
- **Seam**: The boundary between two systems (e.g., PWA and API).
- **The Seams**: Repository term for shared contracts, mocks, and E2E validation points.
