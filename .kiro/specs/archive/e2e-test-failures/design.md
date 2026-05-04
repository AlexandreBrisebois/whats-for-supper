# e2e-test-failures Bugfix Design

## Overview

Two Playwright e2e tests are failing due to mock infrastructure bugs — no production code is
affected. Both bugs live entirely in `pwa/e2e/mock-api.ts` and `pwa/e2e/planner.spec.ts`.

**Bug 1 — Route shadowing in `setupCommonRoutes`**: The specific handler for
`**/api/recipes/capture-url` is registered *before* the wildcard `**/api/recipes/*`. Playwright
uses last-registered-wins semantics, so the wildcard intercepts the `POST /api/recipes/capture-url`
request and returns a recipe-shaped body (`{ recipe, updatedAt }`) instead of `{ data: { id } }`.
`captureUrl()` reads `result?.data?.id`, gets `undefined`, and `handleUrlCapture` skips the
`router.push(ROUTES.HOME)` call — the page stays on `/capture` and the test times out.

**Bug 2 — Null `topPick` in shared recommendations mock**: `setupCommonRoutes` hardcodes
`topPick: null` in the `**/api/recipes/recommendations` response. `RecipesPage` guards
`data-testid="recipe-card-top-pick"` behind `{topPick && (...)}`, so the element never renders.
The planner round-trip test navigates to `/recipes?addToDay=2&weekOffset=0`, tries to click
`recipe-card-top-pick`, and times out after 30 s.

The fix is minimal and surgical: reorder one route registration in `mock-api.ts` and add a
local route override in `planner.spec.ts`. No production source files change.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — either the wildcard route wins
  over the specific route (Bug 1), or the recommendations mock returns `topPick: null` in a
  test that requires the top-pick card (Bug 2).
- **Property (P)**: The desired behavior when the bug condition holds — the capture-url POST
  returns `{ data: { id } }` and the redirect fires (Bug 1); the top-pick card renders and is
  clickable (Bug 2).
- **Preservation**: All other tests that use `setupCommonRoutes` must continue to pass
  unchanged after the fix.
- **`setupCommonRoutes`**: The shared helper in `pwa/e2e/mock-api.ts` that registers Playwright
  route intercepts for all API endpoints used across the e2e suite.
- **last-registered-wins**: Playwright's route matching rule — when multiple patterns match a
  request URL, the handler registered *last* takes precedence.
- **`captureUrl()`**: The Kiota-generated API client method that posts to
  `/api/recipes/capture-url` and returns `result?.data?.id`.
- **`handleUrlCapture`**: The handler in `MinimalCapture.tsx` that calls `captureUrl()` and
  conditionally calls `router.push(ROUTES.HOME)` only when the returned id is truthy.
- **`topPick`**: The featured recipe returned by `GET /api/recipes/recommendations`; rendered
  as `data-testid="recipe-card-top-pick"` in `RecipesPage` only when non-null.

---

## Bug Details

### Bug 1 — Capture-URL Route Shadowing

The bug manifests when `POST /api/recipes/capture-url` is made during the URL capture test.
`setupCommonRoutes` registers the specific handler for `**/api/recipes/capture-url` at line ~196,
then registers the wildcard `**/api/recipes/*` handler at line ~248. Because Playwright applies
last-registered-wins, the wildcard intercepts the POST and returns `{ recipe: ..., updatedAt: ... }`
— a shape that `captureUrl()` cannot read `data.id` from.

**Formal Specification:**
```
FUNCTION isBugCondition_CaptureUrl(request, routeRegistry)
  INPUT: request       — an outgoing Playwright network request
         routeRegistry — ordered list of registered route handlers (first = earliest registered)
  OUTPUT: boolean

  specificIdx  := indexOf(routeRegistry, "**/api/recipes/capture-url")
  wildcardIdx  := indexOf(routeRegistry, "**/api/recipes/*")

  RETURN request.method = "POST"
     AND request.url MATCHES "/api/recipes/capture-url"
     AND specificIdx < wildcardIdx          // specific registered before wildcard → wildcard wins
END FUNCTION
```

**Examples:**
- `POST /api/recipes/capture-url` with current registration order → wildcard wins → returns
  `{ recipe: {...}, updatedAt: "..." }` → `data.id` is `undefined` → no redirect *(bug)*
- `POST /api/recipes/capture-url` after fix (wildcard registered first) → specific handler wins
  → returns `{ data: { id: "..." } }` → redirect fires *(correct)*
- `GET /api/recipes/abc123` → wildcard handler → returns `{ recipe: {...}, updatedAt: "..." }`
  → unchanged by fix *(preserved)*
- `PATCH /api/recipes/abc123` → wildcard handler → returns `{ recipe: {...}, updatedAt: "..." }`
  → unchanged by fix *(preserved)*

### Bug 2 — Null topPick in Recommendations Mock

The bug manifests when the planner round-trip test navigates to the recipes page in planning
mode. `setupCommonRoutes` always returns `{ data: { topPick: null, results: [] } }` for
`GET /api/recipes/recommendations`. `RecipesPage` renders the top-pick card only when
`topPick` is non-null, so `data-testid="recipe-card-top-pick"` never appears in the DOM.

**Formal Specification:**
```
FUNCTION isBugCondition_TopPick(test, sharedMock)
  INPUT: test       — a Playwright test case
         sharedMock — the recommendations mock body from setupCommonRoutes
  OUTPUT: boolean

  RETURN sharedMock.data.topPick = null
     AND test REQUIRES getByTestId("recipe-card-top-pick") TO BE visible
END FUNCTION
```

**Examples:**
- Planner round-trip test with `topPick: null` → `recipe-card-top-pick` never renders →
  `click()` times out *(bug)*
- Planner round-trip test with local override returning a real recipe as `topPick` →
  `recipe-card-top-pick` renders → click succeeds → redirect to planner fires *(correct)*
- All other planner tests (7 daily cards, week flip, cook mode, finalize) → do not touch
  recommendations mock → unchanged *(preserved)*
- All capture-flow tests → do not touch recommendations mock → unchanged *(preserved)*

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `GET /api/recipes/{id}`, `PATCH /api/recipes/{id}`, `DELETE /api/recipes/{id}` must continue
  to be intercepted by the `**/api/recipes/*` wildcard handler and return the correct
  recipe-shaped response.
- `POST /api/recipes/describe` and `POST /api/recipes` (photo capture) must continue to work
  correctly in all capture-flow tests.
- All planner tests that do not depend on `recipe-card-top-pick` (7 daily cards, week flip,
  cook mode, smart defaults, finalize) must continue to pass without modification.
- The shared `setupCommonRoutes` recommendations mock (`topPick: null`) must remain unchanged
  so that tests that do not need a top-pick card are not affected.
- The capture-url POST request payload assertions (`body.url`, `body.notes`, `body.rating`)
  must continue to pass — the fix does not alter request construction.

**Scope:**
All requests that do NOT match `POST /api/recipes/capture-url` should be completely unaffected
by Bug 1's fix. All tests that do NOT require `recipe-card-top-pick` should be completely
unaffected by Bug 2's fix. This includes:
- All `GET`, `PATCH`, `DELETE` requests to `/api/recipes/*`
- All photo capture and describe-it flows
- All planner schedule, cook mode, and finalize tests
- All family, settings, and management API mocks

---

## Hypothesized Root Cause

### Bug 1

1. **Registration Order Error**: `setupCommonRoutes` was written with the specific
   `**/api/recipes/capture-url` handler registered before the wildcard `**/api/recipes/*`
   handler. The author likely assumed first-registered-wins (Express-style), but Playwright
   uses last-registered-wins. Moving the specific handler to after the wildcard corrects this.

2. **No Playwright Route Ordering Tests**: There are no tests that verify route registration
   order in the mock helper, so the regression went undetected.

### Bug 2

1. **Shared Mock Too Conservative**: `setupCommonRoutes` was designed to be a safe baseline
   for all tests, so `topPick: null` was chosen to avoid accidentally rendering UI that other
   tests don't expect. The planner round-trip test was written assuming a non-null `topPick`
   would be provided, but no local override was added to supply one.

2. **Missing Test-Local Override**: The planner round-trip test should have added a local
   `page.route` override for `**/api/recipes/recommendations` in its `beforeEach` (or inline)
   to return a real `topPick` recipe. This override was never written.

---

## Correctness Properties

Property 1: Bug Condition — Capture-URL Route Returns Correct Shape

_For any_ `POST /api/recipes/capture-url` request made during a Playwright test that uses
`setupCommonRoutes`, the fixed mock infrastructure SHALL intercept the request with the
specific `**/api/recipes/capture-url` handler (not the wildcard), returning
`{ data: { id: "<uuid>" } }` with status 202, so that `captureUrl()` resolves a truthy id
and `handleUrlCapture` calls `router.push(ROUTES.HOME)`.

**Validates: Requirements 2.1, 3.3, 3.4**

Property 2: Bug Condition — Top-Pick Card Renders in Planning Mode

_For any_ navigation to `/recipes?addToDay=<n>&weekOffset=<w>` in the planner round-trip test,
the fixed test infrastructure SHALL provide a non-null `topPick` recipe via a local route
override for `**/api/recipes/recommendations`, so that `RecipesPage` renders
`data-testid="recipe-card-top-pick"` and the test can click it to complete the assignment.

**Validates: Requirements 2.2, 3.2**

Property 3: Preservation — Wildcard Recipe Handler Unchanged

_For any_ request that does NOT match `POST /api/recipes/capture-url` (i.e., `GET`, `PATCH`,
or `DELETE` to `/api/recipes/*`), the fixed `setupCommonRoutes` SHALL produce exactly the same
response as the original, preserving all single-recipe CRUD mock behavior.

**Validates: Requirements 3.1, 3.3**

Property 4: Preservation — Unrelated Tests Unaffected

_For any_ test that does not exercise `POST /api/recipes/capture-url` or
`data-testid="recipe-card-top-pick"`, the fixed test infrastructure SHALL produce exactly the
same behavior as the original, preserving all other capture-flow, planner, family, settings,
and management test outcomes.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

---

## Fix Implementation

### Changes Required

**File 1**: `pwa/e2e/mock-api.ts`

**Change**: Move the `**/api/recipes/capture-url` route registration to *after* the
`**/api/recipes/*` wildcard registration.

**Specific Changes**:
1. **Remove** the `POST /api/recipes/capture-url` block from its current position (before the
   wildcard handler, around line 196).
2. **Insert** the same `POST /api/recipes/capture-url` block immediately *after* the
   `**/api/recipes/*` wildcard handler block (currently ending around line 270).
3. No other changes to `mock-api.ts` — the handler body, status code, and response shape
   remain identical.

**Before (buggy order):**
```
// POST /api/recipes/capture-url   ← registered first (loses to wildcard)
await page.route('**/api/recipes/capture-url', ...)

// ... other routes ...

// GET/PATCH/DELETE /api/recipes/{id}  ← registered last (wins for ALL /recipes/* including capture-url)
await page.route('**/api/recipes/*', ...)
```

**After (fixed order):**
```
// GET/PATCH/DELETE /api/recipes/{id}  ← registered first (wildcard)
await page.route('**/api/recipes/*', ...)

// POST /api/recipes/capture-url   ← registered last (wins for capture-url specifically)
await page.route('**/api/recipes/capture-url', ...)
```

> **Note**: ADR 035 (`specs/decisions/035-e2e-route-handler-url-parsing.md`) confirms that
> Playwright's LIFO (last-registered-wins) ordering is intentional and correct. The fix
> leverages this — moving the specific handler to after the wildcard is the right approach.
> ADR 035 also mandates that all route handlers re-parse URL context from
> `new URL(route.request().url())` inside the handler body, not from the predicate's `url`
> parameter. The `capture-url` handler already follows this pattern and requires no changes
> to its handler body.

---

**File 2**: `pwa/e2e/planner.spec.ts`

**Change**: Add a local route override for `**/api/recipes/recommendations` in the `beforeEach`
of the `'Supper Planner'` describe block, returning a non-null `topPick` recipe.

**Specific Changes**:
1. **Add** a `page.route('**/api/recipes/recommendations', ...)` call inside the `beforeEach`
   of `test.describe('Supper Planner', ...)`, after the `setupCommonRoutes(page)` call.
2. The override returns `{ data: { topPick: builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA,
   name: 'Homemade Lasagna', ... }), results: [] } }`.
3. Because Playwright uses last-registered-wins, this local override (registered after
   `setupCommonRoutes`) will take precedence over the shared `topPick: null` mock for all
   tests in this describe block.
4. The shared `setupCommonRoutes` recommendations mock remains `topPick: null` — no change
   to `mock-api.ts` for this bug.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that
demonstrate the bug on unfixed code, then verify the fix works correctly and preserves
existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix.
Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Run the two failing tests against the unfixed code to observe the exact failure
mode and confirm the root cause.

**Test Cases**:
1. **Capture-URL Redirect Test** (`capture-flow.spec.ts:174`): Run
   `"navigating with url param allows reviewing and manual saving"` on unfixed code — expect
   `toHaveURL(/\/home/)` to time out because the page stays on `/capture` (will fail on
   unfixed code).
2. **Planner Round-Trip Test** (`planner.spec.ts:181`): Run
   `"should complete the search-to-planner round-trip with success feedback"` on unfixed code
   — expect `getByTestId('recipe-card-top-pick').click()` to time out because the element
   never renders (will fail on unfixed code).
3. **Wildcard Handler Preservation**: Verify that `GET /api/recipes/{id}` still returns the
   recipe-shaped body after the reorder (should pass on both unfixed and fixed code, confirming
   the wildcard handler itself is not broken).
4. **Other Planner Tests**: Run the remaining planner tests on unfixed code to confirm they
   pass (baseline for preservation checking).

**Expected Counterexamples**:
- Bug 1: `expect(page).toHaveURL(/\/home/)` times out — page URL remains `/capture`
- Bug 2: `page.getByTestId('recipe-card-top-pick').click()` times out — element not in DOM
- Possible causes confirmed: route registration order (Bug 1), missing local override (Bug 2)

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed infrastructure
produces the expected behavior.

**Pseudocode:**
```
// Bug 1
FOR ALL request WHERE isBugCondition_CaptureUrl(request, routeRegistry) DO
  response := interceptedResponse(request)
  ASSERT response.status = 202
  ASSERT response.body.data.id IS truthy
  ASSERT page.url() MATCHES /\/home/ WITHIN 10s
END FOR

// Bug 2
FOR ALL test WHERE isBugCondition_TopPick(test, sharedMock) DO
  element := page.getByTestId("recipe-card-top-pick")
  ASSERT element IS visible WITHIN 10s
  ASSERT page.url() MATCHES /\/planner\?success=1&dayIndex=2/ AFTER click
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed
infrastructure produces the same result as the original.

**Pseudocode:**
```
// Bug 1 preservation
FOR ALL request WHERE NOT isBugCondition_CaptureUrl(request, routeRegistry) DO
  ASSERT fixedResponse(request) = originalResponse(request)
END FOR

// Bug 2 preservation
FOR ALL test WHERE NOT isBugCondition_TopPick(test, sharedMock) DO
  ASSERT fixedTestOutcome(test) = originalTestOutcome(test)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for all non-capture-url and
non-top-pick tests, then verify those tests continue to pass after the fix.

**Test Cases**:
1. **Wildcard Handler Preservation**: Verify `GET /api/recipes/{id}` returns
   `{ recipe: {...}, updatedAt: "..." }` after the route reorder — confirms the wildcard
   handler still works for single-recipe CRUD.
2. **Other Capture-Flow Tests**: Verify photo capture, describe-it, and GOTO intent tests
   continue to pass after the `mock-api.ts` change.
3. **Other Planner Tests**: Verify all 8 remaining planner tests (7 daily cards, week flip,
   pivot sheet, cook mode, smart defaults, reorder, finalize) continue to pass after the
   `planner.spec.ts` change.
4. **Recommendations Mock Isolation**: Verify that the local override in `planner.spec.ts`
   does not affect any test outside the `'Supper Planner'` describe block.

### Unit Tests

- Verify the capture-url POST handler returns `{ data: { id } }` with status 202 after the
  route reorder.
- Verify the wildcard `**/api/recipes/*` handler still returns `{ recipe, updatedAt }` for
  GET/PATCH/DELETE after the reorder.
- Verify the local recommendations override in `planner.spec.ts` returns a non-null `topPick`
  with the expected recipe shape.

### Property-Based Tests

- Generate random recipe IDs and verify that `GET /api/recipes/{id}` always returns the
  wildcard handler's recipe-shaped response (not the capture-url handler's `data.id` shape).
- Generate random planning day indices and verify that the top-pick card renders and is
  clickable for any valid `addToDay` parameter when the local override is active.
- Verify that for any test in the `'Supper Planner'` describe block that does not click
  `recipe-card-top-pick`, the local recommendations override does not cause regressions.

### Integration Tests

- Run the full `capture-flow.spec.ts` suite after the `mock-api.ts` fix and confirm all
  non-skipped tests pass, including the URL capture redirect test.
- Run the full `planner.spec.ts` suite after the `planner.spec.ts` fix and confirm all
  tests pass, including the round-trip test.
- Run the complete e2e suite (`task e2e` or equivalent) to confirm zero regressions across
  all spec files that import `setupCommonRoutes`.
