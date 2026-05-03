# Bugfix Requirements Document

## Introduction

Four related gaps in the "today's slot" persistence story for the "What's for Supper" PWA. Three are missing or stub E2E tests that leave real user flows unverified; one is a UI rendering omission in `PlannerDayCard` that causes the "Ordered In" state to be invisible in the planner.

All four bugs share the same domain: the `todayStore` Zustand store owns today's schedule slot, and the planner's `weekStore` owns the week schedule. The bugs arise where these two stores interact — or where the planner renders data from `weekStore` without reading all the fields that `weekStore` already carries.

**Bug 1** — After "Make This Tonight" (GOTO confirm), navigating to `/planner` may not show the recipe in today's slot due to a race between `todayStore.assignRecipe()` firing `POST /api/schedule/assign` and `weekStore.init()` fetching `GET /api/schedule?weekOffset=0`. No E2E test covers this navigation path.

**Bug 2** — When the user taps "Order In" from the pivot card, `todayStore.markOrderedIn()` fires `POST /api/schedule/day/{date}/validate` with `{ status: 3 }`. The backend records this. When the user navigates to `/planner`, `weekStore.init()` fetches the schedule and `buildScheduleDays()` spreads `...day` into `UILocalScheduleDay`, so `day.status === 3` is present in the data. However, `PlannerDayCard` only checks `day.recipe?.id` to decide what to render — it never reads `day.status`. A day with `status: 3` and no recipe renders as an empty "Plan a meal" slot.

**Bug 3** — The Quick Find path from the pivot card (`HomeCommandCenter.handleQuickFindSelect` → `todayStore.assignRecipe()`) is the same code path as Bug 1's GOTO confirm, but has no E2E test verifying the optimistic menu card appearance or the assign API call.

**Bug 4** — The planner's `handleQuickFindSelect` calls `useTodayStore.getState().assignRecipe()` when the assigned slot is today's date. The existing E2E test for this in `home-recipe.spec.ts` ("Planner assignment for today updates home page via todayStore without navigation") is a stub — the `page.evaluate` block does nothing and the test only asserts the pre-condition. No real test navigates to `/planner`, assigns a recipe to today's slot via Quick Find, then navigates to `/home` and verifies the menu card.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user taps "Make This Tonight" on the pivot card AND then navigates to `/planner`, THEN the system may show today's slot as empty ("Plan a meal") even though the assign POST has been fired, because `weekStore.init()` fetches the schedule before the backend has committed the assignment.

1.2 WHEN the user taps "Make This Tonight" on the pivot card AND then navigates to `/planner`, THEN the system has no E2E test that verifies today's slot shows the assigned recipe after the assign POST completes.

1.3 WHEN the user taps "Order In" from the pivot card with no recipe AND then navigates to `/planner`, THEN the system renders today's slot as an empty "Plan a meal" button, with no visual indication that the family ordered in, even though `day.status === 3` is present in the `weekStore` schedule data.

1.4 WHEN `PlannerDayCard` renders a day where `day.recipe?.id` is falsy AND `day.status === 3`, THEN the system renders the generic "Plan a meal" empty state instead of a distinct "Ordered In" indicator.

1.5 WHEN the user opens Quick Find from the pivot card AND selects a recipe, THEN the system has no E2E test that verifies: (a) `TonightMenuCard` appears immediately (optimistic), and (b) `POST /api/schedule/assign` was called.

1.6 WHEN the planner's Quick Find assigns a recipe to today's slot AND the user navigates to `/home`, THEN the system has no real E2E test that verifies `TonightMenuCard` shows the assigned recipe — the existing test is a stub that asserts only the pre-condition.

### Expected Behavior (Correct)

2.1 WHEN the user taps "Make This Tonight" AND the assign POST completes AND the user navigates to `/planner`, THEN the system SHALL show the assigned recipe in today's slot in the planner.

2.2 WHEN the E2E test suite runs the "Make This Tonight → navigate to planner" flow, THEN the system SHALL have a test that: confirms GOTO on `/home`, waits for the assign POST to complete, navigates to `/planner`, and asserts today's day card shows the recipe name.

2.3 WHEN `PlannerDayCard` renders a day where `day.recipe?.id` is falsy AND `day.status === 3`, THEN the system SHALL render a distinct "Ordered In" visual indicator instead of the "Plan a meal" empty state.

2.4 WHEN the E2E test suite runs the "Order In → navigate to planner" flow, THEN the system SHALL have a test that: taps "Order In" on `/home`, navigates to `/planner`, and asserts today's day card shows the "Ordered In" indicator and does not show the "Plan a meal" button.

2.5 WHEN the user opens Quick Find from the pivot card AND selects a recipe, THEN the system SHALL show `TonightMenuCard` immediately (before the assign POST resolves) AND SHALL have fired `POST /api/schedule/assign`.

2.6 WHEN the E2E test suite runs the "Quick Find from pivot → menu card" flow, THEN the system SHALL have a test that: opens Quick Find from the pivot card, selects a recipe, asserts `TonightMenuCard` is visible immediately, and asserts the assign API was called.

2.7 WHEN the planner's Quick Find assigns a recipe to today's slot AND the user navigates to `/home`, THEN the system SHALL show `TonightMenuCard` with the assigned recipe.

2.8 WHEN the E2E test suite runs the "Planner Quick Find for today → home page" flow, THEN the system SHALL have a real test (not a stub) that: navigates to `/planner`, uses Quick Find to assign a recipe to today's slot, navigates to `/home`, and asserts `TonightMenuCard` shows the assigned recipe.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `PlannerDayCard` renders a day where `day.recipe?.id` is a non-empty string AND `day.status` is any value, THEN the system SHALL CONTINUE TO render the recipe name, image, and "Supper planned" label as before.

3.2 WHEN `PlannerDayCard` renders a day where `day.recipe?.id` is falsy AND `day.status === 0`, THEN the system SHALL CONTINUE TO render the "Plan a meal" empty state with the dashed-border plus button.

3.3 WHEN `PlannerDayCard` renders a day where `day.recipe?.id` is falsy AND `day.status === 2` (cooked), THEN the system SHALL CONTINUE TO render the existing cooked state (if any) or the "Plan a meal" empty state — this status combination is not introduced by these bugs and must not regress.

3.4 WHEN `todayStore.assignRecipe()` is called from `HomeCommandCenter` (GOTO confirm or Quick Find), THEN the system SHALL CONTINUE TO set `currentRecipe` optimistically and fire `POST /api/schedule/assign` in the background without blocking the UI.

3.5 WHEN `todayStore.assignRecipe()` is called from the planner's `handleQuickFindSelect` for today's slot, THEN the system SHALL CONTINUE TO update `HomeCommandCenter` via Zustand subscription without requiring navigation or `router.refresh()`.

3.6 WHEN the user navigates to `/planner` without having taken any action on the home page, THEN the system SHALL CONTINUE TO fetch `GET /api/schedule?weekOffset=0` and render the week schedule as before.

3.7 WHEN `setupCommonRoutes()` is called in a test's `beforeEach`, THEN the system SHALL CONTINUE TO mock `POST /api/schedule/assign` with `{ success: true }` and `GET /api/schedule?weekOffset=0` with an empty week, as the existing default behavior.

---

## Bug Condition Pseudocode

### Bug 1 & 3 — Missing E2E coverage for assign-then-navigate flows

```pascal
FUNCTION isBugCondition_1(X)
  INPUT: X of type UserAction
  OUTPUT: boolean

  // Bug fires when the user confirms a recipe assignment on the home page
  // and then navigates to the planner — no E2E test covers this path
  RETURN (X.action = "confirm_goto" OR X.action = "quick_find_select")
    AND X.origin = "pivot_card"
    AND X.followedByNavigation = "/planner"
    AND NOT EXISTS test WHERE test.covers(X)
END FUNCTION

// Property: Fix Checking — Bug 1
FOR ALL X WHERE isBugCondition_1(X) AND X.action = "confirm_goto" DO
  result ← navigateToPlanner'(X)
  ASSERT result.todayCard.recipeName = X.recipe.name
    AND result.todayCard.showsPlanMeal = false
END FOR

// Property: Fix Checking — Bug 3
FOR ALL X WHERE isBugCondition_1(X) AND X.action = "quick_find_select" DO
  result ← homePageAfterSelect'(X)
  ASSERT result.tonightMenuCard.visible = true
    AND result.assignApiCalled = true
END FOR
```

### Bug 2 — PlannerDayCard does not render ordered-in state

```pascal
FUNCTION isBugCondition_2(X)
  INPUT: X of type UILocalScheduleDay
  OUTPUT: boolean

  // Bug fires when a day has status:3 (ordered in) but no recipe
  RETURN X.status = 3 AND (X.recipe = null OR X.recipe.id = null OR X.recipe.id = "")
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_2(X) DO
  rendered ← PlannerDayCard'(X)
  ASSERT rendered.orderedInIndicator.visible = true
    AND rendered.planMealButton.visible = false
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_2(X) DO
  ASSERT PlannerDayCard(X) = PlannerDayCard'(X)
END FOR
```

### Bug 4 — Stub E2E test for planner-to-home propagation

```pascal
FUNCTION isBugCondition_4(X)
  INPUT: X of type E2ETest
  OUTPUT: boolean

  // Bug fires when the test for planner→home propagation is a stub
  RETURN X.name = "Planner assignment for today updates home page via todayStore without navigation"
    AND X.pageEvaluateBlock.doesNothing = true
    AND X.assertsOnlyPrecondition = true
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_4(X) DO
  result ← runRealTest'(X)
  ASSERT result.navigatedToPlanner = true
    AND result.usedQuickFind = true
    AND result.assignedToTodaySlot = true
    AND result.navigatedToHome = true
    AND result.tonightMenuCard.visible = true
    AND result.tonightMenuCard.recipeName = X.recipe.name
END FOR
```
