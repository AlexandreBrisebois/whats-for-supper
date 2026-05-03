# Implementation Plan: home-command-center-hardening

## Overview

Four groups of work, executed in dependency order. Groups A and B are independent visual and state-sync fixes that can ship without the store. Group C introduces `todayStore` and refactors `HomeCommandCenter` to consume it, eliminating the race conditions at their root. Group D updates documentation to reflect the corrected implementation.

Each task is independently shippable and has a clear seam. Tasks within a group build on each other; groups A and B can be executed in parallel.

---

## Tasks

### Group A — Visual Fixes (TonightPivotCard)

- [x] A1. Fix empty-state header and badge in `TonightPivotCard`
  - In `pwa/src/components/home/TonightPivotCard.tsx`, make the `<h2>` conditional: render `"What's for Supper?"` when `gotoRecipeId` is null/falsy, `"Tonight's Menu"` otherwise
  - Hide the prep-time badge entirely when `gotoRecipeId` is null/falsy; show it only when a GOTO is configured
  - _Requirements: A1.1, A1.2, A1.3_
  - **Done when:** header and badge render correctly for both empty and GOTO states; no TypeScript errors

- [x] A2. Fix empty-state image area and move CTA to footer
  - Remove the `<a>` tag and gradient overlay from the image area when `gotoRecipeId` is null/falsy; show only the centered `<Utensils>` icon
  - Add a full-width ochre pill button (`h-12 rounded-[1.5rem]`, white text, ochre background) in the footer actions section linking to `/profile/settings` with label `"Add your family's GOTO recipe"`
  - Preserve the gradient overlay and GOTO image/placeholder when `gotoRecipeId` is set
  - _Requirements: A2.1, A2.2, A2.3_
  - **Done when:** CTA is a tappable footer button in empty state; image area is clean with no buried link; GOTO state is unchanged

- [ ] A3. Rename "Confirm GOTO" → "Make This Tonight" and fix button hierarchy
  - Rename the primary action button label from `"Confirm GOTO"` to `"Make This Tonight"` (UI label only; prop name `onConfirmGoto` stays)
  - When `gotoStatus === "ready"`, render `"Make This Tonight"` as the dominant ochre button
  - When `gotoStatus === "ready"`, render `"Quick Find"` and `"Order In"` as ghost/outline buttons (`border border-indigo/30 bg-transparent` and `border border-charcoal/20 bg-transparent` respectively), visually subordinate
  - _Requirements: A3.1, A3.2, A3.3_
  - **Done when:** button label is updated everywhere it was "Confirm GOTO"; hierarchy is correct in GOTO-ready state

- [ ] A4. Write property-based tests for `TonightPivotCard` (Properties 1–3)
  - Create `pwa/src/components/home/TonightPivotCard.property.test.tsx` using fast-check
  - **Property 1: Empty-state header and badge are mutually exclusive with GOTO state** — `fc.string({ minLength: 1 })` for non-null `gotoRecipeId`; `fc.constantFrom(null, undefined)` for empty state — **Validates: Requirements A1.1, A1.2, A1.3**
  - **Property 2: Empty-state CTA is a tappable footer button; GOTO state has gradient overlay** — same generators — **Validates: Requirements A2.1, A2.2, A2.3**
  - **Property 3: GOTO-ready button label and hierarchy** — `fc.constantFrom('ready', 'pending', null)` for `gotoStatus` — **Validates: Requirements A3.1, A3.2, A3.3**
  - Tag each test: `// Feature: home-command-center-hardening, Property {N}: {property_text}`
  - Minimum 100 iterations per property
  - _Requirements: A1, A2, A3_

- [x] A5. Typecheck and E2E regression for Group A
  - Run `task review` — zero TypeScript errors, zero lint errors
  - Update `pwa/e2e/home-goto.spec.ts` to cover: empty state header/badge, ochre CTA in footer, "Make This Tonight" label, ghost secondary buttons in GOTO-ready state
  - Run `task agent:test:impact` — all affected tests pass
  - _Requirements: A1, A2, A3_
  - **Done when:** `task review` and `task agent:test:impact` both pass clean

---

### Group B — State-Sync Fixes

- [x] B1. Fix `isScheduleRecipe()` null-id guard in `pwa/src/lib/api/planner.ts`
  - Change the id guard from `recipe.id != null || 'id' in recipe` to `typeof recipe.id === 'string' && recipe.id.length > 0`
  - Apply the same fix to the `recipe.data` branch
  - _Requirements: B1.1, B1.2, B1.3_
  - **Done when:** `isScheduleRecipe({ id: null })` returns `false`; `isScheduleRecipe({ id: 'abc-123' })` returns `true`; no TypeScript errors

- [ ] B2. Write property-based tests for `isScheduleRecipe()` (Property 4)
  - Create `pwa/src/lib/api/planner.property.test.ts` using fast-check
  - **Property 4: `isScheduleRecipe` rejects null/empty ids and accepts non-empty string ids** — generators: `fc.string({ minLength: 1 })` for valid ids; `fc.constantFrom(null, undefined, '')` for invalid ids; `fc.record({ id: fc.string({ minLength: 1 }) })` for direct shape; `fc.record({ data: fc.record({ id: fc.string({ minLength: 1 }) }) })` for wrapped shape — **Validates: Requirements B1.1, B1.2, B1.3**
  - Tag: `// Feature: home-command-center-hardening, Property 4: isScheduleRecipe rejects null/empty ids and accepts non-empty string ids`
  - Minimum 100 iterations
  - _Requirements: B1_

- [x] B3. Add `todayStatus` prop to `home/page.tsx`
  - In `pwa/src/app/(app)/home/page.tsx`, derive `todayStatus: 0 | 2 | 3` from the SSR schedule fetch: `todaysEntry?.status === 2 ? 2 : todaysEntry?.status === 3 ? 3 : 0`
  - Pass `todayStatus={todayStatus}` to `<HomeCommandCenter>`
  - _Requirements: B5.1_
  - **Done when:** `todayStatus` is derived and passed; no TypeScript errors in `page.tsx`

- [x] B4. Fix `HomeCommandCenter` to initialise from `todayStatus` prop
  - Add `todayStatus?: 0 | 2 | 3` to `HomeCommandCenterProps`
  - On mount, use `todayStatus` to seed `isCooked` (`status === 2`) and `isSkipped` / `sessionDone` (`status === 3`), replacing the current default-false initialisation
  - _Requirements: B5.2, B5.3, B5.4_
  - **Done when:** mounting with `todayStatus=2` shows `CookedSuccessCard`; mounting with `todayStatus=3` shows ordered-in state; mounting with `todayStatus=0` shows normal pivot/menu card

- [x] B5. Fix "Order In" from pivot with no recipe — always write `status: 3`
  - In `HomeCommandCenter`, when `onOrderIn` is called from `TonightPivotCard` and `currentRecipe` is `null`, call `POST /api/schedule/day/{date}/validate` with `status: 3` unconditionally
  - Set `isSkipped: true` and `sessionDone: true` after the write so the pivot card does not reappear
  - _Requirements: B3.1, B3.2, B4.2_
  - **Done when:** tapping "Order In" with no recipe fires the backend write and hides the pivot card for the session

- [x] B6. Fix "Order In" from pivot with recipe — open `SkipRecoveryDialog` first
  - In `HomeCommandCenter`, when `onOrderIn` is called from `TonightPivotCard` and `currentRecipe` is not `null`, open `SkipRecoveryDialog` before committing any state change
  - _Requirements: B4.1_
  - **Done when:** tapping "Order In" with a recipe set opens the recovery dialog; no state change occurs before dialog confirmation

- [x] B7. Typecheck and regression tests for Group B
  - Run `task review` — zero TypeScript errors, zero lint errors
  - Update `pwa/e2e/home-recipe.spec.ts` to cover: "Order In" with no recipe writes to backend and hides pivot; "Order In" with recipe opens `SkipRecoveryDialog`; page reload after "Order In" does not show pivot card
  - Run `task agent:test:impact` — all affected tests pass
  - Run `task agent:drift` — zero schema drift
  - _Requirements: B1–B6_
  - **Done when:** `task review`, `task agent:test:impact`, and `task agent:drift` all pass clean

- [x] B8. Checkpoint — Groups A and B complete
  - Ensure all tests pass, ask the user if questions arise.
  - `task agent:drift` — zero drift
  - `task review` — clean

---

### Group C — todayStore

- [x] C1. Create `pwa/src/store/todayStore.ts` with full state shape and all actions
  - Create the file with the `TodayState` interface: `currentRecipe`, `status`, `isLoading`, `lastSyncedAt`, `optimisticWriteAt`
  - Implement all five actions: `init`, `assignRecipe`, `markCooked`, `markOrderedIn`, `sync`
  - `init(recipe, status)` — sets `currentRecipe`, `status`, clears `optimisticWriteAt`; idempotent
  - `assignRecipe(recipe)` — sets `currentRecipe` and `optimisticWriteAt = Date.now()` synchronously, then fires `POST /api/schedule/assign` in the background; does NOT call `router.refresh()`
  - `markCooked()` — sets `status = 2` synchronously, then fires `POST /api/schedule/day/{date}/validate` with `{ status: 2 }` in the background
  - `markOrderedIn()` — sets `status = 3` synchronously, then fires `POST /api/schedule/day/{date}/validate` with `{ status: 3 }` in the background
  - `sync()` — calls `GET /api/schedule?weekOffset=0`, finds today's entry, reconciles with optimistic write protection (10-second window); sets `lastSyncedAt` on success
  - _Requirements: C1.1, C1.2, C2.1, C2.2, C3.1, C3.2, C3.3, C4.1, C4.2, C5.1, C5.2, C6.1, C6.2, C6.3, C6.4_
  - **Done when:** store is importable, all actions exist and are callable, TypeScript compiles clean

- [ ] C2. Write property-based tests for `todayStore` (Properties 5–9)
  - Create `pwa/src/store/todayStore.property.test.ts` using fast-check
  - **Property 5: Optimistic recipe survives sync with empty schedule** — generators: `fc.record({ id: fc.uuidV4(), name: fc.string(), image: fc.string() })` for valid recipe; `fc.integer({ min: 0, max: 9_999 })` for elapsed ms — **Validates: Requirements B2.1, B2.2, B2.3, C6.4**
  - **Property 6: `sync()` updates `currentRecipe` when no optimistic write is in-flight** — `optimisticWriteAt = null` — **Validates: Requirements C6.1, C6.2**
  - **Property 7: `sync()` updates `currentRecipe` when optimistic write is older than 10 seconds** — `fc.integer({ min: 10_000, max: 60_000 })` for elapsed ms — **Validates: Requirements C6.3**
  - **Property 8: `assignRecipe` sets `currentRecipe` and `optimisticWriteAt` before network call** — **Validates: Requirements C3.1, B6.2**
  - **Property 9: `markCooked` and `markOrderedIn` set status optimistically** — **Validates: Requirements C4.1, C5.1, B3.2**
  - Tag each test: `// Feature: home-command-center-hardening, Property {N}: {property_text}`
  - Minimum 100 iterations per property
  - _Requirements: C3, C4, C5, C6_

- [x] C3. Refactor `HomeCommandCenter` to consume `todayStore`
  - Remove `useState` for: `currentRecipe`, `isCooked`, `isSkipped`, `sessionDone`, `isLoading`
  - Read `currentRecipe`, `status`, `isLoading` from `useTodayStore()`
  - Derive `isCooked = status === 2`, `isSkipped = status === 3`, `sessionDone = status === 2 || status === 3`
  - Retain `useState` only for UI-only state: `showCooksMode`, `showRecovery`, `showQuickFind`
  - Replace mount `useEffect` with: `todayStore.init(todaysRecipe, todayStatus ?? 0)`, `loadSetting('family_goto')`, `todayStore.sync()` (background, non-blocking)
  - Update action handlers: `onConfirmGoto` → `todayStore.assignRecipe()`; `handleCookedMark` → `todayStore.markCooked()`; `onOrderIn` (no recipe) → `todayStore.markOrderedIn()`; `onOrderIn` (with recipe) → open `SkipRecoveryDialog`; `handleQuickFindSelect` → `todayStore.assignRecipe()`; `handleRecoveryAction('order_in')` → `todayStore.markOrderedIn()`
  - Remove all `router.refresh()` calls from action handlers
  - Remove `pendingConfirmRef` (replaced by `optimisticWriteAt` in the store)
  - _Requirements: C7.1, C7.2, C7.3, C7.4, B6.1, B6.2_
  - **Done when:** `HomeCommandCenter` has no local state for today's recipe/status; no `router.refresh()` in any action handler; TypeScript compiles clean

- [ ] C4. Write property-based tests for `HomeCommandCenter` (Properties 10–11)
  - Create `pwa/src/components/home/HomeCommandCenter.property.test.tsx` using fast-check
  - **Property 10: `todayStatus` prop correctly initialises session state** — `fc.constantFrom(0, 2, 3)` for `todayStatus` — **Validates: Requirements B5.2, B5.3, B5.4**
  - **Property 11: Planner assignment propagates to `HomeCommandCenter` via `todayStore`** — **Validates: Requirements C8.1, C8.2**
  - Tag each test: `// Feature: home-command-center-hardening, Property {N}: {property_text}`
  - Minimum 100 iterations per property
  - _Requirements: B5, C8_

- [x] C5. Integrate planner page: call `todayStore.assignRecipe()` for today's slot
  - In `pwa/src/app/(app)/planner/page.tsx`, inside `handleQuickFindSelect`, after the optimistic local state update, check if the assigned slot is today's date
  - If it is today, call `useTodayStore.getState().assignRecipe({ id, name, image })` to propagate the assignment to `HomeCommandCenter` without navigation
  - _Requirements: C8.1, C8.2_
  - **Done when:** assigning today's recipe in the planner updates `HomeCommandCenter` via Zustand subscription; no `router.refresh()` required

- [ ] C6. Write property-based tests for `TonightPivotCard` integration (Properties 1–3, re-run against refactored component)
  - Verify `TonightPivotCard.property.test.tsx` (created in A4) still passes against the refactored component
  - No new file needed — re-run confirms no regression from the `HomeCommandCenter` refactor
  - _Requirements: A1, A2, A3_

- [x] C7. Typecheck and full E2E regression for Group C
  - Run `task review` — zero TypeScript errors, zero lint errors
  - Update `pwa/e2e/home-goto.spec.ts`: "Make This Tonight" tap shows `TonightMenuCard` immediately (no network wait); page reload after "Make This Tonight" still shows `TonightMenuCard`
  - Update `pwa/e2e/home-recipe.spec.ts`: planner assignment for today reflects on home page without navigation; page reload after "Order In" does not show pivot card
  - Run `task agent:test:impact` — all affected tests pass
  - Run `task agent:drift` — zero schema drift
  - _Requirements: C1–C8, B2–B6_
  - **Done when:** `task review`, `task agent:test:impact`, and `task agent:drift` all pass clean

- [x] C8. Checkpoint — Group C complete
  - Ensure all tests pass, ask the user if questions arise.
  - `task agent:drift` — zero drift
  - `task review` — clean

---

### Group D — Documentation

- [x] D1. Update `docs/flows/user-flows/no-menu-goto-home-state.md`
  - Remove or archive stale sections: Phase 13 "Current Model", incorrect E2E table references, incorrect "Confirm GOTO always rendered" claim
  - Update to reflect the corrected implementation: `todayStore` as the state owner, "Make This Tonight" as the button label, ochre CTA in footer for empty state
  - Fix any E2E table entries that reference the old broken behaviour
  - _Requirements: D2.1_
  - **Done when:** doc accurately describes the post-fix flow; no references to the old broken behaviour remain

- [x] D2. Update `docs/flows/user-flows/recipe-selection-to-home.md`
  - Remove or archive stale sections: "Race path" as a current risk, `router.refresh()` as the re-hydration mechanism
  - Update to reflect the corrected implementation: optimistic writes via `todayStore`, background sync with 10-second protection window
  - _Requirements: D2.2_
  - **Done when:** doc accurately describes the post-fix flow; no references to `router.refresh()` as the primary sync mechanism remain

- [x] D3. Final review — `task review`
  - Run `task review` — formatting, linting, typecheck, full suite clean
  - Run `task agent:drift` — zero drift confirmed across all changes
  - Run `task agent:test:impact` — all tests pass
  - _Requirements: All_
  - **Done when:** `task review`, `task agent:drift`, and `task agent:test:impact` all pass clean with no errors or warnings

---

### Group E — Cooked State UX Refinement

- [ ] E1. Fix `CookedSuccessCard` dismiss behaviour
  - Currently `onDismiss` calls `setIsCooked(false)` which drops back to the pivot card — wrong
  - Change dismiss to collapse `CookedSuccessCard` into a compact "cooked" badge/strip on the home page that remains visible for the rest of the day
  - The compact state must still allow re-entering Cook's Mode (tap the badge → opens `CooksMode` overlay) so the user can recover from an accidental "Done" tap
  - `todayStore.status === 2` remains true after dismiss — only the card's visual state collapses, not the domain state
  - **Done when:** dismissing the success card shows a compact cooked indicator; Cook's Mode is still accessible from it; `todayStore.status` stays `2`

- [ ] E2. Restrict Cook Mode button in planner to today's slot only
  - In `PlannerDayCard` (`pwa/src/app/(app)/planner/page.tsx`), the 👨‍🍳 button currently shows for every day in `currentWeekOffset === 0`
  - Change the condition to only show the button when `day.date === getTodayString()` (today's slot only)
  - All other days in the current week and all future weeks: no Cook Mode button
  - **Done when:** Cook Mode button only appears on today's card; all other day cards are unaffected; `task review` clean

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; core implementation tasks are never optional
- Each task references specific requirements for traceability
- Groups A and B are independent and can be executed in parallel; Group C depends on B3 (the `todayStatus` prop) being in place
- Group D must be executed after Groups A, B, and C are complete
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) with a minimum of 100 iterations per property
- The `onConfirmGoto` prop name is preserved across callers; only the UI label changes to "Make This Tonight"
- `router.refresh()` must not appear in any action handler after Group C is complete — this is enforced by `task review` (TypeScript) and the E2E tests (behavioural)
