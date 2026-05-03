# Today Slot Persistence — Bugfix Design

## Overview

Four related gaps in the "today's slot" persistence story. Three are missing or stub E2E tests that leave real user flows unverified; one is a UI rendering omission in `PlannerDayCard` that causes the "Ordered In" state to be invisible in the planner.

The fix strategy is:

- **Bug 2** — Purely additive UI branch in `PlannerDayCard` (inside `pwa/src/app/(app)/planner/page.tsx`) that reads `day.status === 3` before falling through to the "Plan a meal" empty state. Also adds an explicit `status?: number` field to `UILocalScheduleDay` in `weekStore.ts` (the field is already present at runtime via `...day` spread, but not typed).
- **Bugs 1, 3, 4** — Replace the stub test and add two new E2E tests across `home-goto.spec.ts` and `home-recipe.spec.ts`. No production code changes are required for these three bugs.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers a bug — either a `UILocalScheduleDay` with `status === 3` and no recipe reaching `PlannerDayCard`, or a user flow that has no E2E coverage.
- **Property (P)**: The desired behavior when the bug condition holds — the ordered-in indicator renders, or the E2E test asserts the correct outcome.
- **Preservation**: Existing rendering paths in `PlannerDayCard` (recipe present, status 0 empty, status 2 cooked) and existing E2E tests that must not regress.
- **`UILocalScheduleDay`**: The type in `pwa/src/store/weekStore.ts` that represents a single day in the planner. Built by `buildScheduleDays()` via `...day` spread from the API response, so `status` is present at runtime but not declared in the TypeScript type.
- **`PlannerDayCard`**: The inner component in `pwa/src/app/(app)/planner/page.tsx` that renders a single day row. Currently branches only on `day.recipe?.id`.
- **`todayStore`**: Zustand store (`pwa/src/store/todayStore.ts`) that owns today's slot state. `assignRecipe()` sets `currentRecipe` optimistically and fires `POST /api/schedule/assign` in the background.
- **`weekStore`**: Zustand store (`pwa/src/store/weekStore.ts`) that owns the full week schedule. `init()` fetches `GET /api/schedule?weekOffset=0` on planner mount.
- **`setupCommonRoutes()`**: Helper in `pwa/e2e/mock-api.ts` that registers default Playwright route intercepts. Mocks `POST /api/schedule/assign` with `{ success: true }` and `GET /api/schedule?weekOffset=0` with an empty week by default.
- **`data-testid="ordered-in-indicator"`**: The new test locator added by the Bug 2 fix.
- **`data-testid="plan-meal-button"`**: The existing locator for the "Plan a meal" empty state button.
- **SSR bypass**: The `/home` page is a Next.js Server Component. `serverFetch()` runs on the Node.js process and cannot be intercepted by `page.route()`. Client-side `todayStore.sync()` fires after mount and _is_ interceptable. See §6 of `.kiro/steering.md`.

---

## Bug Details

### Bug Condition

**Bug 2** manifests when `PlannerDayCard` receives a `UILocalScheduleDay` where `day.recipe?.id` is falsy and `day.status === 3`. The component's current logic falls straight through to the "Plan a meal" empty state without checking `status`.

**Formal Specification:**
```
FUNCTION isBugCondition_2(day)
  INPUT: day of type UILocalScheduleDay
  OUTPUT: boolean

  RETURN (day.recipe = null OR day.recipe.id = null OR day.recipe.id = "")
         AND day.status = 3
END FUNCTION
```

**Bugs 1, 3, 4** are test-coverage gaps. Their bug condition is the absence of a real test for a specific user flow:

```
FUNCTION isBugCondition_tests(flow)
  INPUT: flow of type UserFlow
  OUTPUT: boolean

  RETURN flow IN {
    "confirm_goto → navigate_to_planner",
    "quick_find_from_pivot → tonight_menu_card",
    "planner_quick_find_for_today → navigate_to_home"
  }
  AND NOT EXISTS realTest WHERE realTest.covers(flow)
END FUNCTION
```

### Examples

**Bug 2:**
- User taps "Order In" from pivot card (no recipe) → `todayStore.markOrderedIn()` fires `POST /api/schedule/day/{date}/validate` with `{ status: 3 }` → user navigates to `/planner` → `weekStore.init()` fetches schedule → `buildScheduleDays()` spreads `...day` so `day.status === 3` is in the data → `PlannerDayCard` renders "Plan a meal" button. **Expected:** renders "Ordered In" indicator.

**Bug 1:**
- User taps "Make This Tonight" → `todayStore.assignRecipe()` fires `POST /api/schedule/assign` → user navigates to `/planner` before the POST completes → `weekStore.init()` fetches schedule → today's slot may be empty. No E2E test covers the wait-for-assign-then-assert-planner path.

**Bug 3:**
- User opens Quick Find from pivot card → selects recipe → `HomeCommandCenter.handleQuickFindSelect()` calls `todayStore.assignRecipe()` → `TonightMenuCard` should appear immediately (optimistic). No E2E test covers this path.

**Bug 4:**
- The test "Planner assignment for today updates home page via todayStore without navigation" in `home-recipe.spec.ts` has a `page.evaluate` block that does nothing and only asserts the pre-condition (pivot card visible). It does not navigate to `/planner`, use Quick Find, or assert `TonightMenuCard`.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `PlannerDayCard` with `day.recipe?.id` truthy SHALL continue to render the recipe name, image, vote count, and "Supper planned" label exactly as before.
- `PlannerDayCard` with `day.recipe?.id` falsy and `day.status === 0` SHALL continue to render the "Plan a meal" dashed-border plus button (`data-testid="plan-meal-button"`).
- `PlannerDayCard` with `day.recipe?.id` falsy and `day.status === 2` SHALL continue to render the "Plan a meal" empty state (this combination is not introduced by these bugs).
- `todayStore.assignRecipe()` SHALL continue to set `currentRecipe` optimistically and fire `POST /api/schedule/assign` in the background without blocking the UI.
- `setupCommonRoutes()` default behavior (empty schedule, assign returns `{ success: true }`) SHALL remain unchanged.
- All existing passing E2E tests SHALL continue to pass.

**Scope:**
All `PlannerDayCard` inputs where `isBugCondition_2` is false are completely unaffected by the Bug 2 fix. The new `else if` branch is inserted between the existing recipe branch and the existing empty-state branch — it does not touch either.

---

## Hypothesized Root Cause

### Bug 2 — PlannerDayCard missing status branch

`PlannerDayCard` was written before the "Order In" status was introduced. The component's content area uses a simple `if (day.recipe?.id)` / `else` pattern. The `status` field was never added to the rendering logic because the original design only distinguished "has recipe" from "no recipe". The `UILocalScheduleDay` type also omits `status` from its explicit fields (it arrives via `...day` spread), making the omission invisible to TypeScript.

### Bug 1 — No E2E test for GOTO confirm → planner navigation

The existing GOTO confirm tests in `home-goto.spec.ts` assert that `TonightMenuCard` appears on the home page. None of them navigate to `/planner` afterward to verify the planner reflects the assignment. The race between `POST /api/schedule/assign` completing and `weekStore.init()` fetching the schedule is the real risk — the test needs to wait for the assign POST before navigating.

### Bug 3 — No E2E test for Quick Find from pivot card

The Quick Find path from `HomeCommandCenter` (`onDiscover` → `setShowQuickFind(true)` → `handleQuickFindSelect` → `todayStore.assignRecipe()`) is the same optimistic code path as the GOTO confirm, but has no dedicated test. The `fill-the-gap` endpoint needs to be mocked to return at least one recipe for the modal to show a selectable card.

### Bug 4 — Stub test for planner → home propagation

The `page.evaluate` block in the stub test attempts to access `useTodayStore` from the browser context but cannot import the Zustand module directly. The comment acknowledges this and the test falls back to asserting only the pre-condition. The real test must navigate to `/planner`, use the `PlanningPivotSheet` → Quick Find flow, and then navigate to `/home`.

---

## Correctness Properties

Property 1: Bug Condition — Ordered-In Days Render a Distinct Indicator

_For any_ `UILocalScheduleDay` where `isBugCondition_2` holds (`status === 3` and `recipe?.id` is falsy), `PlannerDayCard` SHALL render `data-testid="ordered-in-indicator"` and SHALL NOT render `data-testid="plan-meal-button"`.

**Validates: Requirements 2.3, 2.4**

Property 2: Preservation — Recipe-Present Days Are Unaffected

_For any_ `UILocalScheduleDay` where `day.recipe?.id` is a non-empty string, `PlannerDayCard` SHALL render `data-testid="recipe-name"` with the recipe name and SHALL NOT render `data-testid="ordered-in-indicator"`.

**Validates: Requirements 3.1**

Property 3: Preservation — Empty Days (Status 0) Are Unaffected

_For any_ `UILocalScheduleDay` where `day.status === 0` and `day.recipe?.id` is falsy, `PlannerDayCard` SHALL render `data-testid="plan-meal-button"` and SHALL NOT render `data-testid="ordered-in-indicator"`.

**Validates: Requirements 3.2**

Property 4: Fix Checking — GOTO Confirm Reflects in Planner (Bug 1)

_For any_ test flow where the user confirms GOTO on `/home` and the assign POST completes, navigating to `/planner` SHALL show today's day card (located by `data-date`) with the assigned recipe name visible.

**Validates: Requirements 2.1, 2.2**

Property 5: Fix Checking — Quick Find from Pivot Shows Menu Card Immediately (Bug 3)

_For any_ test flow where the user opens Quick Find from the pivot card and selects a recipe, `TonightMenuCard` SHALL be visible within 300 ms of selection (before the assign POST resolves) and `POST /api/schedule/assign` SHALL have been called.

**Validates: Requirements 2.5, 2.6**

Property 6: Fix Checking — Planner Quick Find for Today Reflects on Home (Bug 4)

_For any_ test flow where the user uses Quick Find in the planner to assign a recipe to today's slot and then navigates to `/home`, `TonightMenuCard` SHALL be visible with the assigned recipe name.

**Validates: Requirements 2.7, 2.8**

---

## Fix Implementation

### Bug 2 — PlannerDayCard ordered-in branch

**File:** `pwa/src/app/(app)/planner/page.tsx`

**Component:** `PlannerDayCard` (inner function, `flex-1 min-w-0` content div)

**Specific Changes:**

1. **Add `status` to `UILocalScheduleDay` type** in `pwa/src/store/weekStore.ts`:
   ```ts
   export type UILocalScheduleDay = Omit<ScheduleDay, 'recipe'> & {
     recipe?: ScheduleRecipeDto | null;
     status?: number;          // ← ADD: already present at runtime via ...day spread
     _uiId: string;
     _isPending?: boolean;
     _voteCount?: number | null;
     _unanimousVote?: boolean | null;
     _userCleared?: boolean;
   };
   ```

2. **Insert ordered-in branch** in `PlannerDayCard`, between the `day.recipe?.id` branch and the `else` empty-state branch:
   ```tsx
   {day.recipe?.id ? (
     // existing recipe rendering — unchanged
   ) : (day as any).status === 3 ? (
     // NEW: ordered-in indicator
     <div
       data-testid="ordered-in-indicator"
       className="flex items-center gap-3"
     >
       <div className="h-10 w-10 rounded-xl bg-charcoal/5 flex items-center justify-center flex-shrink-0">
         <span className="text-xl">🥡</span>
       </div>
       <div className="flex flex-col gap-0.5">
         <span className="text-sm font-bold text-charcoal/60">Ordered In</span>
         <span className="text-[10px] text-charcoal/30 font-medium">No cook tonight</span>
       </div>
     </div>
   ) : (
     // existing "Plan a meal" empty state — unchanged
   )}
   ```
   Once `status?: number` is added to the type, the `(day as any)` cast can be removed.

3. **No changes** to `buildScheduleDays()`, `weekStore.init()`, or any API layer — `status` is already spread into `UILocalScheduleDay` at runtime.

### Bugs 1, 3, 4 — E2E tests

No production code changes. All changes are in test files.

**Bug 1 — Add to `pwa/e2e/home-goto.spec.ts`** (new test in the existing `todayStore` describe block or a new describe block):

Key setup:
- Mock GOTO setting + status `ready`
- Stateful schedule mock: before assign → empty; after assign → today's slot has the recipe (same pattern as the existing "Page reload after Make This Tonight" test)
- Mock assign endpoint that sets `assignDone = true`
- Navigate to `/home`, wait for `confirm-goto-btn` to be enabled, click it
- `await expect.poll(() => assignDone).toBe(true)` — wait for the POST to complete before navigating
- `await page.goto('/planner')`
- Wait for `day-card-0` to be visible (planner loaded)
- Assert `page.locator('[data-date="${today}"]').getByTestId('recipe-name')` contains the recipe name

**Bug 3 — Add to `pwa/e2e/home-recipe.spec.ts`** (new test in the existing describe block):

Key setup:
- `setupCommonRoutes()` already returns empty schedule and mocks assign
- Override `fill-the-gap` to return one recipe (e.g. `MOCK_IDS.RECIPE_LASAGNA` with name `"Test Lasagna"`)
- Mock assign endpoint with `assignCalled` flag
- Navigate to `/home`, wait for `tonight-pivot-card`
- Click `discover-btn` (the "Quick Find" button on the pivot card)
- Wait for `quick-find-modal` to be visible
- Click `quick-find-select` button
- Assert `tonight-menu-card` is visible within 300 ms (optimistic)
- Assert `expect.poll(() => assignCalled).toBe(true)`

**Bug 4 — Replace stub in `pwa/e2e/home-recipe.spec.ts`**:

Replace the entire body of "Planner assignment for today updates home page via todayStore without navigation" with a real test:

Key setup:
- Stateful schedule mock: before assign → empty; after assign → today's slot has the recipe
- Override `fill-the-gap` to return one recipe
- Mock assign endpoint with `assignDone` flag
- Navigate to `/planner`
- Wait for `day-card-0` to be visible
- Find today's card by `data-date` attribute, click it to open `PlanningPivotSheet`
- Wait for `pivot-sheet` to be visible
- Click `pivot-quick-find`
- Wait for `quick-find-modal` to be visible
- Click `quick-find-select`
- `await expect.poll(() => assignDone).toBe(true)`
- `await page.goto('/home')`
- Wait for `home-loader` to disappear
- Assert `tonight-menu-card` is visible
- Assert recipe name is visible

**SSR constraint for Bug 4:** After navigating to `/home`, the SSR fetch runs on the server and cannot be mocked. The client-side `todayStore.sync()` fires after mount and _is_ interceptable. Because `todayStore.assignRecipe()` was called from the planner (via `useTodayStore.getState().assignRecipe()`), `optimisticWriteAt` is set and `sync()` will not overwrite `currentRecipe` for 10 seconds. `TonightMenuCard` will render from the Zustand store state without needing the SSR to return the recipe. The test must wait for `home-loader` to disappear before asserting.

---

## Testing Strategy

### Validation Approach

Two-phase approach: first confirm the bug exists on unfixed code (exploratory), then verify the fix and preservation.

### Exploratory Bug Condition Checking

**Goal:** Surface counterexamples that demonstrate Bug 2 on unfixed code. Confirm the root cause analysis.

**Test Plan:** Write a unit/component test that renders `PlannerDayCard` with `{ status: 3, recipe: undefined }` and asserts `ordered-in-indicator` is present. Run on unfixed code — it will fail because the component renders `plan-meal-button` instead.

**Test Cases:**
1. **Ordered-in, no recipe**: Render `PlannerDayCard` with `status: 3, recipe: undefined` → assert `ordered-in-indicator` present (fails on unfixed code)
2. **Ordered-in E2E**: Navigate to `/planner` with a mocked schedule day where `status: 3, recipe: null` → assert `ordered-in-indicator` visible (fails on unfixed code)
3. **Bug 4 stub**: Run the existing stub test → it passes trivially (asserts only pre-condition) — confirms it is not a real test

**Expected Counterexamples:**
- `plan-meal-button` is rendered instead of `ordered-in-indicator` for `status: 3` days
- The stub test passes without navigating to `/planner` or asserting `TonightMenuCard`

### Fix Checking

**Goal:** Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL day WHERE isBugCondition_2(day) DO
  rendered := PlannerDayCard_fixed(day)
  ASSERT rendered.orderedInIndicator.visible = true
  ASSERT rendered.planMealButton.visible = false
END FOR

FOR ALL flow WHERE isBugCondition_tests(flow) DO
  result := runRealTest_fixed(flow)
  ASSERT result.assertions.allPass = true
END FOR
```

### Preservation Checking

**Goal:** Verify that for all inputs where the bug condition does NOT hold, the fixed `PlannerDayCard` produces the same result as the original.

**Pseudocode:**
```
FOR ALL day WHERE NOT isBugCondition_2(day) DO
  ASSERT PlannerDayCard_original(day) = PlannerDayCard_fixed(day)
END FOR
```

**Testing Approach:** Property-based testing is well-suited here because `PlannerDayCard` is a pure render function of its `day` prop. Generating random `UILocalScheduleDay` values where `status !== 3` (or `recipe?.id` is truthy) and asserting the rendered output is unchanged provides strong preservation guarantees.

**Test Cases:**
1. **Recipe present (any status)**: `day.recipe.id` truthy → `recipe-name` renders, `ordered-in-indicator` absent
2. **Empty, status 0**: `recipe` absent, `status: 0` → `plan-meal-button` renders, `ordered-in-indicator` absent
3. **Empty, status 2**: `recipe` absent, `status: 2` → `plan-meal-button` renders (existing behavior), `ordered-in-indicator` absent
4. **Existing E2E suite**: All tests in `home-goto.spec.ts`, `home-recipe.spec.ts`, `planner-full-cycle.spec.ts` continue to pass

### Unit Tests

- Render `PlannerDayCard` with `{ status: 3, recipe: undefined }` → assert `ordered-in-indicator` present, `plan-meal-button` absent
- Render `PlannerDayCard` with `{ status: 0, recipe: undefined }` → assert `plan-meal-button` present, `ordered-in-indicator` absent
- Render `PlannerDayCard` with `{ status: 3, recipe: { id: 'abc', name: 'Pasta', image: '' } }` → assert `recipe-name` present (recipe branch wins), `ordered-in-indicator` absent

### Property-Based Tests

- Generate random `UILocalScheduleDay` values with `status !== 3` and `recipe?.id` falsy → assert `plan-meal-button` renders and `ordered-in-indicator` does not
- Generate random `UILocalScheduleDay` values with `recipe?.id` truthy (any status) → assert `recipe-name` renders and `ordered-in-indicator` does not
- Generate random `UILocalScheduleDay` values with `status === 3` and `recipe?.id` falsy → assert `ordered-in-indicator` renders and `plan-meal-button` does not

### Integration Tests (E2E)

**Bug 2 E2E** (add to `pwa/e2e/planner-full-cycle.spec.ts` or `pwa/e2e/planner.spec.ts`):
- Mock schedule with today's slot having `status: 3, recipe: null`
- Navigate to `/planner`
- Assert today's day card (by `data-date`) shows `ordered-in-indicator`
- Assert today's day card does NOT show `plan-meal-button`

**Bug 1 E2E** (add to `pwa/e2e/home-goto.spec.ts`):
- Mock GOTO setting + status `ready`; stateful schedule mock (empty → recipe after assign)
- Navigate to `/home`, click "Make This Tonight", wait for assign POST
- Navigate to `/planner`, assert today's card shows recipe name

**Bug 3 E2E** (add to `pwa/e2e/home-recipe.spec.ts`):
- Mock `fill-the-gap` to return one recipe; mock assign with `assignCalled` flag
- Navigate to `/home`, click `discover-btn`, wait for `quick-find-modal`
- Click `quick-find-select`
- Assert `tonight-menu-card` visible within 300 ms
- Assert `assignCalled` is true

**Bug 4 E2E** (replace stub in `pwa/e2e/home-recipe.spec.ts`):
- Mock `fill-the-gap` to return one recipe; stateful schedule mock; mock assign with `assignDone` flag
- Navigate to `/planner`, click today's card, click `pivot-quick-find`, click `quick-find-select`
- Wait for assign POST, navigate to `/home`
- Wait for `home-loader` to disappear
- Assert `tonight-menu-card` visible with recipe name
