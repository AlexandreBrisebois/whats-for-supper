# Design: E2E-to-Unit Migration Strategy

## Vertical Slicing Philosophy

To minimize task dependencies and maximize throughput for small models, this plan uses **Vertical Slices** rather than horizontal phases. Each slice represents a complete feature area (e.g., Grocery, Sharing) and contains the full lifecycle of migration:

1. **Local Audit**: Area-specific scan using `task agent:audit AREA=<feature>`.
    - **⚠️ Logic-Heavy Detection**: High assertion density in E2E.
    - **❌ Brittle Selector Detection**: Identifying non-`data-testid` locators.
2. **Atomic Migration & Hardening**: 
    - Port logic to Vitest.
    - Harden the E2E "Seam" by replacing brittle selectors with `data-testid`.
3. **Local Pruning**: Cleaning the specific E2E spec.
4. **Impact Verification**: Running `task agent:test:impact` to ensure changes only affected relevant areas.

This allows a model to complete a feature migration end-to-end without waiting for a global baseline or other feature audits.

## Migration Matrix

| Test Type | Logic Location | Recommended Runner | Rationale |
| :--- | :--- | :--- | :--- |
| **Pure Logic** | `src/lib/*.ts` | Vitest (Unit) | No DOM required. Instant feedback. |
| **Component UX** | `src/components/*.tsx` | Vitest (JSDOM) | Testing Library is faster than Playwright for state transitions. |
| **Store State** | `src/store/*.ts` | Vitest (Unit) | Zustand state logic should be verified in isolation. |
| **Vertical Slice** | UI <-> API <-> DB | Playwright (E2E) | Verifies the "Seams" and real network/SSE flows. |
| **Cross-Page Flow** | Page A -> Page B | Playwright (E2E) | Verifies navigation and persistence across routes. |

## Audit Categorization (Initial Scan)

### High Priority Migration (Logic-Heavy)
- `pwa/e2e/step-parser.spec.ts`: Pure parser logic. **Move 100% to Vitest.**
- `pwa/e2e/recipe-share.spec.ts`: Complex mapping logic between DTOs and UI. **Move logic assertions to Vitest.**
- `pwa/e2e/grocery.spec.ts`: Aisle mapping and ordering logic. **Move mapping logic to Vitest.**

### Medium Priority Migration (UX/State)
- `pwa/e2e/cook-mode-steps.spec.ts`: Redundant UX guards (Task 45, 46). **Move visual/state guards to Vitest.**
- `pwa/e2e/settings.spec.ts`: Simple toggle/persistence logic. **Move state logic to Vitest.**
- `pwa/e2e/browse-stack.spec.ts`: Navigation stack logic. **Move stack-manager logic to Vitest.**

### Keep as E2E (Critical Paths)
- `pwa/e2e/auth-flow.spec.ts`: Identity and authentication lifecycle.
- `pwa/e2e/capture-flow.spec.ts`: External URL capture and SSE synchronization.
- `pwa/e2e/planner-full-cycle.spec.ts`: The core "What's For Supper" loop.
- `pwa/e2e/home-race.spec.ts`: Specifically designed to catch race conditions in the real environment.

## Shared Fixture Architecture (Mock Fidelity)

To prevent "Shadow Drift" between Unit tests and the real API, we will centralize data builders:

- **Source of Truth**: `pwa/src/testing/builders.ts` (new).
- **Format**: Typed functions that return DTOs matching the generated Kiota client types.
- **Consumption**: 
    - **Vitest**: Imports builders directly for high-fidelity state injection.
    - **Playwright**: `mock-api.ts` imports these builders to fulfill `page.route` mocks.

This ensures that a single change to the `builders.ts` file updates the entire testing pyramid.

## The Migration Pattern (Small Model Friendly)

To accommodate small models with limited context windows, each migration is broken into atomic, independently verifiable tasks:

1. **Scaffold**: Create the target Vitest file with imports only. Verify with `task test:unit`.
2. **Port Chunk**: Move a single `describe` or `test` block. Update logic imports. Verify with `task test:unit`.
3. **Repeat**: Continue porting chunks until the E2E logic is fully mirrored.
4. **Prune**: Remove the mirrored assertions from the Playwright `.spec.ts` file. Verify with `task test:e2e`.
5. **Delete**: If the E2E file is now empty or redundant, delete it.

## Testing Strategy Matrix

| Feature | Unit Coverage | E2E Coverage |
| :--- | :--- | :--- |
| **Recipe Parsing** | All edge cases, Property tests. | "Can I see a step?" |
| **Cook Mode** | Step toggling, Progress state. | "Does the overlay open from Home?" |
| **Sharing** | Privacy scrubbing, DTO mapping. | "Does the share link copy to clipboard?" |
| **Grocery** | Aisle sorting, unit conversion. | "Does the list load from the API?" |
