# Bugfix Requirements Document

## Introduction

Five regressions were introduced across commits `952d879`, `09aa638`, and `8013319` in the PWA's home-page "today" state management. All bugs stem from the same root structural problem: the home page and the planner share no unified "today" state. The home page derives today's recipe from SSR plus a client-side reconciliation fetch; the planner has its own independent schedule state. Any assignment made in the planner only reaches the home page via `router.refresh()` triggering a new SSR render — which is a race condition.

The five bugs are:

1. **"Confirm GOTO" does not persist** — the optimistic recipe state is cleared by the post-refresh `syncRecipe()` cycle when the backend hasn't committed the assignment yet.
2. **Planner assignment does not reflect on home** — `isScheduleRecipe()` passes objects with `id: null`, which then fail the `TonightMenuCard` render guard, producing a blank card.
3. **"Order In" from the Pivot Card does nothing persistently** — the backend write is skipped when `currentRecipe === null`, so the pivot card reappears on reload.
4. **"Order In" from the Pivot Card bypasses `SkipRecoveryDialog`** — the pizza confirmation flow is skipped entirely when "Order In" is tapped from `TonightPivotCard`.
5. **"Order In" state does not survive page reload** — `isSkipped` and `sessionDone` are React state only; no persistence means the pivot card reappears after reload.

No API contract changes are required. All fixes are confined to the PWA.

**Shared bug condition C(X):** The home page's "today" state is derived from two independent, unsynchronised sources — SSR props and client-side React state — with no durable persistence layer bridging them. Any operation that writes to the backend (planner assignment, order-in, skip) can race against the SSR re-render cycle or be lost entirely on reload.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — "Confirm GOTO" does not persist today's recipe**

1.1 WHEN the user taps "Confirm GOTO" on `TonightPivotCard` AND `router.refresh()` fires before the backend has committed the assignment THEN the system clears `currentRecipe` back to `null` because `syncRecipe()` runs with `pendingConfirmRef.current === false` after the refresh cycle completes, causing `TonightMenuCard` to disappear and the pivot card to reappear.

1.2 WHEN `syncRecipe()` receives a schedule response that does not yet contain today's recipe (backend write still in-flight) AND `pendingConfirmRef.current` has already been reset to `false` by the `.finally()` handler THEN the system treats the missing recipe as authoritative and calls `setCurrentRecipe(null)`, overriding the optimistic assignment.

**Bug 2 — Planner assignment does not reflect on home page**

2.1 WHEN a recipe is assigned in the planner for today AND the user navigates to `/home` AND the schedule response contains a recipe object with `id: null` THEN the system passes the `isScheduleRecipe()` check (because `'id' in { id: null }` is `true`), unwraps the object, sets it as `currentRecipe`, and then renders a blank card because the `TonightMenuCard` guard (`currentRecipe.id && currentRecipe.name`) blocks rendering.

2.2 WHEN `isScheduleRecipe()` evaluates a recipe object where `id` is present as a key but its value is `null` THEN the system incorrectly returns `true`, treating a structurally invalid recipe as a valid schedule recipe.

**Bug 3 — "Order In" from Pivot Card does nothing (no backend write)**

3.1 WHEN the user taps "Order In" from `TonightPivotCard` AND `currentRecipe === null` (no recipe planned) THEN the system skips the `POST /api/schedule/day/{date}/validate` call entirely because the call is wrapped in `if (currentRecipe)`, so no backend state is written for today.

3.2 WHEN the user taps "Order In" from `TonightPivotCard` with no recipe planned AND then reloads the page THEN the system shows the pivot card again because no `status: 3` was written to the backend and the SSR fetch returns no "done" state for today.

**Bug 4 — "Order In" from Pivot Card bypasses `SkipRecoveryDialog`**

4.1 WHEN the user taps "Order In" from `TonightPivotCard` AND `currentRecipe !== null` (a recipe is planned) THEN the system calls `handleRecoveryAction('order_in')` directly, bypassing `SkipRecoveryDialog` entirely, so the user never sees the two-step pizza flow and cannot decide what to do with the planned meal.

4.2 WHEN the user taps "Order In" from `TonightPivotCard` AND `currentRecipe === null` (no recipe planned) THEN the system calls `handleRecoveryAction('order_in')` directly with no confirmation step, providing no UX feedback before the state change.

**Bug 5 — "Order In" state does not survive page reload**

5.1 WHEN the user completes "Order In" from the pivot card AND reloads the page THEN the system shows the pivot card again because `isSkipped` and `sessionDone` are React state that resets on mount, and `HomeCommandCenter` has no mechanism to initialise these flags from the SSR-provided `isDone` signal.

5.2 WHEN `home/page.tsx` detects `status === 3` for today (already skipped/ordered-in) AND sets `todaysRecipe = null` THEN the system passes `null` to `HomeCommandCenter` with no additional signal, causing `HomeCommandCenter` to initialise `isSkipped: false` and `sessionDone: false` and show the pivot card instead of a "done" state.

---

### Expected Behavior (Correct)

**Bug 1 — "Confirm GOTO" must persist through the refresh cycle**

2.1 WHEN the user taps "Confirm GOTO" AND `setCurrentRecipe(optimisticRecipe)` is called with a valid recipe THEN the system SHALL keep `currentRecipe` set to that recipe for the remainder of the session, even if `syncRecipe()` runs after `router.refresh()` and the schedule response does not yet contain today's recipe.

2.2 WHEN `syncRecipe()` runs after a "Confirm GOTO" action AND the schedule response returns no recipe for today (backend write still in-flight) THEN the system SHALL NOT clear `currentRecipe` — a missing recipe in the schedule response SHALL NOT override an optimistic assignment unless the backend explicitly returns `status: 3` (skipped) or `status: 2` (cooked) for today.

**Bug 2 — Planner assignment must render correctly on home**

2.3 WHEN `isScheduleRecipe()` evaluates a recipe object THEN the system SHALL return `true` only when `recipe.id` is a non-null, non-empty string — the check SHALL be `typeof recipe.id === 'string' && recipe.id.length > 0`, not `recipe.id != null || 'id' in recipe`.

2.4 WHEN a recipe is assigned in the planner for today AND the user navigates to `/home` AND the schedule response contains a recipe with a valid non-null `id` THEN the system SHALL render `TonightMenuCard` with the assigned recipe.

**Bug 3 — "Order In" from Pivot Card must write to the backend**

2.5 WHEN the user taps "Order In" from `TonightPivotCard` AND `currentRecipe === null` THEN the system SHALL call `POST /api/schedule/day/{date}/validate` with `status: 3` to mark today as "ordered in", regardless of whether a recipe is planned.

2.6 WHEN the backend write for "Order In" succeeds THEN the system SHALL set `isSkipped: true` and `sessionDone: true` so the pivot card does not reappear for the rest of the session.

**Bug 4 — "Order In" from Pivot Card must respect the dialog flow**

2.7 WHEN the user taps "Order In" from `TonightPivotCard` AND `currentRecipe !== null` THEN the system SHALL open `SkipRecoveryDialog` so the user can decide what to do with the planned meal before the "ordered in" state is committed.

2.8 WHEN the user taps "Order In" from `TonightPivotCard` AND `currentRecipe === null` THEN the system SHALL show a lightweight confirmation step (or proceed directly to the backend write with a visible success state) before committing the "ordered in" state — the action SHALL NOT be silent.

**Bug 5 — "Order In" state must survive page reload**

2.9 WHEN `home/page.tsx` detects `status === 3` or `status === 2` for today THEN the system SHALL pass a `todayStatus` prop (or equivalent signal) to `HomeCommandCenter` so it can initialise `isSkipped` and `sessionDone` from SSR data.

2.10 WHEN `HomeCommandCenter` receives `todayStatus === 3` (skipped/ordered-in) on mount THEN the system SHALL initialise `isSkipped: true` and `sessionDone: true`, showing a "Ordered In" completion state instead of the pivot card.

2.11 WHEN `HomeCommandCenter` receives `todayStatus === 2` (cooked) on mount THEN the system SHALL initialise `isCooked: true` and `sessionDone: true`, showing `CookedSuccessCard` instead of the pivot card.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user taps "Cook Tonight" (formerly "Confirm GOTO") AND the backend write succeeds AND `syncRecipe()` subsequently returns a valid recipe for today THEN the system SHALL CONTINUE TO update `currentRecipe` with the confirmed server-side recipe data.

3.2 WHEN the user opens Cook's Mode from `TonightMenuCard` AND completes all steps THEN the system SHALL CONTINUE TO call `POST /api/schedule/day/{date}/validate` with `status: 2` and show `CookedSuccessCard`.

3.3 WHEN the user taps "Skip" on `TonightMenuCard` THEN the system SHALL CONTINUE TO open `SkipRecoveryDialog` via `handleSkipTrigger`, with the full two-step pizza flow intact.

3.4 WHEN the user selects a recipe via Quick Find (`QuickFindModal`) THEN the system SHALL CONTINUE TO set `currentRecipe` optimistically and call `assignRecipeToDay`, showing `TonightMenuCard` immediately.

3.5 WHEN `isScheduleRecipe()` evaluates a recipe object with a valid non-null, non-empty string `id` THEN the system SHALL CONTINUE TO return `true` and the recipe SHALL be unwrapped and set as `currentRecipe`.

3.6 WHEN `isScheduleRecipe()` evaluates `null`, `undefined`, or an object with no `id` key THEN the system SHALL CONTINUE TO return `false`.

3.7 WHEN the user taps "Order In" from `SkipRecoveryDialog` step 1 (reached via `TonightMenuCard`'s skip button) THEN the system SHALL CONTINUE TO advance to step 2 of the dialog and allow the user to decide what to do with the planned meal.

3.8 WHEN `home/page.tsx` finds no entry for today in the schedule THEN the system SHALL CONTINUE TO pass `todaysRecipe = null` to `HomeCommandCenter`, which SHALL CONTINUE TO show the pivot card (with `todayStatus` absent or `undefined`).

3.9 WHEN `TonightPivotCard` renders with a ready GOTO recipe THEN the system SHALL CONTINUE TO show the "Cook Tonight" (renamed from "Confirm GOTO") button enabled and tappable.

3.10 WHEN `TonightPivotCard` renders with a pending GOTO recipe THEN the system SHALL CONTINUE TO show the "Cook Tonight" button disabled with a pending indicator.

3.11 WHEN the user taps "Quick Find" from `TonightPivotCard` THEN the system SHALL CONTINUE TO open `QuickFindModal`.

---

## Bug Condition Pseudocode

### Shared bug condition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type HomePageState
  OUTPUT: boolean

  // True when the home page's "today" state can diverge from backend truth
  RETURN (
    X.optimisticRecipe != null AND X.backendWriteInFlight = true  // Bug 1
    OR X.scheduleRecipeId = null AND isScheduleRecipeReturnsTrue(X.recipe)  // Bug 2
    OR X.currentRecipe = null AND X.orderInAction = true  // Bug 3
    OR X.orderInFromPivot = true AND X.skipDialogShown = false  // Bug 4
    OR X.todayStatus IN {2, 3} AND X.todayStatusPropMissing = true  // Bug 5
  )
END FUNCTION
```

### Fix checking property

```pascal
// Property: Fix Checking — all five bug conditions
FOR ALL X WHERE isBugCondition(X) DO
  result ← HomeCommandCenter'(X)
  ASSERT (
    // Bug 1: optimistic recipe survives refresh cycle
    (X.optimisticRecipe != null AND X.backendWriteInFlight = true
      IMPLIES result.currentRecipe = X.optimisticRecipe)
    AND
    // Bug 2: null-id recipe does not pass isScheduleRecipe
    (X.scheduleRecipeId = null
      IMPLIES isScheduleRecipe'(X.recipe) = false)
    AND
    // Bug 3: order-in always writes to backend
    (X.currentRecipe = null AND X.orderInAction = true
      IMPLIES result.backendWriteCalled = true AND result.status = 3)
    AND
    // Bug 4: order-in from pivot opens dialog when recipe exists
    (X.orderInFromPivot = true AND X.currentRecipe != null
      IMPLIES result.skipDialogShown = true)
    AND
    // Bug 5: SSR todayStatus initialises session state
    (X.todayStatus IN {2, 3}
      IMPLIES result.sessionDone = true)
  )
END FOR
```

### Preservation property

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT HomeCommandCenter(X) = HomeCommandCenter'(X)
  // Specifically:
  // - Cook's Mode flow unchanged
  // - Quick Find optimistic assignment unchanged
  // - SkipRecoveryDialog from TonightMenuCard unchanged
  // - isScheduleRecipe returns true for valid non-null id recipes unchanged
  // - CookedSuccessCard shown when status === 2 unchanged
END FOR
```

---

## PWA Snappiness Constraint

This is a PWA. Every `router.refresh()` call in the critical path is a full SSR round-trip — the server re-fetches the schedule, re-renders the page, and sends new HTML to the client. On a mobile connection that is 300–800 ms of perceived lag after every user action. The Mère-Designer's Toddler Rule applies: if the UI freezes for half a second after a tap, it is not finished.

**Constraint:** `router.refresh()` SHALL NOT block any user-visible state transition. All state changes that affect what the user sees (recipe card appearing, pivot card disappearing, success states) MUST happen via optimistic React state updates before any network call completes. `router.refresh()` is permitted only as a background cache-consistency step — it must never be awaited or placed in the critical render path.

This means:
- `setCurrentRecipe(optimisticRecipe)` fires before `assignRecipeToDay` is called — already done for Quick Find and Confirm GOTO.
- `setIsSkipped(true)` / `setSessionDone(true)` fire before `validate.post` resolves — already done for Order In.
- `router.refresh()` is called after the backend write resolves, silently, with no UI dependency on its completion.
- `syncRecipe()` (the client-side reconciliation fetch) MUST NOT override a valid optimistic state — it is a background consistency check, not an authoritative source during an active session.

---

## Flow Diagram Reference

The flow diagram at `docs/flows/user-flows/order-in-flow.md` documents the Order In paths and SSR persistence. It was created alongside this spec.

**Post-fix review required:** After all five bugs are fixed, the following flow docs must be reviewed and updated to reflect the corrected implementation:

1. `docs/flows/user-flows/no-menu-goto-home-state.md` — stale sections identified:
   - "Current Model" section describes the Phase 13 stale-cache design; should be archived or clearly marked as historical.
   - E2E coverage table references `home-recovery.spec.ts` (deleted in `952d879`) and `home-race.spec.ts` — must be updated to `home-goto.spec.ts` and `home-recipe.spec.ts`.
   - State decision table claims "Confirm GOTO" button is "always rendered" — incorrect; it only renders when `gotoReady === true`.
   - No mention of `pendingConfirmRef` race condition or `router.refresh()` race.

2. `docs/flows/user-flows/recipe-selection-to-home.md` — stale sections identified:
   - "Race path" section describes the pre-fix grey card flash as a current risk — it was resolved; should be marked as historical.
   - "GOTO Confirm Path" shows `image: ''` in the optimistic recipe — current code uses `gotoRecipeData?.imageUrl ?? gotoImageUrl`.
   - `router.refresh()` is shown as the final step that re-hydrates `currentRecipe` — this is the broken assumption behind Bug 1; the doc presents it as working correctly.
   - No mention of `pendingConfirmRef` or the post-refresh `syncRecipe()` race.

The review step is the final task in the implementation plan for this spec.
