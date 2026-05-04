# Bugfix Requirements Document

## Introduction

Two Playwright e2e tests are failing due to mock/implementation mismatches in the shared
`setupCommonRoutes` helper and the test-local route registrations in `capture-flow.spec.ts`.
Both tests cover real, valuable user journeys — the URL capture save-and-redirect flow and the
search-to-planner recipe assignment round-trip — and must be fixed rather than deleted.

**Bug 1 — `capture-flow.spec.ts:174` "navigating with url param allows reviewing and manual saving"**

`handleUrlCapture` in `MinimalCapture.tsx` calls `captureUrl()` via the Kiota-generated client,
which resolves to `POST /api/recipes/capture-url`. `setupCommonRoutes` registers a specific mock
for `**/api/recipes/capture-url` (status 202, returns `{ data: { id } }`), but then registers a
broader wildcard `**/api/recipes/*` handler later in the same function. In Playwright, the
**last-registered** route wins for overlapping patterns, so the wildcard handler intercepts the
capture-url POST and returns a recipe-shaped body (`{ recipe: ..., updatedAt: ... }`) instead of
`{ data: { id } }`. `captureUrl()` reads `result?.data?.id`, gets `undefined`, returns `''`, and
`handleUrlCapture` receives a falsy id — so `router.push(ROUTES.HOME)` is never called and the
page stays on `/capture`, causing the `toHaveURL(/\/home/)` assertion to time out.

**Bug 2 — `planner.spec.ts:181` "should complete the search-to-planner round-trip with success feedback"**

`RecipesPage` renders `data-testid="recipe-card-top-pick"` only when `topPick` is non-null (guarded
by `{topPick && (...)}` at line 148 of `recipes/page.tsx`). `setupCommonRoutes` unconditionally
mocks `GET /api/recipes/recommendations` with `{ data: { topPick: null, results: [] } }`. The test
navigates to `/recipes?addToDay=2&weekOffset=0` and immediately tries to click
`recipe-card-top-pick`, but the element never renders because `topPick` is always `null` in the
shared mock. The test times out after 30 s waiting for the locator.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the capture-url test navigates to `/capture?url=<encoded-url>` and clicks "Save Recipe"
    THEN the system stays on the `/capture` page instead of redirecting to `/home`, because the
    Playwright wildcard route `**/api/recipes/*` (registered after `**/api/recipes/capture-url` in
    `setupCommonRoutes`) intercepts the POST and returns a body that does not contain `data.id`,
    causing `captureUrl()` to return an empty string and `handleUrlCapture` to skip the redirect.

1.2 WHEN the planner round-trip test navigates to `/recipes?addToDay=2&weekOffset=0`
    THEN the system never renders the `recipe-card-top-pick` element, because
    `setupCommonRoutes` mocks `GET /api/recipes/recommendations` with `topPick: null` and
    `RecipesPage` conditionally renders the top-pick card only when `topPick` is non-null.

### Expected Behavior (Correct)

2.1 WHEN the capture-url test navigates to `/capture?url=<encoded-url>` and clicks "Save Recipe"
    THEN the system SHALL call `POST /api/recipes/capture-url`, receive `{ data: { id } }` from
    the mock, and redirect to `/home` within the 10 s timeout.

2.2 WHEN the planner round-trip test navigates to `/recipes?addToDay=2&weekOffset=0`
    THEN the system SHALL render `data-testid="recipe-card-top-pick"` because the
    recommendations mock returns a non-null `topPick` recipe, allowing the test to click it and
    complete the assignment round-trip.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN any other capture-flow test (photo capture, describe-it, GOTO intent) runs
    THEN the system SHALL CONTINUE TO intercept `POST /api/recipes` and `POST /api/recipes/describe`
    correctly, with no change to those mock responses or test outcomes.

3.2 WHEN the planner tests that do not depend on `recipe-card-top-pick` run (e.g. "should display
    7 daily cards", "should flip weeks", "should trigger Cook Mode")
    THEN the system SHALL CONTINUE TO pass without modification, because the recommendations mock
    change only affects the top-pick card rendering and does not touch schedule or family mocks.

3.3 WHEN any test that relies on `setupCommonRoutes` for the `**/api/recipes/*` wildcard handler
    (GET/PATCH/DELETE single recipe) runs
    THEN the system SHALL CONTINUE TO receive the correct recipe-shaped response for those
    operations, because the fix must not remove or break the wildcard handler — only ensure
    `capture-url` is matched before it.

3.4 WHEN the capture-url test verifies the POST request payload (`body.url`, `body.notes`,
    `body.rating`)
    THEN the system SHALL CONTINUE TO assert those values correctly, as the fix does not change
    the request construction in `handleUrlCapture` or `captureUrl()`.

---

## Bug Condition Pseudocode

### Bug 1 — Capture-URL Route Shadowing

```pascal
FUNCTION isBugCondition_CaptureUrl(route)
  INPUT: route — a Playwright route registration event
  OUTPUT: boolean

  // Bug fires when the wildcard handler is registered AFTER the specific handler
  // for the same URL pattern, causing Playwright to match the wildcard first
  RETURN route.pattern = "**/api/recipes/*"
     AND route.registeredAfter("**/api/recipes/capture-url")
     AND request.method = "POST"
     AND request.url MATCHES "/api/recipes/capture-url"
END FUNCTION

// Property: Fix Checking
FOR ALL request WHERE isBugCondition_CaptureUrl(request) DO
  response ← interceptedResponse(request)
  ASSERT response.body CONTAINS "data.id"
  ASSERT response.status = 202
END FOR

// Property: Preservation Checking
FOR ALL request WHERE NOT isBugCondition_CaptureUrl(request) DO
  ASSERT interceptedResponse(request) = originalMockResponse(request)
END FOR
```

### Bug 2 — Null topPick in Recommendations Mock

```pascal
FUNCTION isBugCondition_TopPick(mockResponse)
  INPUT: mockResponse — the body returned by the recommendations mock
  OUTPUT: boolean

  RETURN mockResponse.data.topPick = null
     AND test REQUIRES "recipe-card-top-pick" TO BE visible
END FUNCTION

// Property: Fix Checking
FOR ALL test WHERE isBugCondition_TopPick(recommendationsMock) DO
  element ← page.getByTestId("recipe-card-top-pick")
  ASSERT element IS visible WITHIN timeout
END FOR

// Property: Preservation Checking
FOR ALL test WHERE NOT isBugCondition_TopPick(recommendationsMock) DO
  ASSERT plannerTests CONTINUE TO pass
  ASSERT captureFlowTests CONTINUE TO pass
END FOR
```
