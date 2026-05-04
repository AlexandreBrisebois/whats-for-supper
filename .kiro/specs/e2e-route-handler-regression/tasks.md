# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Glob/Predicate LIFO Bypass + Cookie Timing + GOTO Auto-Navigation
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate all three bugs exist
  - **Scoped PBT Approach**: Scope to the concrete failing cases for each bug condition
  - Bug Condition A — In `Capture — GOTO intent` describe block, after `setupCommonRoutes` registers `'**/api/settings/*'` (glob) and the per-test `beforeEach` registers `(url) => url.pathname.includes('/api/settings/')` (predicate), make a `GET /api/settings/family_goto` request and assert the per-test handler's isolated `settingsStore` response is returned. On unfixed code the `setupCommonRoutes` glob handler responds instead (isBugConditionA: setupMatcher is string AND testMatcher is function)
  - Bug Condition B — In `Capture Flow` describe block, after `addCookies` injects `x-family-member-id` but WITHOUT `addInitScript` seeding `family-storage`, navigate to `/home` and assert `page.url()` stays `/home`. On unfixed code `IdentityValidator` redirects to `/onboarding` because `familyStore.selectedFamilyMemberId` is null (isBugConditionB: cookieInjectedAt = 'after-module-load' AND localStorageSeeded = false)
  - Bug Condition C — In `Capture — GOTO intent` describe block, after a successful describe-it capture sets `onSuccess = true` and `isGoto = true`, assert `getByText(/your goto is being prepared/i)` is visible. On unfixed code the `useEffect` calls `router.push(ROUTES.PROFILE_SETTINGS)` immediately, unmounting the success screen before the assertion (isBugConditionC: onSuccess = true AND isGoto = true)
  - Run the 5 originally-failing E2E tests on UNFIXED code: `npx playwright test capture-flow onboarding --reporter=list`
  - **EXPECTED OUTCOME**: Tests FAIL — this is correct, it proves the bugs exist
  - Document counterexamples found:
    - Route handler responses do not match per-test mock bodies (setupCommonRoutes default body returned instead)
    - `page.url()` shows `/onboarding` instead of `/home` after navigation with a valid cookie
    - `getByText(/your goto is being prepared/i)` times out because the element is unmounted
  - Mark task complete when tests are run on unfixed code and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Default Route Handlers, Non-GOTO Auto-Navigation, Onboarding Flow
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code with non-buggy inputs first
  - Observe: In a test that calls only `setupCommonRoutes` (no per-test override), `GET /api/settings/family_goto` returns `{ data: { key: 'family_goto', value: null } }` (200 OK) — this is the default handler behavior to preserve (¬isBugConditionA: both matchers are globs or no per-test override)
  - Observe: Navigating to `/onboarding` with no identity set (no `addInitScript`, no cookie) renders the family selector without redirecting — `IdentityValidator` allows onboarding (¬isBugConditionB: no identity seeding needed for onboarding)
  - Observe: `MinimalCapture` with `onSuccess = true, isGoto = false` calls `router.push(ROUTES.HOME)` automatically — non-GOTO auto-navigation is preserved (¬isBugConditionC: isGoto = false)
  - Write unit test: `MinimalCapture` with `onSuccess = true, isGoto = false` → `router.push` called with `ROUTES.HOME` (auto-navigate preserved, requirement 3.5)
  - Write unit test: `MinimalCapture` with `onSuccess = true, isGoto = true` → `router.push` NOT called automatically; success heading "Your GOTO is being prepared" is visible (requirement 2.5)
  - Write unit test: `MinimalCapture` renders correct heading/subtext for each `isGoto` value on success screen
  - Write property-based test: for all `captureState` where `isGoto = false` and `onSuccess = true`, `MinimalCapture` always auto-navigates to `/home` (Property 4 from design)
  - Write property-based test: for all `captureState` where `isGoto = true` and `onSuccess = true`, `MinimalCapture` never auto-navigates; success heading always visible (Property 3 from design)
  - Verify all preservation tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix the 5 failing E2E tests (glob/predicate LIFO bypass, cookie timing, GOTO auto-navigation)

  - [x] 3.1 Fix A — Convert per-test predicate matchers to glob strings in `capture-flow.spec.ts`
    - In `Capture Flow` `beforeEach`: replace `(url) => url.pathname.includes('/api/schedule')` → `'**/api/schedule'`
    - In `Capture Flow` `beforeEach`: replace `(url) => url.pathname.includes('/api/family')` → `'**/api/family'`
    - In `Capture Flow` `beforeEach`: replace `(url) => url.pathname.endsWith('/api/recipes')` → `'**/api/recipes'`
    - In `Capture Flow` `beforeEach`: replace `(url) => url.pathname.includes('/api/settings/')` → `'**/api/settings/*'`
    - In `user can navigate to the search page` test: replace `(url) => url.pathname.includes('/api/recipes')` → `'**/api/recipes'`
    - In `Capture — initial state rendering` `beforeEach`: replace `(url) => url.pathname.includes('/api/settings/')` → `'**/api/settings/*'`
    - In `Capture — describe link interaction` `beforeEach`: replace `(url) => url.pathname.includes('/api/settings/')` → `'**/api/settings/*'`
    - In `Capture — describe form validation` `beforeEach`: replace `(url) => url.pathname.includes('/api/settings/')` → `'**/api/settings/*'`
    - In `Capture — describe form validation` test: replace `(url) => url.pathname.includes('/api/recipes/describe')` → `'**/api/recipes/describe'`
    - In `Capture — GOTO intent` `beforeEach`: replace `(url) => url.pathname.includes('/api/settings/')` → `'**/api/settings/*'`
    - In `Capture — GOTO intent` `beforeEach`: replace `(url) => url.pathname.includes('/api/recipes/describe')` → `'**/api/recipes/describe'`
    - In `Capture — GOTO intent` `beforeEach`: replace `(url) => url.pathname.endsWith('/api/recipes')` → `'**/api/recipes'`
    - In `Settings — GOTO pending state` test: replace `(url) => url.pathname.includes('/api/family')` → `'**/api/family'`
    - In `Settings — GOTO pending state` test: replace `(url) => url.pathname.includes('/api/settings/')` → `'**/api/settings/*'`
    - In `Settings — GOTO pending state` test: replace `(url) => url.pathname.includes('/api/recipes/') && url.pathname.endsWith('/status')` → `'**/api/recipes/*/status'`
    - In `navigating with url param` test: replace `(url) => url.pathname.includes('/api/recipes/capture-url')` → `'**/api/recipes/capture-url'` (waitForRequest predicate stays as-is — it is not a route handler)
    - _Bug_Condition: isBugConditionA(r) where r.setupMatcher is string (glob) AND r.testMatcher is function (predicate)_
    - _Expected_Behavior: resolvedHandler(r) = r.testMatcher (per-test handler wins via LIFO when both are globs)_
    - _Preservation: Per-test glob handlers registered after setupCommonRoutes continue to win via LIFO (3.4); default handlers unaffected for tests with no per-test override (3.3)_
    - _Requirements: 2.3, 2.4, 3.3, 3.4_

  - [x] 3.2 Fix A — Convert per-test predicate matchers to glob strings in `onboarding.spec.ts`
    - In `Onboarding` `beforeEach`: replace `(url) => url.pathname.includes('/api/family')` → `'**/api/family'`
    - In `Onboarding` `beforeEach`: replace `(url) => url.pathname.includes('/api/schedule')` → `'**/api/schedule'`
    - _Bug_Condition: isBugConditionA(r) where r.setupMatcher = '**/api/family' (glob) AND r.testMatcher = (url) => url.pathname.includes('/api/family') (predicate)_
    - _Expected_Behavior: stateful per-test family handler wins for all GET and POST /api/family requests_
    - _Preservation: Onboarding flow without identity continues to display family selector (3.1)_
    - _Requirements: 2.6, 3.1_

  - [x] 3.3 Fix B — Verify `addInitScript` identity seeding in all `beforeEach` blocks in `capture-flow.spec.ts`
    - Audit every `beforeEach` block that calls `page.context().addCookies([{ name: 'x-family-member-id', ... }])`
    - Confirm each such block also calls `page.addInitScript` to seed `family-storage` in localStorage with `selectedFamilyMemberId` before any `page.goto`
    - Add `addInitScript` where missing (the `Capture Flow` `beforeEach` already has it; verify all other describe blocks)
    - The script must set `localStorage.setItem('family-storage', JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 }))` before navigation
    - _Bug_Condition: isBugConditionB(t) where t.cookieInjectedAt = 'after-module-load' AND t.localStorageSeeded = false_
    - _Expected_Behavior: familyStore.selectedFamilyMemberId is non-null when IdentityValidator first evaluates; no redirect to /onboarding_
    - _Preservation: Tests navigating to /onboarding without identity continue to display family selector (3.1); tests navigating to /capture with valid identity continue to render capture controls (3.2)_
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [x] 3.4 Fix C — Remove auto-navigation `useEffect` for GOTO path in `MinimalCapture.tsx`
    - File: `pwa/src/components/capture/MinimalCapture.tsx`
    - Change the `useEffect` from:
      ```typescript
      useEffect(() => {
        if (onSuccess) {
          const dest = isGoto ? ROUTES.PROFILE_SETTINGS : ROUTES.HOME;
          router.push(dest as any);
        }
      }, [onSuccess, router, isGoto]);
      ```
      To:
      ```typescript
      useEffect(() => {
        if (onSuccess && !isGoto) {
          router.push(ROUTES.HOME as any);
        }
      }, [onSuccess, router, isGoto]);
      ```
    - The "Back to Settings" button already calls `router.push(ROUTES.PROFILE_SETTINGS)` on click — explicit navigation is preserved
    - _Bug_Condition: isBugConditionC(s) where s.onSuccess = true AND s.isGoto = true_
    - _Expected_Behavior: success screen stays visible (heading "Your GOTO is being prepared" present in DOM) until user clicks "Back to Settings"; no auto-navigation via useEffect_
    - _Preservation: MinimalCapture with isGoto = false continues to auto-navigate to /home when onSuccess = true (3.5); POST /api/settings/family_goto payload shape unchanged (3.6)_
    - _Requirements: 2.5, 3.5, 3.6_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Glob/Predicate LIFO Bypass + Cookie Timing + GOTO Auto-Navigation
    - **IMPORTANT**: Re-run the SAME 5 failing E2E tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - Run: `npx playwright test "Describe it creates a pending GOTO setting" "Photo capture with intent=goto sets GOTO pending" "authenticated user can navigate to the capture page from home" "user can navigate to the search page from the navigation bar" "adding a new family member saves it and redirects to /home" --reporter=list`
    - **EXPECTED OUTCOME**: All 5 tests PASS (confirms all three bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Default Route Handlers, Non-GOTO Auto-Navigation, Onboarding Flow
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 — do NOT write new tests
    - Run unit tests for `MinimalCapture`: `task test` (or equivalent vitest command for the PWA)
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
    - Confirm requirements 3.1–3.6 are all satisfied

- [ ] 4. Run the full E2E suite to confirm no regressions
  - Run: `npx playwright test --reporter=list` (or `task test:e2e` if available)
  - **EXPECTED OUTCOME**: All previously-passing tests continue to pass; the 5 originally-failing tests now pass
  - If any previously-passing test now fails, investigate before marking complete — do not suppress failures
  - Confirm `task agent:drift` passes (no schema drift introduced)
  - Confirm `task review` passes (formatting, linting, type-check)

- [ ] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass; ask the user if questions arise
  - Verify the 5 originally-failing tests now pass: `Describe it creates a pending GOTO setting`, `Photo capture with intent=goto sets GOTO pending`, `authenticated user can navigate to the capture page from home`, `user can navigate to the search page from the navigation bar`, `adding a new family member saves it and redirects to /home`
  - Verify no previously-passing tests have regressed
  - Confirm `task review` is green
