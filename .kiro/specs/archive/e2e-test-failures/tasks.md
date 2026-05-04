# Tasks: e2e-test-failures Bugfix

## Task List

- [x] 1. Fix Bug 1 — reorder route registrations in `pwa/e2e/mock-api.ts`
  - [x] 1.1 Move the `**/api/recipes/capture-url` route block to after the `**/api/recipes/*` wildcard block in `setupCommonRoutes` (per ADR 035 LIFO semantics — last-registered wins)
  - [x] 1.2 Confirm the `capture-url` handler body still re-parses URL context via `new URL(route.request().url())` per ADR 035 — no changes to the handler body should be needed

- [x] 2. Fix Bug 2 — add local recommendations override in `pwa/e2e/planner.spec.ts`
  - [x] 2.1 Add a `page.route('**/api/recipes/recommendations', ...)` override in the `beforeEach` of `test.describe('Supper Planner', ...)`, after the `setupCommonRoutes(page)` call, returning `{ data: { topPick: builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Homemade Lasagna', ... }), results: [] } }`
  - [x] 2.2 Confirm the shared `setupCommonRoutes` recommendations mock (`topPick: null`) is left unchanged

- [x] 3. Verify fixes and check for regressions
  - [x] 3.1 Run the two previously-failing tests and confirm they pass
  - [x] 3.2 Run the full `capture-flow.spec.ts` and `planner.spec.ts` suites and confirm no regressions
