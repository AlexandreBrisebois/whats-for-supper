# Proposal

## Why

Moving a `Cooked` meal to next week from Planner's **Save for Next Week** action leaves the meal marked `Cooked` with its preparation receipt and `Recipe.LastCookedDate` intact.

Source inspection established the root cause:

- Planner's `handlePlanLater` (`pwa/src/app/(app)/planner/page.tsx`) is the only remaining UI caller of cross-week `POST /api/schedule/move` (`MoveCrossWeekAsync` in `api/src/RecipeApi/Services/ScheduleService.cs`), which only updates `CalendarEvent.Date` and silently no-ops if the target week is full.
- Meanwhile, `POST /api/schedule/defer` (`DeferRecipeAsync` in `api/src/RecipeApi/Services/ScheduleService.cs`) already implements exact-source lookup, indefinite spillover into later weeks, resetting `Cooked` to `Planned`, clearing preparation metadata, and recalculating `Recipe.LastCookedDate`—and is already used by Home and replacement recovery via `deferToFollowingWeek` (`pwa/src/lib/planner/slotAssignment.ts`).
- Having two overlapping schedule movement endpoints (`POST /api/schedule/move` and `POST /api/schedule/defer`) with four divergent backend branches caused this drift and leaves dead legacy paths (`MoveCrossWeekAsync` and legacy same-week `intent: "push"`).

## Outcome and Scope

### Observable Outcome

1. **Unified movement contract**: `POST /api/schedule/move` becomes the single schedule movement operation with three explicit intents:
   - `intent: "swap"` (default, same-week drag and keyboard reorder) — preserves meal status, preparation receipt, and `LastCookedDate` without prompting.
   - `intent: "tomorrow"` (contiguous next-day chain push) — preserved unchanged, including `sourceNonCooking` support and `409` rejection of `Cooked` or `AwaitingConsensus` entries.
   - `intent: "defer"` (next-week / future-week placement) — absorbs `POST /api/schedule/defer`, supports exact source targeting, indefinite spillover from `targetWeekOffset` Monday, optional `sourceNonCooking`, unified `MoveScheduleResultDto` (with `scheduledWeekOffset` and `refreshComplete`), and explicit `cookedDisposition` (`"reset"` default, or `"preserve"`).
2. **Explicit cooked-meal prompt when moving to next week / future**:
   - All Next Week callers (Planner **Save for Next Week**, Home, and replacement recovery) route through `deferToFollowingWeek` → `POST /api/schedule/move` (`intent: "defer"`).
   - Uncooked meals (`status !== 2`) defer immediately with zero extra taps.
   - `Cooked` meals (`status === 2`) open a compact two-choice sheet (reusing `PivotSheetShell` and `SheetMealContext`) asking how to move the meal:
     - **Subtitle**: _"This meal is marked cooked. How should we move it?"_
     - **Cook it next week** (`cookedDisposition: "reset"`, primary) — _"Move as planned and clear cooked status"_ (FR: **Cuisiner la semaine prochaine** — _Déplace comme prévu et efface le statut cuisiné_)
     - **Already cooked** (`cookedDisposition: "preserve"`, secondary) — _"Keep it marked cooked (prepped ahead or frozen)"_ (FR: **Déjà cuisiné** — _Garde le statut cuisiné (préparé d'avance ou congelé)_)
     - Dismissing/cancelling performs no mutation.

### Nearby Behavior That Must Remain Working

- Same-week Planner drag-and-drop and keyboard Arrow Up/Down swap (`intent: "swap"`) continue to preserve `Status` (including `Cooked` and `Locked`), `Prepared*` metadata, non-cooking entries, and `LastCookedDate` with no prompt.
- Tomorrow push (`intent: "tomorrow"`) continues to shift contiguous occupied supper chains across weeks, support `sourceNonCooking` / legacy `sourceDisposition: "order_in"`, and reject `Cooked` or `AwaitingConsensus` entries in the source or chain with `409`.
- `GroceryRecomputeService` behavior is unchanged (it continues to include recipe-backed entries in a week regardless of status, honoring frozen `PreparedServings` when preserved; UI copy makes no claim about excluding ingredients from groceries).
- Guarded/unguarded date deletion, Sunday displacement on assign, and overdue finalization remain unchanged.

### Exclusions & Follow-Up References

- No changes to `GroceryRecomputeService` or `SupperProjectionInputs`.
- Note for sync/archive: `openspec/specs/tonight-meal-decisions/spec.md` (requirement `Mark Order In before planned-recipe disposition`) and `openspec/specs/household-live-updates/spec.md` (requirement `Attempt incremental schedule publication after supported saves`) contain non-owned phrasing references to `POST /api/schedule/defer` and legacy cross-week movement; if desired during implementation or archive, those references can be reconciled in a follow-up delta.

## What Changes

- **BREAKING**: Remove `POST /api/schedule/defer` and `DeferScheduleDto` / `DeferScheduleResultDto`, folding exact-source future-week deferral into `POST /api/schedule/move` with `intent: "defer"`.
- **BREAKING**: Retire dead legacy branches in `POST /api/schedule/move`: legacy cross-week `swap`/`push` (`MoveCrossWeekAsync`) and legacy same-week `intent: "push"` (returning `400` for unsupported intents or cross-week `swap`).
- Extend `MoveScheduleDto` with `intent: "defer"`, optional `sourceDate`, `sourceNonCooking` support on `intent: "defer"`, and optional `cookedDisposition` (`"reset"` | `"preserve"`, defaulting to `"reset"`).
- Extend `MoveScheduleResultDto` with optional `scheduledWeekOffset` so callers can detect and report spillover consistently alongside `destinationDate`, `affectedWeekStartDates`, and `refreshComplete`.
- Update `POST /api/schedule/move` (`intent: "defer"`) to return `404` on missing/mismatched source, `409` on `AwaitingConsensus`, `400` on invalid `cookedDisposition`, `sourceNonCooking`, or out-of-range `targetWeekOffset`, and `200` with `refreshComplete: false` if post-commit follow-ups fail.
- Route Planner `handlePlanLater` through `deferToFollowingWeek` (`POST /api/schedule/move` with `intent: "defer"`), adding the cooked-meal two-choice prompt sheet when the source day is `Cooked` (`status === 2`) and confirming destination/spillover/refresh-incomplete feedback.
- Update OpenAPI (`specs/openapi.yaml`), regenerate Kiota client (`pwa/src/lib/api/generated/`), update stateful E2E mocks (`pwa/e2e/mock-api.ts`), and update EN/FR locales (`pwa/src/locales/en/common.json`, `pwa/src/locales/fr/common.json`).

## Capabilities

### New Capabilities

<!-- None: all changed requirements belong to the existing meal-rescheduling capability. -->

### Modified Capabilities

- `meal-rescheduling`: Unify exact-source deferral into `POST /api/schedule/move` (`intent: "defer"`), retire `POST /api/schedule/defer` and legacy cross-week/same-week push branches, add `cookedDisposition` (`"reset"` default vs `"preserve"`) with cooked-meal prompt behavior in Planner's Save for Next Week flow, and report `refreshComplete` on committed deferrals while keeping same-week swap and Tomorrow push behavior intact.

## Impact

- **API Contract & Generated Client**: `specs/openapi.yaml`, `pwa/src/lib/api/generated/`.
- **Backend**: `api/src/RecipeApi/Controllers/ScheduleController.cs`, `api/src/RecipeApi/Dto/MoveScheduleDto.cs`, `api/src/RecipeApi/Dto/DeferScheduleDto.cs` (removed), `api/src/RecipeApi/Services/ScheduleService.cs`, `api/src/RecipeApi/Services/ScheduleService.Defer.cs` (optional partial split).
- **Frontend**: `pwa/src/lib/planner/slotAssignment.ts`, `pwa/src/app/(app)/planner/page.tsx`, `pwa/src/components/planner/` (cooked-move confirmation sheet), `pwa/src/components/home/HomeCommandCenter.tsx`, `pwa/src/locales/en/common.json`, `pwa/src/locales/fr/common.json`.
- **Mocks & Tests**: `pwa/e2e/mock-api.ts`, `api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.History.cs`, `api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.Lifecycle.cs`, `api/src/RecipeApi.Tests/Integration/DeploymentCalendarPostgresTests.cs`, `api/src/RecipeApi.Tests/Integration/DeploymentCalendarIntegrationTests.cs`, `api/src/RecipeApi.Tests/Integration/PlanLaterPostgresTests.cs`, `api/src/RecipeApi.Tests/Integration/GroceryItemsIntegrationTests.cs`, `api/src/RecipeApi.Tests/Integration/RecipeDetailPlanningPostgresTests.cs`, `api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Movement.cs`, `api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.MovementAcceptance.cs`, `api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs`, `api/src/RecipeApi.Tests/Services/NonCookingScheduleTests.cs`, `pwa/src/lib/planner/slotAssignment.test.ts`, `pwa/src/app/(app)/planner/page.test.tsx`, `pwa/src/testing/prepared-lifecycle-mock.test.ts`, `pwa/e2e/ux-week-recovery-live.spec.ts`, `pwa/e2e/tonight-replacement-recovery.spec.ts`.
