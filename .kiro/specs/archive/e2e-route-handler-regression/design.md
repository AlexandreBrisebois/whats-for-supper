# E2E Route Handler Regression — Bugfix Design

## Overview

Five E2E tests regressed after commit f0da597 due to three independent root causes in the test
infrastructure and one component behaviour. The fix is entirely confined to test helpers and one
React component; no API contract or OpenAPI schema is affected.

The three root causes are:

- **Root Cause A** — Playwright's LIFO route-matching guarantee only applies when both matchers
  are the same type (both globs or both predicates). After f0da597, `setupCommonRoutes` uses glob
  strings while per-test overrides use predicate functions, causing FIFO resolution and silently
  bypassing per-test handlers.

- **Root Cause B** — `familyStore` initialises `selectedFamilyMemberId` from
  `getFamilyMemberIdCookie()` at module-load time (Zustand store creation). The `beforeEach` in
  `capture-flow.spec.ts` injects the identity cookie via `addCookies` after the module is already
  evaluated, so the store starts with `null` and `IdentityValidator` redirects to `/onboarding`.

- **Root Cause C** — `MinimalCapture.tsx` contains a `useEffect` that calls
  `router.push(ROUTES.PROFILE_SETTINGS)` immediately when `onSuccess = true && isGoto = true`.
  The page navigates away before the test assertion `getByText(/your goto is being prepared/i)`
  can find the element.

The fix strategy is minimal and surgical:

1. Convert all per-test `page.route()` predicate matchers in `capture-flow.spec.ts` and
   `onboarding.spec.ts` to glob strings so LIFO applies uniformly.
2. Seed `selectedFamilyMemberId` into the Zustand persisted store via `page.addInitScript` before
   any navigation, so the store hydrates with the correct ID before any component mounts.
3. Remove the auto-navigation `useEffect` for the `isGoto = true` path in `MinimalCapture.tsx`.
   Navigation becomes explicit (button-click only). The existing auto-navigate for `isGoto = false`
   is preserved.

---

## Glossary

- **Bug_Condition (C)**: The set of conditions that trigger one of the three bugs — cross-type
  route matcher pairing (A), cookie injected after store init (B), or `onSuccess && isGoto` state
  (C).
- **Property (P)**: The desired observable behaviour when the bug condition holds — per-test
  handler wins (A), store hydrates with correct ID (B), success screen stays visible until
  button click (C).
- **Preservation**: Existing behaviours that must remain unchanged — default route handlers,
  non-GOTO auto-navigation, onboarding flow, and all other test interactions.
- **`setupCommonRoutes`**: The shared helper in `pwa/e2e/mock-api.ts` that registers baseline
  Playwright route handlers for all API endpoints using glob strings.
- **`familyStore`**: The Zustand store in `pwa/src/store/familyStore.ts` that holds
  `selectedFamilyMemberId`, initialised synchronously from `getFamilyMemberIdCookie()` at
  module-load time.
- **`IdentityValidator`**: The React component in
  `pwa/src/components/identity/IdentityValidator.tsx` that redirects to `/onboarding` when
  `selectedFamilyMemberId` is `null` on a protected route.
- **`MinimalCapture`**: The React component in
  `pwa/src/components/capture/MinimalCapture.tsx` that renders the capture UI and manages the
  `onSuccess` / `isGoto` state.
- **LIFO**: Last-In-First-Out — Playwright's route resolution order when multiple handlers match
  the same URL. Only guaranteed when all matching handlers use the same matcher type.
- **`addInitScript`**: Playwright API that injects a script into the page before any navigation,
  ensuring localStorage is seeded before module evaluation.

---

## Bug Details

### Bug Condition A — Glob/Predicate LIFO Bypass

The bug manifests when `setupCommonRoutes` registers a glob-string handler and a per-test
`beforeEach` subsequently registers a predicate-function handler for an overlapping URL. Playwright
resolves cross-type matches in registration order (FIFO), so the glob handler registered first
always wins, bypassing the per-test handler.

**Formal Specification:**

```
FUNCTION isBugConditionA(routeSetup)
  INPUT: routeSetup of type {
    setupMatcher:  string | Function,   -- matcher used by setupCommonRoutes
    testMatcher:   string | Function    -- matcher used by per-test beforeEach
  }
  OUTPUT: boolean

  RETURN typeof routeSetup.setupMatcher = 'string'   -- glob
     AND typeof routeSetup.testMatcher  = 'function' -- predicate
END FUNCTION
```

**Examples:**

- `setupCommonRoutes` registers `'**/api/settings/*'` (glob); per-test registers
  `(url) => url.pathname.includes('/api/settings/')` (predicate) → FIFO, glob wins → **BUG**
- `setupCommonRoutes` registers `'**/api/family'` (glob); per-test registers
  `(url) => url.pathname.includes('/api/family')` (predicate) → FIFO, glob wins → **BUG**
- `setupCommonRoutes` registers `'**/api/settings/*'` (glob); per-test registers
  `'**/api/settings/*'` (glob) → LIFO, per-test wins → **CORRECT**
- `setupCommonRoutes` registers `'**/api/family'` (glob); per-test registers
  `'**/api/family'` (glob) → LIFO, per-test wins → **CORRECT**

### Bug Condition B — Cookie Timing for Identity Initialization

The bug manifests when the `x-family-member-id` cookie is injected via `addCookies` in
`beforeEach` after the `familyStore` Zustand store has already been created (module-load time).
The store reads the cookie synchronously during creation; the late injection is invisible to it.

**Formal Specification:**

```
FUNCTION isBugConditionB(testSetup)
  INPUT: testSetup of type {
    cookieInjectedAt:  'before-module-load' | 'after-module-load',
    localStorageSeeded: boolean
  }
  OUTPUT: boolean

  RETURN testSetup.cookieInjectedAt = 'after-module-load'
     AND testSetup.localStorageSeeded = false
END FUNCTION
```

**Examples:**

- `addCookies` called in `beforeEach` after page load, no `addInitScript` → store starts with
  `null` → `IdentityValidator` redirects to `/onboarding` → **BUG**
- `addInitScript` seeds `family-storage` in localStorage before navigation → store hydrates with
  correct ID → `IdentityValidator` allows access → **CORRECT**
- Test navigates to `/onboarding` with no identity set → store is `null` → onboarding renders
  normally → **CORRECT (not a bug condition)**

### Bug Condition C — Auto-Navigation on GOTO Success Screen

The bug manifests when `MinimalCapture` sets `onSuccess = true` after a successful GOTO capture.
A `useEffect` fires synchronously on the next render and calls `router.push(ROUTES.PROFILE_SETTINGS)`,
navigating away before the test can assert the success heading.

**Formal Specification:**

```
FUNCTION isBugConditionC(captureState)
  INPUT: captureState of type {
    onSuccess: boolean,
    isGoto:    boolean
  }
  OUTPUT: boolean

  RETURN captureState.onSuccess = true
     AND captureState.isGoto    = true
END FUNCTION
```

**Examples:**

- `onSuccess = true`, `isGoto = true` → `useEffect` calls `router.push` immediately →
  success screen unmounts before assertion → **BUG**
- `onSuccess = true`, `isGoto = false` → `useEffect` calls `router.push(ROUTES.HOME)` →
  auto-navigation preserved → **CORRECT (not a bug condition)**
- `onSuccess = false`, `isGoto = true` → no navigation → **CORRECT (not a bug condition)**

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- `setupCommonRoutes` default handlers continue to respond correctly for all tests that do not
  register per-test overrides (3.3).
- Per-test glob handlers registered after `setupCommonRoutes` continue to win via LIFO (3.4).
- `MinimalCapture` with `isGoto = false` continues to auto-navigate to `/home` when
  `onSuccess = true` (3.5).
- `POST /api/settings/family_goto` payload shape (`value.recipeId`, no `value.status`) is
  unchanged (3.6).
- Navigating to `/onboarding` without any identity set continues to display the family selector
  without redirecting (3.1).
- Navigating to `/capture` with a valid identity continues to render capture controls (3.2).

**Scope:**

All inputs that do NOT satisfy any of the three bug conditions should be completely unaffected by
this fix. This includes:

- Tests that use only glob matchers in both `setupCommonRoutes` and per-test overrides.
- Tests that seed identity via `addInitScript` (already correct pattern).
- All non-GOTO capture flows.
- All onboarding flows.
- All schedule, recipe, and discovery API interactions.

---

## Hypothesized Root Cause

### Root Cause A — Glob/Predicate LIFO Bypass

1. **Matcher type mismatch**: f0da597 migrated `setupCommonRoutes` to glob strings but left
   per-test overrides as predicate functions. Playwright's internal route resolution only applies
   LIFO when comparing handlers of the same matcher type; cross-type falls back to insertion order.
   - Affected: `**/api/settings/*` vs `(url) => url.pathname.includes('/api/settings/')` in
     `capture-flow.spec.ts` (multiple describe blocks).
   - Affected: `**/api/family` vs `(url) => url.pathname.includes('/api/family')` in
     `onboarding.spec.ts`.

2. **Silent failure**: Playwright does not warn when a glob handler shadows a predicate handler.
   The per-test handler is registered but never invoked.

### Root Cause B — Cookie Timing for Identity Initialization

1. **Module-load-time initialisation**: `familyStore` calls `getFamilyMemberIdCookie()` inside
   the `create()` call, which executes when the module is first imported — before any test
   `beforeEach` runs.

2. **`addCookies` is too late**: `page.context().addCookies(...)` sets the cookie in the browser
   context, but the Next.js app has already evaluated the store module in the previous page
   lifecycle. The cookie is present for server-side reads but the client-side Zustand store has
   already captured `null`.

3. **`addInitScript` is the correct fix**: Scripts registered via `page.addInitScript` run before
   any page scripts, including module evaluation. Seeding `family-storage` in localStorage ensures
   the Zustand `persist` middleware hydrates with the correct ID before `familyStore` is created.

### Root Cause C — Auto-Navigation on GOTO Success Screen

1. **Unconditional `useEffect`**: The `useEffect` in `MinimalCapture` watches `[onSuccess, router,
   isGoto]` and calls `router.push` for both `isGoto = true` and `isGoto = false` paths. There is
   no delay or user-interaction gate for the GOTO path.

2. **Race condition**: The success screen JSX is rendered in the same React commit that sets
   `onSuccess = true`. The `useEffect` fires after paint, but Playwright's `getByText` assertion
   may not complete before the navigation unmounts the component.

3. **Correct fix**: Remove the `isGoto = true` branch from the `useEffect`. The "Back to Settings"
   button already calls `router.push(dest)` explicitly, so navigation is preserved via user
   interaction. The `isGoto = false` branch (auto-navigate to `/home`) must remain.

---

## Correctness Properties

Property 1: Bug Condition A — Per-Test Glob Handler Wins via LIFO

_For any_ URL that matches both a `setupCommonRoutes` glob handler and a per-test glob handler
registered after it, the fixed test infrastructure SHALL route the request to the per-test handler,
returning the per-test response body, regardless of the URL pattern used.

**Validates: Requirements 2.3, 2.4**

Property 2: Bug Condition B — Store Hydrates with Correct Identity Before Navigation

_For any_ test that seeds `family-storage` in localStorage via `addInitScript` before the first
`page.goto`, the fixed test infrastructure SHALL ensure `familyStore.selectedFamilyMemberId` is
non-null when `IdentityValidator` first evaluates, so the user is NOT redirected to `/onboarding`.

**Validates: Requirements 2.1, 2.2**

Property 3: Bug Condition C — GOTO Success Screen Stable Until Button Click

_For any_ capture flow where `onSuccess = true` and `isGoto = true`, the fixed `MinimalCapture`
component SHALL keep the success screen visible (heading "Your GOTO is being prepared" present in
the DOM) until the user explicitly clicks the "Back to Settings" button, and SHALL NOT
auto-navigate via `useEffect`.

**Validates: Requirements 2.5**

Property 4: Preservation — Non-GOTO Auto-Navigation Unchanged

_For any_ capture flow where `onSuccess = true` and `isGoto = false`, the fixed `MinimalCapture`
component SHALL continue to auto-navigate to `/home` via the existing `useEffect`, preserving the
original behaviour for all non-GOTO captures.

**Validates: Requirements 3.5**

Property 5: Preservation — Default Route Handlers Unaffected

_For any_ test that calls only `setupCommonRoutes` without registering per-test overrides, the
fixed infrastructure SHALL continue to respond to all API requests with the default mock responses
defined in `setupCommonRoutes`, with no change in status codes or response bodies.

**Validates: Requirements 3.3, 3.4**

---

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

---

**Fix A — Convert per-test predicate matchers to glob strings**

**File**: `pwa/e2e/capture-flow.spec.ts`

**Affected describe blocks**: `Capture Flow`, `Capture — initial state rendering`,
`Capture — describe link interaction`, `Capture — describe form validation`,
`Capture — GOTO intent`, `Settings — GOTO pending state`

**Specific Changes**:

1. **Settings handler matcher**: Replace every instance of
   `(url) => url.pathname.includes('/api/settings/')` with the glob string `'**/api/settings/*'`.
   This matches the exact glob already used by `setupCommonRoutes`, ensuring LIFO applies.

2. **Family handler matcher**: Replace every instance of
   `(url) => url.pathname.includes('/api/family')` with the glob string `'**/api/family'`.

3. **Schedule handler matcher**: Replace every instance of
   `(url) => url.pathname.includes('/api/schedule')` with the glob string `'**/api/schedule'`.

4. **Recipes handler matchers**: Replace every instance of
   `(url) => url.pathname.includes('/api/recipes')` with `'**/api/recipes'` and
   `(url) => url.pathname.endsWith('/api/recipes')` with `'**/api/recipes'`.

5. **Describe handler matcher**: Replace
   `(url) => url.pathname.includes('/api/recipes/describe')` with `'**/api/recipes/describe'`.

6. **Recipe status handler matcher**: Replace
   `(url) => url.pathname.includes('/api/recipes/') && url.pathname.endsWith('/status')` with
   `'**/api/recipes/*/status'`.

7. **Capture-url handler matcher**: Replace
   `(url) => url.pathname.includes('/api/recipes/capture-url')` with
   `'**/api/recipes/capture-url'`.

---

**File**: `pwa/e2e/onboarding.spec.ts`

**Specific Changes**:

1. **Family handler matcher**: Replace
   `(url) => url.pathname.includes('/api/family')` with `'**/api/family'`.

2. **Schedule handler matcher**: Replace
   `(url) => url.pathname.includes('/api/schedule')` with `'**/api/schedule'`.

---

**Fix B — Seed identity via `addInitScript` before navigation**

**File**: `pwa/e2e/capture-flow.spec.ts`

The `addInitScript` call seeding `family-storage` is already present in most `beforeEach` blocks
in this file (added as part of a prior partial fix). Verify all `beforeEach` blocks that set the
`x-family-member-id` cookie also include the `addInitScript` call. No new code is needed if the
script is already present; this is a verification step.

**File**: `pwa/e2e/fixtures.ts`

No changes required. The fixture already clears cookies and injects `h_access`. Identity seeding
is intentionally per-test (not global) because different tests require different identities or no
identity at all.

---

**Fix C — Remove auto-navigation `useEffect` for GOTO path**

**File**: `pwa/src/components/capture/MinimalCapture.tsx`

**Function**: The `useEffect` that watches `[onSuccess, router, isGoto]`

**Current code:**
```typescript
useEffect(() => {
  if (onSuccess) {
    const dest = isGoto ? ROUTES.PROFILE_SETTINGS : ROUTES.HOME;
    router.push(dest as any);
  }
}, [onSuccess, router, isGoto]);
```

**Replacement:**
```typescript
useEffect(() => {
  if (onSuccess && !isGoto) {
    router.push(ROUTES.HOME as any);
  }
}, [onSuccess, router, isGoto]);
```

**Rationale**: The GOTO success screen already renders a "Back to Settings" button that calls
`router.push(ROUTES.PROFILE_SETTINGS)` on click. Auto-navigation is not needed and races with
test assertions. The non-GOTO path (`isGoto = false`) retains auto-navigation to `/home` as
required by requirement 3.5.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate
each bug on unfixed code, then verify the fix works correctly and preserves existing behaviour.

The three bugs are independent and can be validated in isolation.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing the fix. Confirm
or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Run the existing failing E2E tests on the unfixed codebase to observe the failure
modes. Instrument with console logging to confirm which route handler responds to each request and
what `selectedFamilyMemberId` is at `IdentityValidator` evaluation time.

**Test Cases**:

1. **Route A — Settings bypass** (will fail on unfixed code): In `Capture — GOTO intent`, after
   `setupCommonRoutes` and the per-test settings handler are registered, make a `GET
   /api/settings/family_goto` request and assert the per-test handler's response body is returned.
   On unfixed code, the `setupCommonRoutes` glob handler responds instead.

2. **Route A — Family bypass** (will fail on unfixed code): In `Onboarding`, after
   `setupCommonRoutes` and the per-test stateful family handler are registered, make a `POST
   /api/family` request and assert the stateful handler's response is returned. On unfixed code,
   the `setupCommonRoutes` glob handler responds with a static member list.

3. **Identity B — Redirect on protected route** (will fail on unfixed code): In `Capture Flow`,
   after `addCookies` but without `addInitScript`, navigate to `/home` and assert the URL stays
   `/home`. On unfixed code, `IdentityValidator` redirects to `/onboarding`.

4. **GOTO C — Success screen race** (will fail on unfixed code): In `Capture — GOTO intent`,
   after a successful describe-it capture, assert `getByText(/your goto is being prepared/i)` is
   visible. On unfixed code, the `useEffect` navigates away before the assertion completes.

**Expected Counterexamples**:

- Route handler responses do not match per-test mock bodies — the `setupCommonRoutes` default
  body is returned instead.
- `page.url()` shows `/onboarding` instead of `/home` after navigation with a valid cookie.
- `getByText(/your goto is being prepared/i)` times out because the element is unmounted.

---

### Fix Checking

**Goal**: Verify that for all inputs where each bug condition holds, the fixed code produces the
expected behaviour.

**Pseudocode:**

```
-- Fix A
FOR ALL routeSetup WHERE isBugConditionA(routeSetup) DO
  response ← resolvedHandler(routeSetup)
  ASSERT response = routeSetup.testHandler.response
END FOR

-- Fix B
FOR ALL testSetup WHERE isBugConditionB(testSetup) DO
  memberId ← familyStore.selectedFamilyMemberId
  ASSERT memberId ≠ null
  ASSERT IdentityValidator.redirectedToOnboarding = false
END FOR

-- Fix C
FOR ALL captureState WHERE isBugConditionC(captureState) DO
  screen ← renderSuccessScreen(captureState)
  ASSERT isVisible(screen, /your goto is being prepared/i)
  ASSERT NOT autoNavigated(screen)
END FOR
```

---

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed code produces
the same result as the original code.

**Pseudocode:**

```
-- Preservation A: glob-vs-glob still uses LIFO
FOR ALL routeSetup WHERE NOT isBugConditionA(routeSetup) DO
  ASSERT resolvedHandler_fixed(routeSetup) = resolvedHandler_original(routeSetup)
END FOR

-- Preservation B: tests without identity still reach onboarding
FOR ALL testSetup WHERE NOT isBugConditionB(testSetup) DO
  ASSERT familyStore_fixed.selectedFamilyMemberId = familyStore_original.selectedFamilyMemberId
END FOR

-- Preservation C: non-GOTO onSuccess still auto-navigates
FOR ALL captureState WHERE NOT isBugConditionC(captureState) DO
  ASSERT autoNavigated_fixed(captureState) = autoNavigated_original(captureState)
END FOR
```

**Testing Approach**: Property-based testing is recommended for Preservation A because the input
space (URL patterns × matcher types) is large and combinatorial. Example-based tests are
sufficient for Preservation B and C because the non-bug paths are simple and deterministic.

**Test Cases**:

1. **Default settings handler** (Preservation A/3.3): In a test with only `setupCommonRoutes`,
   assert `GET /api/settings/family_goto` returns `{ data: { key, value: null } }` (200 OK).
2. **Onboarding without identity** (Preservation B/3.1): Navigate to `/onboarding` with no
   localStorage seed, assert family selector is visible and no redirect occurs.
3. **Non-GOTO auto-navigation** (Preservation C/3.5): Complete a non-GOTO photo capture, assert
   URL changes to `/home` automatically without a button click.
4. **GOTO settings payload shape** (Preservation/3.6): Assert `POST /api/settings/family_goto`
   body has `value.recipeId` set and `value.status` undefined.

---

### Unit Tests

- Test that `MinimalCapture` with `onSuccess = true, isGoto = false` calls `router.push` with
  `ROUTES.HOME` (auto-navigate preserved).
- Test that `MinimalCapture` with `onSuccess = true, isGoto = true` does NOT call `router.push`
  automatically; only calls it when the "Back to Settings" button is clicked.
- Test that `MinimalCapture` renders the correct heading and subtext for each `isGoto` value on
  the success screen.

### Property-Based Tests

- Generate random URL patterns and verify that when both `setupCommonRoutes` and a per-test
  handler use glob strings, the per-test handler always wins (LIFO invariant).
- Generate random `captureState` objects where `isGoto = false` and verify `MinimalCapture`
  always auto-navigates to `/home` when `onSuccess = true`.
- Generate random `captureState` objects where `isGoto = true` and verify `MinimalCapture` never
  auto-navigates; the success screen heading is always visible.

### Integration Tests

- Full E2E: `Capture — GOTO intent` → describe-it path → assert success screen visible → click
  "Back to Settings" → assert URL is `/profile/settings`.
- Full E2E: `Capture — GOTO intent` → photo path → assert success screen visible → click
  "Back to Settings" → assert URL is `/profile/settings`.
- Full E2E: `Onboarding` → add new member → assert stateful mock returns updated member list →
  assert redirect to `/home`.
- Full E2E: `Capture Flow` → navigate to `/home` with identity seeded → assert no redirect to
  `/onboarding` → click "Capture a recipe" → assert URL is `/capture`.
