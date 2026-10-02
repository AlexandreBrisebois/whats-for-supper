# PLAN-02 — Meal assignment and replacement: requirements

## Status

- **Status:** Implemented capability baseline.
- **Kind:** Capability baseline; behavior-first.
- **Authority:** documents current source behavior; it does not authorize implementation.

## Outcome

From a planner slot, a user can choose a replacement from Quick Find or library search, assign it to an empty day, or explicitly move/remove the existing meal before replacing it.

## Implemented behavior

- **PLAN-02-AC-01 — Entry paths.** Tapping a planner day opens the planning pivot. Quick Find requests `GET /api/schedule/fill-the-gap?weekOffset=<selected week>` and receives at most five server-ranked recipes; Search Library navigates to `/recipes?addToDay=<index>&weekOffset=<offset>`.
- **PLAN-02-AC-02 — Empty-slot assignment.** Selecting a recipe for an empty slot calls `weekStore.assignRecipe`, optimistically fills that local day, posts `POST /api/schedule/assign` with `{ weekOffset, dayIndex, recipeId }`, then refreshes grocery/status information. On failure it restores the previous local schedule; the page re-initializes the week and displays an error toast.
- **PLAN-02-AC-03 — Occupied-slot recovery.** Planner Quick Find does not call assign directly for an occupied day. It opens `SkipRecoveryDialog`; Tomorrow/Next Week/Drop first use `POST /api/schedule/move`, `POST /api/schedule/defer`, or `DELETE /api/schedule/day/{date}/remove`, then assigns the new recipe. A ref guards duplicate recovery submissions and the page re-fetches the week after either outcome.
- **PLAN-02-AC-04 — Server displacement.** `ScheduleService.AssignRecipeAsync` replaces an occupied event. Only a Sunday replacement carries the displaced recipe to the following Monday and returns `displacedRecipe { id, name?, movedToWeekOffset, movedToDayIndex }`; other occupied assignments replace the row without returning a displaced recipe. The generic assignment wrapper returns but `weekStore.assignRecipe` does not inspect that response.
- **PLAN-02-AC-05 — Suggestions and invalidation.** The service excludes recipes already assigned in the target week, prefers `RecipeMatches`, then fills from `DiscoveryRecipes`, ordered by never/least-recently cooked then popularity. Assignment/removal publish `fill_the_gap_invalidated`; the stream invalidates the discovery store for that week.
- **PLAN-02-AC-06 — Scope boundary.** Quick Find card progression/rendering is owned by `QuickFindModal`; search semantics are owned by `search-04-context-aware-search`. Movement and the recovery dialog’s server operations are PLAN-03 concerns.

## Limitations and non-goals

- The API documentation suggests `displacedRecipe` is broadly available, but source only creates it for Sunday; no current client path surfaces it.
- A recovery action can succeed while the subsequent assignment fails; the user gets a refresh/toast but there is no compensating transaction.
- Planner selection/replacement controls use some localized labels, but several Quick Find and pivot strings are literal English.
