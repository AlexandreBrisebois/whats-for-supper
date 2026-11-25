# Design

## Context and Existing Ownership

The proposal covers motivation and scope. Observed in
`pwa/src/app/(app)/planner/page.tsx`:

**Overlay surfaces and their current state owners**

| Surface (component) | Current state | Opened from | Leads to |
| --- | --- | --- | --- |
| Planning pivot (`PlanningPivotSheet`) | `showPivot`, `selectedDayIndex` | day card `onPivot`; `planDate` deep link (status 3 days, 0 ms timer) | Quick Find, non-cooking, cooked-defer, close |
| Quick Find (`QuickFindModal`) | `showQuickFind`, `selectedDayIndex`, `pendingQuickFindDayIndex` | pivot `onQuickFind` (240 ms timer) | replace-recovery (occupied day), close |
| Non-cooking day (`NonCookingDaySheet`) | `nonCookingTarget` (+ `activeNonCookingDate` ref) | pivot `onNoCooking` | Back → pivot for `fromPivotDayIndex`; close on save/clear |
| Cooked defer (`CookedDeferConfirmSheet`) | `pendingCookedDefer`, `cookedDeferSubmitting` | `handlePlanLater` for status 2 | close after `executePlanLater` |
| Family nudge (`FamilyNudgeDialog`) | `showNudgeDialog` | `handleNudgeFamily` | close |
| Recipe detail (`RecipeDetailSheet`) | `openDetailRecipeId`, `detailSource` | day card `onViewRecipe`; `detailRecipe` deep link; recovery dismissed unsaved | close; navigate to planned day |
| Replace recovery (`SkipRecoveryDialog` via `useReplacementRecovery`) | `pendingRecovery` | `handleQuickFindSelect` on an occupied day | detail (unsaved close) or close |

Facts that matter:

- Each surface is modal with its own backdrop. Every opening above comes from the
  previous surface or from the base page, so at most one is meant to be open.
  Nothing currently enforces that.
- `PlanningPivotSheet` returns `null` when `isOpen` is false and is not wrapped
  in `AnimatePresence`. The `exit` motion in `PivotSheetShell` therefore never
  plays for the pivot, and the 240 ms delay (added in `0a12aaf1`) covers no
  animation.
- `PivotSheetShell` captures the previously focused element on mount and
  restores it on unmount (`restoreFocusSelector` fallback).
- Business rules live in the stores (`useWeekStore`, `useTodayStore`) and in
  `pwa/src/lib/api/planner`. This change touches none of them.
- `meal-assignment` owns the preserved behaviors (see proposal → Capabilities).

**Planning-confirmation cluster** (moves as a unit): `planningConfirmation`,
`confirmationRetry`, `successDay`/`successSeq`/`fadedSeq` with the fade and clear
timers, the render-time `previousConfirmationContext` reset, `clearSuccessUrl`,
the routine auto-dismiss effect (5 s) and the planning-result read effect.
Its inputs are `searchParams`, `currentWeekOffset`, `referenceWeekStartDate` and
`router`. Its outputs are `visibleConfirmation`, the success-ring props,
`pendingResult` and the retry/dismiss actions used by the banner (testids
`planner-planning-confirmation`, `planner-confirmation-refresh`,
`planner-confirmation-dismiss`).

## Decisions and Tradeoffs

**D1. One discriminated-union overlay value, managed by a pure reducer.**

```ts
type PlannerOverlay =
  | { kind: 'none' }
  | { kind: 'pivot'; dayIndex: number }
  | { kind: 'quickFind'; dayIndex: number }
  | { kind: 'nonCooking'; target: NonCookingTarget }   // includes fromPivotDayIndex
  | { kind: 'cookedDefer'; slot: PlannerSlot; submitting: boolean }
  | { kind: 'nudge' }
  | { kind: 'detail'; recipeId: string; source: DetailSource | null }
  | { kind: 'replaceRecovery'; slot: RecoverySlot; recipe: AssignmentRecipe };
```

`plannerOverlayReducer(state, action)` is a pure function in
`pwa/src/lib/planner/plannerOverlay.ts`. `usePlannerOverlay()` wraps it with
`useReducer` and returns `overlay` plus named actions (`openPivot`,
`openQuickFind`, `openNonCooking`, `backToPivot`, `openCookedDefer`,
`setCookedDeferSubmitting`, `openNudge`, `openDetail`, `openReplaceRecovery`,
`close`, `closeIfCurrent`).

- *Opening replaces.* Any `open*` action replaces whatever is open. This matches
  today's sequential flows and makes the invariant "at most one open" structural.
- *`selectedDayIndex` disappears.* The day index travels in the variant (`pivot`,
  `quickFind`, `replaceRecovery.slot.dayIndex`). `handleSearchPath` reads it from
  the `pivot` variant, the only place it is called from.
- *Alternative considered: keep `useState`s but put them in a custom hook.* That
  is smaller, but it keeps the impossible combinations and the reset
  duplication. It only moves the problem. Rejected.
- *Alternative considered: a state-machine library (XState).* It adds a
  dependency for seven states with flat transitions. A plain reducer meets the
  outcome. Rejected (mission: avoid speculative frameworks).

**D2. Pivot → Quick Find is one action, with no timer.** `openQuickFind(dayIndex)`
replaces `pivot` with `quickFind` in one dispatch. `pendingQuickFindDayIndex` and
its 240 ms effect are deleted. This is the change's single perceptible change
(proposal → Outcome). If a pivot exit animation is wanted later, it should be added by
wrapping the pivot in `AnimatePresence` and chaining off `onExitComplete`, not a
fixed delay. That is out of scope here.

**D3. A stale async completion closes an overlay only if it is still current.**
`closeIfCurrent(predicate)` is a no-op unless the predicate matches the current
overlay. Non-cooking save and clear call
`closeIfCurrent(o => o.kind === 'nonCooking' && o.target.date === target.date && o.target.weekOffset === target.weekOffset)`,
which replaces the `activeNonCookingDate` ref and the
`usePlannerStore.getState().currentWeekOffset` comparison. Because async callbacks
see the latest reducer state only through dispatch, the predicate runs inside the
reducer, never against a captured closure value.

**D4. The `planDate` deep link dispatches directly.** The 0 ms `setTimeout` exists
to defer `setShowPivot` out of the effect body. It becomes `openPivot(dayIndex)`
inside the existing guarded effect. If `react-hooks` lint still flags dispatch in
the effect, keep the deferral but dispatch `openPivot` from it. The behavior is
the same either way.

**D5. Confirmation moves wholesale into `usePlanningConfirmation`.** It lives in
`pwa/src/lib/planner/usePlanningConfirmation.ts`. Its logic moves without
change: same effect dependencies, same identity checks, same timers, same
`retirePlanningResult` delivery semantics. Only its location changes. It does
not share state with the overlay reducer.

**D6. Detail-verification state stays in the page.** `verifiedDetail`,
`detailReview` and `detailReadAttempt` stay where they are, keyed by
`detailIdentity`. `detailIdentity` now derives from the `detail` variant instead
of two separate `useState`s. Extracting the verification is a separate concern
and out of scope.

## First Observable Slice

Entry point: a person taps an empty day card, chooses **Quick Find**, picks a
recipe, and the day shows it.

Path: `PlannerDayCard.onPivot` → `openPivot` → `PlanningPivotSheet.onQuickFind` →
`openQuickFind` → `QuickFindModal.onSelect` → `handleQuickFindSelect` → existing
`useWeekStore.assignRecipe` → `close`.

This exercises the reducer, the hook, the page wiring and the timer-free handoff
(D2) against the real stores, which are mocked only at the HTTP boundary in E2E.
Integration boundary: `pwa/e2e/action-pivot.spec.ts` / `pwa/e2e/planner.spec.ts`
against `pwa/e2e/mock-api.ts`, unchanged. Later slices move the remaining
surfaces onto the union and then extract confirmation.

## State, Concurrency and Recovery

Transitions (others are `close` → `none`):

- `none` → `pivot` (day card, `planDate`) | `nudge` | `detail` (day card, `detailRecipe`)
- `pivot` → `quickFind` | `nonCooking` (with `fromPivotDayIndex`) | `cookedDefer` (status 2 plan-later) | `none` (remove, ask family, plan-later executed)
- `nonCooking` → `pivot` (Back) | `none` (save/clear via `closeIfCurrent`, close)
- `quickFind` → `replaceRecovery` (occupied day) | `none` (assignment resolved). On assignment rejection it **stays** `quickFind` (`meal-assignment`: assignment path rejects).
- `replaceRecovery` → `detail` (closed unsaved; resume the replacement) | `none` (saved)
- `cookedDefer` → `cookedDefer{submitting:true}` → `none` (finally). `close` is ignored while `submitting`, which preserves the existing `onClose` guard.

Invariants, tested on the pure reducer:

1. At most one overlay is open (structural).
2. `closeIfCurrent` never closes a different overlay than the one its predicate names.
3. `close` on `cookedDefer` with `submitting: true` returns the same state.
4. Every `open*` from any state yields exactly that variant, with its payload intact.

These are small, enumerable cases, so an example-table test over all
`(state kind × action)` pairs gives full coverage. A property-based test would add
nothing here.

## User Experience

Unchanged except for D2.

Observed during implementation (2026-11-24): `PlanningPivotSheet` does not set
`trapFocus` on `PivotSheetShell`, so the shell neither captures nor restores
focus for the pivot. `QuickFindModal` does not use `PivotSheetShell` and does not
manage focus. Before this change, focus fell to `<body>` when Quick Find closed,
with or without the 240 ms delay.

**Decided (user, 2026-11-24):** focus returns to the page, not to a specific day
card. When Quick Find closes (dismissed, or its assignment completes), the page
does not move focus. Focus falls to `<body>` as before this change. Unit tests
assert it. No sheet-component props or markup change. Quick Find still does not
move focus into itself on mount; that is unchanged and out of scope.

## Risks and Deferrable Questions

- **Risk: a hidden coexistence case.** If some path really does open two overlays
  at once, opening the second will now close the first. Mitigation: the 75
  existing page tests and the four Planner E2E specs run unchanged before the
  timing assertion is updated. Any failure there is treated as a regression to
  investigate, not a stale expectation.
- **Deferrable:** `meal-assignment` scenario wording "pending pivot handoff state
  clear" names internal state that no longer exists. It is still satisfied. A
  wording cleanup can follow separately and does not affect this change.
