# Design

## Context and Existing Ownership

Refer to `proposal.md` for motivation, confirmed decisions, and scope, and `specs/meal-rescheduling/spec.md` for normative requirements.

### Current Behavior and Regression Cause (Source-Observed)

- **Controller** (`api/src/RecipeApi/Controllers/ScheduleController.cs`): exposes both `POST /api/schedule/move` (`MoveRecipe`) and `POST /api/schedule/defer` (`DeferRecipe`).
- **Service** (`api/src/RecipeApi/Services/ScheduleService.cs` and `api/src/RecipeApi/Services/ScheduleService.Tomorrow.cs`):
  - `MoveScheduleEventAsync` dispatches four paths: `intent == "tomorrow"` (`MoveTomorrowAsync`), cross-week `targetWeekOffset != weekOffset` (`MoveCrossWeekAsync`), same-week `intent == "push"`, and default same-week `SwapInternalAsync`.
  - `MoveCrossWeekAsync` only assigns `fromEvent.Date = targetMonday.AddDays(targetIndex)` and returns `null` (silent `200` no-op) if the 7-day target week is full. It never resets `Status` from `Cooked` to `Planned`, never calls `ClearPreparation`, and never calls `SaveChangesAndRecalculateLastCookedDatesAsync`.
  - `DeferRecipeAsync` already performs exact `(SourceDate, RecipeId)` lookup, indefinite spillover from `targetWeekOffset` Monday, `Status = Planned`, `ClearPreparation(source)`, `SaveChangesAndRecalculateLastCookedDatesAsync`, and `sourceNonCooking` support—but currently propagates exceptions from `RefreshCommittedWeekAsync` instead of returning `refreshComplete: false`.
- **Frontend callers**:
  - Home (`pwa/src/components/home/HomeCommandCenter.tsx`) and Replacement Recovery (`pwa/src/lib/planner/slotAssignment.ts`) use `deferToFollowingWeek` → `POST /api/schedule/defer`.
  - Planner's `handlePlanLater` (`pwa/src/app/(app)/planner/page.tsx`) is the **only** UI caller still hitting `POST /api/schedule/move` with `targetWeekOffset: currentWeekOffset + 1, intent: 'push'`, which routes into `MoveCrossWeekAsync` and causes the reported cooked-meal regression.
  - Planner same-week drag-and-drop and keyboard arrows (`pwa/src/store/weekStore.ts` → `moveRecipe` in `pwa/src/lib/api/planner.ts`) call `POST /api/schedule/move` without `targetWeekOffset` (same-week `"swap"`).
  - Tomorrow push (`moveTomorrow` in `pwa/src/lib/planner/slotAssignment.ts`) calls `POST /api/schedule/move` with `intent: 'tomorrow'`.
- **Groceries** (`api/src/RecipeApi/Services/SupperProjectionInputs.cs`, `GroceryRecomputeService.cs`): `ReadWeekAsync` includes all recipe-backed `CalendarEvents` in a week regardless of `Status`, using frozen `PreparedServings` when `PreparedAtUtc != null`. No grocery logic changes are needed; UI copy must remain truthful about this.

## Decisions and Tradeoffs

### 1. Unify `defer` into `POST /api/schedule/move` (`intent: "defer"`) and retire legacy branches

- **Decision**: Consolidate all schedule movement under `POST /api/schedule/move` with three explicit intents: `"swap"` (default, same-week), `"tomorrow"`, and `"defer"`. Remove `POST /api/schedule/defer`, `DeferScheduleDto.cs`, `MoveCrossWeekAsync`, and legacy same-week `intent: "push"`.
- **Why**: Eliminates the split-endpoint drift that caused Planner's regression, removes two zero-caller legacy branches, and gives `"defer"` the stronger `MoveScheduleResultDto` + `refreshComplete` contract already proven by `"tomorrow"`.
- **Alternative considered**: Keep `/api/schedule/defer` separate and only repoint Planner `handlePlanLater` to it. Rejected by user preference to maintain one cohesive movement API while preserving `"swap"` and `"tomorrow"` intact.
- **Validation guards**:
  - Unknown `intent` or retired `intent: "push"` → `400`.
  - `intent: "swap"` with `targetWeekOffset != null && targetWeekOffset != weekOffset` → `400`.
  - `sourceDisposition` remains allowed only on `intent: "tomorrow"` (`"order_in"`).
  - `sourceNonCooking` is allowed on `intent: "tomorrow"` and `intent: "defer"` (rejected with `400` on `"swap"`).
  - `cookedDisposition` is allowed only on `intent: "defer"` (`"reset"` or `"preserve"`; rejected with `400` on other intents or unknown values).

### 2. Request and response DTO shape (`MoveScheduleDto` & `MoveScheduleResultDto`)

- **Decision**:
  - Extend `MoveScheduleDto` (`api/src/RecipeApi/Dto/MoveScheduleDto.cs`):
    - Make `ToIndex` nullable (`int? ToIndex = null`) since `"defer"` discovers its own first open date rather than taking a day index (`"swap"` and `"tomorrow"` still require `ToIndex` in `0..6`, returning `400` otherwise).
    - Add `DateOnly? SourceDate = null` (for `"defer"`, resolve exact source date from `SourceDate` when provided, otherwise require `FromIndex` in `0..6` and compute `context.WeekStart(WeekOffset).AddDays(FromIndex.Value)`—returning `400` if neither is valid).
    - Add `string? CookedDisposition = null` (`"reset"` | `"preserve"`, defaulting to `"reset"` when omitted on `"defer"`).
    - For `"defer"`, `TargetWeekOffset` defaults to `1` when omitted (matching previous `?targetWeekOffset=1` semantics), and must resolve to a valid calendar date (`400` on out-of-range/overflow).
  - Extend `MoveScheduleResultDto`:
    - Add optional `int? ScheduledWeekOffset = null` (populated by `"defer"`, omitted/null for `"tomorrow"`).
    - Keep `Message`, `Moved`, `SourceDate`, `DestinationDate`, `AffectedWeekStartDates`, and `RefreshComplete`.
- **Why**: Single request/response schema in `specs/openapi.yaml` and generated Kiota client (`pwa/src/lib/api/generated/`), zero ambiguity for spillover checks (`scheduledWeekOffset > source.weekOffset + 1`), and consistent partial-success handling (`refreshComplete`).

### 3. Cooked-meal disposition semantics: preserve on same-week drag, ask on defer

- **Decision**:
  - Same-week `"swap"` (`SwapInternalAsync`) remains unchanged: `Status`, `Prepared*` metadata, and `LastCookedDate` stay attached to the occurrence with no UI prompt.
  - `"tomorrow"` (`MoveTomorrowAsync`) remains unchanged: rejects `Cooked` entries in source or displaced chain with `409`.
  - `"defer"` (`MoveDeferAsync`, extracted into `api/src/RecipeApi/Services/ScheduleService.Defer.cs`):
    - When `cookedDisposition` is omitted or `"reset"`: set `Status = CalendarEventStatus.Planned`, call `ClearPreparation(source)`, and recalculate `Recipe.LastCookedDate` if `wasCooked`.
    - When `cookedDisposition == "preserve"` and `wasCooked`: preserve `Status = CalendarEventStatus.Cooked`, preserve `Prepared*` metadata, and do **not** clear `LastCookedDate`. (If `sourceNonCooking != null`, leave the recipe-free `Skipped` entry at the source with `ClearPreparation(source)` and copy `Status = Cooked` + `Prepared*` fields to the newly created destination `CalendarEvent` so history stays attached to the moved occurrence.)
    - When `cookedDisposition == "preserve"` on a non-`Cooked` source (`Planned`, `Locked`, `Skipped`): behaves identically to ordinary deferral (`Planned` at destination, no fabricated preparation).
- **Why**: Supports both the primary bugfix (clearing accidental/overdue cooked state when deferring) and the meal-prep/freezer use case (moving an already-cooked meal to next week without erasing its preparation receipt or last-cooked history).

### 4. Planner Save for Next Week UX and shared `deferToFollowingWeek` caller

- **Decision**:
  - Update `deferToFollowingWeek` in `pwa/src/lib/planner/slotAssignment.ts` to call `apiClient.api.schedule.move.post` with `intent: 'defer'`, `sourceDate`, `weekOffset`, `fromIndex`, `targetWeekOffset: source.weekOffset + 1`, `recipeId`, optional `sourceNonCooking`, and optional `cookedDisposition`. Validate `data.moved === true`, `destinationDate`, and `scheduledWeekOffset`. When `data.refreshComplete === false`, surface the warning toast/feedback without inviting retry.
  - Replace `handlePlanLater` in `pwa/src/app/(app)/planner/page.tsx` so it uses `deferToFollowingWeek`:
    - If `day.status !== 2` (uncooked): invoke `deferToFollowingWeek` immediately, show destination confirmation (including spillover message when `scheduledWeekOffset > currentWeekOffset + 1`), refresh the selected week (and Today if week 0 & today), and surface actionable feedback on failure or incomplete refresh.
    - If `day.status === 2` (`Cooked`): close `PlanningPivotSheet` and open a dedicated compact confirmation sheet (`CookedDeferConfirmSheet` in `pwa/src/components/planner/CookedDeferConfirmSheet.tsx`, reusing `PivotSheetShell` and `SheetMealContext`) with Option 3 bilingual copy:
      - **Subtitle**: _"This meal is marked cooked. How should we move it?"_ (`Ce repas est marqué cuisiné. Comment souhaitez-vous le déplacer ?`)
      - **Primary (`reset`)**: **Cook it next week** — _"Move as planned and clear cooked status"_ (`Cuisiner la semaine prochaine` — _Déplace comme prévu et efface le statut cuisiné_)
      - **Secondary (`preserve`)**: **Already cooked** — _"Keep it marked cooked (prepped ahead or frozen)"_ (`Déjà cuisiné` — _Garde le statut cuisiné (préparé d'avance ou congelé)_)
      - Dismissing cancels cleanly with zero network requests.

## First Observable Slice

The first vertical tracer bullet exercises the full seam for the reported regression:

- **Scenario**: A `Cooked` (prepared) meal in Planner week 0 is deferred via `POST /api/schedule/move` (`intent: "defer"`, `cookedDisposition: "reset"`).
- **Layers exercised**: `specs/openapi.yaml` → Kiota client (`task gen:client`) → `ScheduleController.MoveRecipe` → `ScheduleService.MoveDeferAsync` → PostgreSQL (`CalendarEvents`, `WeeklyPlans`, `Recipes.LastCookedDate`, `SupperServings`) → `pwa/e2e/mock-api.ts` → `slotAssignment.ts` (`deferToFollowingWeek`) → Planner `CookedDeferConfirmSheet` + `handlePlanLater`.
- **Observable outcome**: Source slot clears, destination Monday (or next open slot) receives the meal as `Status = Planned` with `preparation == null`, `Recipe.LastCookedDate` recalculates from remaining `Cooked` entries, both affected weeks recompute groceries and publish snapshots, and `200 MoveScheduleResultDto` returns `moved: true`, `destinationDate`, `scheduledWeekOffset`, and `refreshComplete: true`.

Subsequent slices build directly on this working path:

1. `cookedDisposition: "preserve"` end-to-end (retaining `Cooked`, `Prepared*`, and `LastCookedDate`) + `CookedDeferConfirmSheet` secondary choice.
2. Spillover, `sourceNonCooking`, conflict (`404`/`409`/`400`), and `refreshComplete: false` recovery across Planner, Home, and replacement recovery.
3. Removal of `/api/schedule/defer`, `MoveCrossWeekAsync`, legacy `intent: "push"`, and updating all affected backend, unit, mock, and Playwright tests.

## State, Concurrency and Recovery

- **In-flight deduplication & unknown outcomes**: `deferToFollowingWeek` in `pwa/src/lib/planner/slotAssignment.ts` retains its `WeakMap<DeferSource, DeferAttempt>` guard with `maxRetries: 0`. Definite rejections (`400`, `401`, `403`, `404`, `409`) clear the attempt so the user can review and retry; transport/5xx unknowns mark `attempt.unknown = true`, reread the source week, and refuse blind replay.
- **Planner cooked prompt state**: `pendingCookedDefer` captures the source `PlannerSlot` snapshot (date, weekOffset, dayIndex, recipe, referenceWeekStartDate) when the user clicks **Save for Next Week** on a cooked day. Disabling buttons while submitting prevents double-clicks; `404`/`409` closes/shows actionable recovery feedback and refreshes the displayed week.
- **Partial success (`refreshComplete: false`)**: If `MoveDeferAsync` commits the database transaction and a subsequent grocery recomputation or SSE snapshot publish throws, remaining affected weeks are still attempted, and the API returns `200` with `moved: true, refreshComplete: false`. Clients treat the move as committed, reread the affected week, and display the refresh-incomplete warning without replaying the move.

## Persistence and Side Effects

- **Transaction boundary**: Inside `MoveDeferAsync`, source lookup, `Draft` destination `WeeklyPlan` creation, `CalendarEvent` relocation/status/preparation mutation, `Recipe.LastCookedDate` recalculation (when `wasCooked && reset`), and `EnlistSupperWeeksAsync([sourceMonday, destinationMonday])` all execute inside one `SupperServingsService.BeginAsync` transaction.
- **Post-commit follow-ups**: After committing and disposing the transaction, `RefreshCommittedWeekAsync` runs independently for each distinct affected Monday (`sourceMonday`, `destinationMonday`), accumulating `complete &= await RefreshCommittedWeekAsync(...)`. Follow-up failures never roll back the committed move or turn `200` into `500`.
- **Preservation boundaries**:
  - `SwapInternalAsync` (same-week `"swap"`) preserves `SwapPreparation(fromEvent, toEvent)` and `Status` identically; no `LastCookedDate` mutation occurs.
  - `MoveTomorrowAsync` (`intent: "tomorrow"`) is untouched.

## Compatibility, Rollout and Reversal

- **Single-repo cutover**: Because the PWA and API deploy together from this repository and share the generated Kiota client, removing `POST /api/schedule/defer` and switching all callers to `POST /api/schedule/move` (`intent: "defer"`) happens atomically in one release.
- **Database schema**: No database schema or migration changes are required (`CalendarEvents` already has all `Prepared*` columns and `Status`).
- **Reversal**: Reverting the commit restores `POST /api/schedule/defer` and `MoveCrossWeekAsync` cleanly with no data migration to undo.

## User Experience

- **Shell & accessibility**: `CookedDeferConfirmSheet` reuses `PivotSheetShell` and `SheetMealContext` (Era 3 opaque card surface, terracotta accent bar, Escape/backdrop dismissal, `>= 60px` touch targets, `focus-visible` outlines, localized EN/FR labels via `pwa/src/locales/{en,fr}/common.json`).
- **Low friction**: Uncooked meals and same-week drags never show the sheet; only pushing an already-cooked meal to next week/future prompts the 2-choice decision.
- **Feedback**: Planner surfaces confirmed destination date (with spillover wording when `scheduledWeekOffset > source.weekOffset + 1`) and refresh-incomplete warning using existing Planner confirmation/toast patterns.

## Correctness Properties (Testable Invariants)

1. **Cooked reset invariant (`intent: "defer"`, `cookedDisposition` omitted or `"reset"`)**:
   - _Precondition_: Source `(sourceDate, recipeId)` exists with `Status == Cooked` (with or without explicit `Prepared*` receipt).
   - _Invariant_: After commit, destination entry has `Status == Planned`, all six `Prepared*` fields are `null`, `Recipe.LastCookedDate` equals the max remaining `Cooked` occurrence (or `null` if none remain), and source date has no recipe.
   - _Tests_: PostgreSQL integration test in `PreparedSupperPostgresTests.Lifecycle.cs` + `ScheduleServiceTests.cs` + Playwright/Vitest mock tests.
2. **Cooked preserve invariant (`intent: "defer"`, `cookedDisposition == "preserve"`)**:
   - _Precondition_: Source `(sourceDate, recipeId)` exists with `Status == Cooked` and explicit `Prepared*` receipt.
   - _Invariant_: After commit, destination entry retains `Status == Cooked`, identical `PreparedOn`, `PreparedAtUtc`, `PreparedServings`, `PreparedOriginalServings`, `PreparationPlanToken`, `PreparationServingVersion`, and unchanged `Recipe.LastCookedDate`.
   - _Tests_: PostgreSQL integration test in `PreparedSupperPostgresTests.History.cs` / `Lifecycle.cs` + `ScheduleServiceTests.cs` + Vitest/Playwright tests.
3. **Same-week swap preservation invariant (`intent: "swap"`)**:
   - _Precondition_: `Cooked` / prepared source moved to another day in the same week (occupied or empty).
   - _Invariant_: `Status`, `Prepared*` receipt, and `Recipe.LastCookedDate` remain unchanged on the moved occurrence.
   - _Tests_: Retained PostgreSQL integration tests in `PreparedSupperPostgresTests.History.cs` and `PreparedSupperPostgresTests.Lifecycle.cs`.
4. **Spillover & non-displacement invariant (`intent: "defer"`)**:
   - _Precondition_: Target week (and optionally following week) has all 7 dates occupied by recipes or non-cooking plans.
   - _Invariant_: No existing destination-week entry changes date or content; deferred recipe lands on the first empty date in a later week with `scheduledWeekOffset` matching that week and spillover indicated in `message`.
   - _Tests_: `DeploymentCalendarPostgresTests.cs`, `SupperServingsPostgresTests.MovementAcceptance.cs`, `slotAssignment.test.ts`.
