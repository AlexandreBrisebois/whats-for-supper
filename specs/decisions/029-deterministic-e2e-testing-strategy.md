# ADR 029: Deterministic E2E Testing Strategy

## Status
Proposed (Accepted)

## Context
The "What's For Supper" PWA relies on real-time polling (every 30s in production, 2s in dev) to synchronize vote counts and planner state. During End-to-End (E2E) testing with Playwright, this polling frequency caused significant flakiness:
1. **DOM Detachment**: UI re-renders triggered by 2s polls frequently detached elements (like buttons) while Playwright was attempting to interact with them.
2. **State Reversion**: The stateless mock-api (Prism) would return default values during polls, overwriting local UI state changes (like "Locked") before the test could verify them.

## Decision
We will transition to a **Deterministic E2E Testing Strategy**:

1. **Freeze Polling in Tests**: The `NEXT_PUBLIC_ENVIRONMENT=test` polling interval is increased to **60 seconds**. This effectively freezes the UI state during the test lifecycle, ensuring element stability.
2. **Manual Sync Pattern**: Tests requiring verification of state updates (e.g., after voting) will use **`page.reload()`** or explicit navigation rather than waiting for the timer.
3. **Hardened Intercepts**: All `page.route` handlers must use regex-based matching and handle `204 No Content` or non-JSON responses to prevent interceptor crashes.
4. **Time Alignment**: E2E tests will use fixed reference dates (e.g., April 27, 2026) to match the static examples in the OpenAPI specification, eliminating the "Mock Reality Split" between SSR and CSR.

## Consequences
- **Pros**: Significant reduction in flakiness; tests no longer depend on stopwatch timing; interactions are 100% stable.
- **Cons**: Tests do not verify the "auto-sync" timer itself, only the data synchronization logic.
- **Mitigation**: A dedicated, targeted test for the timer can be added if required, but general feature tests remain deterministic.
