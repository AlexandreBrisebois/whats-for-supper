# Bugfix Requirements Document

## Introduction

After commit f0da597 ("refactor: standardize E2E routehandler URL parsing"), 5 E2E tests are
failing across `capture-flow.spec.ts` and `onboarding.spec.ts`. The refactor migrated all
Playwright route matchers in `setupCommonRoutes` from regex patterns to glob strings
(`'**/api/settings/*'`), while per-test overrides in the spec files were migrated to predicate
functions (`(url) => url.pathname.includes('/api/settings/')`).

This mismatch breaks Playwright's LIFO (Last In, First Out) route-matching guarantee: when a
glob string and a predicate function both match the same URL, Playwright resolves them in
registration order (FIFO), not LIFO. Per-test handlers registered *after* `setupCommonRoutes`
are silently bypassed by the earlier glob handlers.

Three distinct root causes are responsible for the 5 failures:

- **Root cause 1 (tests 1, 2, 4):** The `x-family-member-id` cookie is set via `addCookies`
  in `beforeEach`, but `familyStore` initializes `selectedFamilyMemberId` from
  `getFamilyMemberIdCookie()` at module-load time — before the cookie is injected. The store
  starts with `selectedFamilyMemberId = null`, causing `IdentityValidator` to redirect
  authenticated tests to `/onboarding`.

- **Root cause 2 (tests 1, 2, 4):** The per-test settings and family mock handlers (predicate
  functions) are bypassed by the `setupCommonRoutes` glob handlers due to the glob/predicate
  LIFO ordering bug, so per-test mock isolation is broken.

- **Root cause 3 (test 3):** After a successful GOTO describe-it capture, `MinimalCapture`
  sets `onSuccess = true` and a `useEffect` immediately calls `router.push(ROUTES.PROFILE_SETTINGS)`,
  navigating away from the success screen before the test assertion
  `getByText(/your goto is being prepared/i)` can find the element.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `capture-flow` `beforeEach` calls `page.context().addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX }])` and then navigates to `/home` THEN the system redirects to `/onboarding` because `familyStore` initializes `selectedFamilyMemberId` from `getFamilyMemberIdCookie()` at module-load time before the cookie is injected, leaving `selectedFamilyMemberId` as null

1.2 WHEN `IdentityValidator` evaluates a protected route with `selectedFamilyMemberId = null` THEN the system redirects to `/onboarding`, causing the "capture a recipe" link and the search nav link to be unreachable

1.3 WHEN `IdentityValidator` redirects to `/onboarding` mid-navigation THEN the system detaches DOM elements from the protected route (e.g. the nav bar search link), causing test timeouts on click interactions

1.4 WHEN `setupCommonRoutes` registers `'**/api/settings/*'` (glob) and a per-test `beforeEach` subsequently registers `(url) => url.pathname.includes('/api/settings/')` (predicate) for the same URL THEN the system routes requests to the glob handler (registered first) instead of the predicate handler (registered second), bypassing per-test mock isolation

1.5 WHEN `MinimalCapture` sets `onSuccess = true` after a successful GOTO describe-it capture THEN the system immediately calls `router.push(ROUTES.PROFILE_SETTINGS)` via a `useEffect`, navigating away from the success screen before `getByText(/your goto is being prepared/i)` is visible to the test

1.6 WHEN `onboarding.spec.ts` `beforeEach` registers a stateful predicate-based family mock after `setupCommonRoutes` registers a glob-based family mock THEN the system routes `/api/family` requests to the glob handler, bypassing the stateful mock and breaking the "add member" test's member list tracking

### Expected Behavior (Correct)

2.1 WHEN `capture-flow` `beforeEach` sets the `x-family-member-id` cookie THEN the system SHALL initialize `selectedFamilyMemberId` with the correct member ID so the `IdentityValidator` does not redirect to `/onboarding`

2.2 WHEN an authenticated user navigates to `/home` in a test with a valid identity cookie THEN the system SHALL render the home page without redirecting to `/onboarding`

2.3 WHEN a per-test `page.route()` handler is registered after `setupCommonRoutes` for the same URL pattern THEN the system SHALL use the per-test handler (LIFO), regardless of whether the matcher is a glob string or a predicate function

2.4 WHEN the `Capture — GOTO intent` `beforeEach` registers a settings handler after `setupCommonRoutes` THEN the system SHALL route `GET /api/settings/family_goto` and `POST /api/settings/family_goto` to the per-test handler with its own isolated `settingsStore` closure

2.5 WHEN `MinimalCapture` sets `onSuccess = true` after a successful GOTO capture THEN the system SHALL keep the success screen visible until the user clicks the "Back to Settings" button, and SHALL NOT auto-navigate via `useEffect`

2.6 WHEN `onboarding.spec.ts` registers a stateful family mock after `setupCommonRoutes` THEN the system SHALL route all `/api/family` requests to the per-test stateful handler, preserving the member list across GET and POST calls within the test

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a test navigates to `/onboarding` without any identity set THEN the system SHALL CONTINUE TO display the family selector and allow member selection without redirecting

3.2 WHEN a test navigates to `/capture` with a valid identity cookie THEN the system SHALL CONTINUE TO render the capture controls (camera button, gallery button, describe link) without redirecting

3.3 WHEN `setupCommonRoutes` is called in a test that does not register any per-test settings override THEN the system SHALL CONTINUE TO respond to `GET /api/settings/*` with `{ data: { key, value: null } }` (200 OK) as the default

3.4 WHEN a test registers a per-test route handler using a glob string after `setupCommonRoutes` THEN the system SHALL CONTINUE TO honor LIFO and use the per-test glob handler

3.5 WHEN `MinimalCapture` is used without `intent=goto` and `onSuccess` becomes true THEN the system SHALL CONTINUE TO auto-navigate to `/home` via the `onSuccess` `useEffect`

3.6 WHEN the `Capture — GOTO intent` tests run with corrected mock ordering THEN `POST /api/settings/family_goto` SHALL CONTINUE TO be called with `{ value: { additionalData: { description, recipeId } } }` and assertions on `settBody.value?.recipeId` SHALL CONTINUE TO pass

---

## Bug Condition Pseudocode

### Bug Condition A — Glob/Predicate LIFO Bypass

```pascal
FUNCTION isBugConditionA(routeSetup)
  INPUT: routeSetup of type { setupMatcher: string | Function, testMatcher: string | Function }
  OUTPUT: boolean

  RETURN typeof routeSetup.setupMatcher = 'string'
     AND typeof routeSetup.testMatcher = 'function'
END FUNCTION

// Property: Fix Checking — per-test handler must win
FOR ALL r WHERE isBugConditionA(r) DO
  result ← resolvedHandler(r)
  ASSERT result = r.testMatcher
END FOR

// Property: Preservation Checking
FOR ALL r WHERE NOT isBugConditionA(r) DO
  ASSERT resolvedHandler(r) = resolvedHandler_original(r)
END FOR
```

### Bug Condition B — Cookie Timing for Identity Initialization

```pascal
FUNCTION isBugConditionB(testSetup)
  INPUT: testSetup of type { cookieInjectedBeforeStoreInit: boolean }
  OUTPUT: boolean

  RETURN testSetup.cookieInjectedBeforeStoreInit = false
END FUNCTION

// Property: Fix Checking — selectedFamilyMemberId must be non-null after beforeEach
FOR ALL t WHERE isBugConditionB(t) DO
  result ← familyStore.selectedFamilyMemberId
  ASSERT result ≠ null
END FOR

// Property: Preservation Checking
FOR ALL t WHERE NOT isBugConditionB(t) DO
  ASSERT familyStore.selectedFamilyMemberId = familyStore_original.selectedFamilyMemberId
END FOR
```

### Bug Condition C — Auto-Navigation on GOTO Success Screen

```pascal
FUNCTION isBugConditionC(captureState)
  INPUT: captureState of type { onSuccess: boolean, isGoto: boolean }
  OUTPUT: boolean

  RETURN captureState.onSuccess = true AND captureState.isGoto = true
END FUNCTION

// Property: Fix Checking — success screen must be stable until user interaction
FOR ALL s WHERE isBugConditionC(s) DO
  result ← renderSuccessScreen(s)
  ASSERT isVisible(result, /your goto is being prepared/i)
  ASSERT NOT autoNavigated(result)
END FOR

// Property: Preservation Checking
FOR ALL s WHERE NOT isBugConditionC(s) DO
  ASSERT autoNavigated(s) = autoNavigated_original(s)
END FOR
```
