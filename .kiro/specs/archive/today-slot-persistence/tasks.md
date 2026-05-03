# Implementation Plan

## Overview

Work is ordered by dependency and risk. Backend service tests come first because they verify real persistence logic against an in-memory database — the same pattern already used in `ScheduleIntegrationTests.cs`. The backend bug fix follows. Then the UI fix. Then the E2E tests that verify the full flows.

The `TestWebApplicationFactory` spins up a real `WebApplication` with real service wiring and real EF Core against an in-memory database. These are service-level tests, not unit tests with mocked dependencies. They run via `dotnet test` in the existing `build-api` CI job — no Docker, no Postgres, no new infrastructure needed.

---

## Tasks

### Group A — Backend: Service Tests and Bug Fix

- [ ] 1. Write service test: `AssignRecipeAsync` creates a CalendarEvent (exploration)
  - Add to `api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs`
  - Test name: `AssignRecipe_CreatesCalendarEvent_WhenNoneExists`
  - Setup: create a `Recipe` in the in-memory DB, call `_service.AssignRecipeAsync(new AssignScheduleDto { RecipeId = recipeId, DayIndex = 0, WeekOffset = 0 })`
  - Assert: a `CalendarEvent` exists in `_db.CalendarEvents` with the correct `RecipeId` and today's Monday date
  - This test should PASS on current code — it confirms the happy path works
  - _Verifies: `POST /api/schedule/assign` persists to the database_

- [ ] 2. Write service test: `AssignRecipeAsync` updates an existing CalendarEvent
  - Add to `ScheduleIntegrationTests.cs`
  - Test name: `AssignRecipe_UpdatesExistingCalendarEvent_WhenOneExists`
  - Setup: create a `Recipe` and a `CalendarEvent` for today's Monday slot, then call `AssignRecipeAsync` with a different `RecipeId`
  - Assert: still only one `CalendarEvent` for that date, and its `RecipeId` matches the new recipe
  - _Verifies: assign is idempotent — no duplicate events_

- [ ] 3. Write service test: `ValidateDayAsync` with status 3 and NO existing event (exploration — expected to FAIL)
  - Add to `ScheduleIntegrationTests.cs`
  - Test name: `ValidateDay_OrderedIn_WithNoExistingEvent_CreatesSkippedEvent`
  - Setup: do NOT create any `CalendarEvent` for today's date
  - Call `_service.ValidateDayAsync(today.ToString("yyyy-MM-dd"), new ValidationDto(3))`
  - Assert: a `CalendarEvent` exists for today with `Status == CalendarEventStatus.Skipped` (or equivalent status 3)
  - **EXPECTED OUTCOME on unfixed code**: test FAILS with `"No meal planned for this date"` exception — this confirms the real backend bug
  - Mark task complete when test is written and the failure is confirmed
  - _Verifies: the root cause of "Order In with no recipe" returning 500 on the real app_

- [ ] 4. Fix `ValidateDayAsync` to handle status 3 with no existing CalendarEvent
  - File: `api/src/RecipeApi/Services/ScheduleService.cs`
  - In `ValidateDayAsync`, replace the throw when `@event == null` with a conditional:
    - If `dto.Status == 3` (ordered in / skipped) AND no event exists: create a new `CalendarEvent` with a placeholder `RecipeId` (use a well-known sentinel `Guid.Empty` or a dedicated "ordered-in" recipe ID), `Date = date`, `Status = CalendarEventStatus.Skipped`
    - For all other statuses with no event: keep the existing throw behaviour
  - This allows "Order In with no recipe" to persist to the database without requiring a pre-existing calendar event
  - **Done when**: the exploration test from task 3 passes; `dotnet test` clean

  > **Note on sentinel RecipeId**: `CalendarEvent.RecipeId` is a foreign key. Options:
  > - Use `Guid.Empty` and make the FK nullable in the schema (requires a migration)
  > - Create a dedicated "ordered-in placeholder" recipe row seeded at startup
  > - Make `RecipeId` nullable on `CalendarEvent`
  > Check the current schema in `api/database/schema.sql` and `CalendarEvent` model before deciding. If FK is non-nullable, the nullable approach is cleanest. Flag the decision in Notes before implementing.

- [ ] 5. Write service test: `ValidateDayAsync` with status 3 and an existing event (preservation)
  - Add to `ScheduleIntegrationTests.cs`
  - Test name: `ValidateDay_OrderedIn_WithExistingEvent_MarksSkipped`
  - Setup: create a `Recipe` and a `CalendarEvent` for today's date with `Status = Planned`
  - Call `_service.ValidateDayAsync(today.ToString("yyyy-MM-dd"), new ValidationDto(3))`
  - Assert: the existing `CalendarEvent` has `Status == CalendarEventStatus.Skipped`
  - This should PASS on both unfixed and fixed code — it's a preservation check
  - _Verifies: the normal "Order In with a recipe" path still works after the fix_

- [ ] 6. Run `dotnet test` — all API tests pass
  - `cd api && dotnet test src/RecipeApi.Tests/RecipeApi.Tests.csproj`
  - All five new tests plus all existing tests must pass
  - Zero compilation errors

---

### Group B — Frontend: PlannerDayCard Ordered-In State

- [x] 7. Write E2E exploration test: ordered-in day renders plan-meal button (expected to FAIL)
  - Add to `pwa/e2e/planner-full-cycle.spec.ts`
  - Mock `GET /api/schedule?weekOffset=0` to return today's slot with `status: 3, recipe: null`
  - Navigate to `/planner`, locate today's card by `[data-date="${today}"]`
  - Assert `ordered-in-indicator` is visible and `plan-meal-button` is NOT visible
  - **EXPECTED OUTCOME on unfixed code**: FAILS — `plan-meal-button` renders instead
  - Mark complete when written and failure confirmed

- [x] 8. Fix `PlannerDayCard` to render ordered-in state

  - [x] 8.1 Add `status?: number` to `UILocalScheduleDay` in `pwa/src/store/weekStore.ts`
    - The field already arrives at runtime via `...day` spread — this makes it explicit in the TypeScript type
    - No changes to `buildScheduleDays()` or any store logic

  - [x] 8.2 Add ordered-in branch in `PlannerDayCard` in `pwa/src/app/(app)/planner/page.tsx`
    - Insert between the `day.recipe?.id` branch and the existing `else` empty-state branch:
      ```tsx
      } else if (day.status === 3) {
        <div data-testid="ordered-in-indicator" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-charcoal/5 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🥡</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-charcoal/60">Ordered In</span>
            <span className="text-[10px] text-charcoal/30 font-medium">No cook tonight</span>
          </div>
        </div>
      }
      ```
    - Do not touch the recipe-present branch or the status-0 empty-state branch

  - [x] 8.3 Re-run the exploration test from task 7 — it must now PASS
  - [x] 8.4 Confirm all existing `planner-full-cycle.spec.ts` tests still pass (preservation)

---

### Group C — E2E: Missing Flow Coverage

- [ ] 9. Add E2E test: Quick Find from pivot card shows TonightMenuCard immediately
  - Add to `pwa/e2e/home-recipe.spec.ts` in the existing `Planned Recipe Flow` describe block
  - Test name: `'Quick Find from pivot card shows TonightMenuCard immediately and calls assign API'`
  - Setup:
    - `setupCommonRoutes()` already called in `beforeEach` — empty schedule, assign returns `{ success: true }`
    - Override `fill-the-gap` to return one recipe: `{ data: [{ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Test Lasagna', image: '' }] }`
    - Track `assignCalled` flag on the assign route
  - Steps:
    1. Navigate to `/home`, wait for `tonight-pivot-card`
    2. Click `discover-btn`
    3. Wait for `quick-find-modal` to be visible
    4. Click `quick-find-select`
    5. Assert `tonight-menu-card` visible within 300 ms (optimistic)
    6. `await expect.poll(() => assignCalled).toBe(true)`
  - _Requirements: 2.5, 2.6_

- [ ] 10. Replace stub E2E test: Planner Quick Find for today → home shows TonightMenuCard
  - In `pwa/e2e/home-recipe.spec.ts`, replace the entire body of `'Planner assignment for today updates home page via todayStore without navigation'`
  - New test name: `'Planner Quick Find for today\'s slot → navigating to home shows TonightMenuCard'`
  - Setup:
    - Stateful schedule mock: before assign → empty; after assign → today's slot has the recipe (use `assignDone` flag)
    - Override `fill-the-gap` to return one recipe
    - Mock assign endpoint with `assignDone` flag
  - Steps:
    1. Navigate to `/planner`, wait for `day-card-0`
    2. Find today's card by `[data-date="${today}"]`, click `plan-meal-button`
    3. Wait for `pivot-sheet`, click `pivot-quick-find`
    4. Wait for `quick-find-modal`, click `quick-find-select`
    5. `await expect.poll(() => assignDone).toBe(true)`
    6. `await page.goto('/home')`
    7. Wait for `home-loader` to disappear (timeout: 5000)
    8. Assert `tonight-menu-card` visible
    9. Assert recipe name visible
  - SSR note: after navigating to `/home`, `todayStore.optimisticWriteAt` protects `currentRecipe` for 10 seconds — the menu card renders from store state without needing SSR to return the recipe
  - _Requirements: 2.7, 2.8_

- [ ] 11. Add E2E test: "Make This Tonight" → navigate to planner shows recipe in today's slot
  - Add to `pwa/e2e/home-goto.spec.ts` in the existing `todayStore (Group C)` describe block
  - Test name: `'"Make This Tonight" → navigating to planner shows recipe in today\'s slot'`
  - Setup:
    - Mock GOTO setting + status `ready`
    - Stateful schedule mock: before assign → empty; after assign → today's slot has the recipe
    - Mock assign endpoint with `assignDone` flag
  - Steps:
    1. Navigate to `/home`, wait for `confirm-goto-btn` enabled
    2. Click `confirm-goto-btn`
    3. `await expect.poll(() => assignDone).toBe(true)`
    4. `await page.goto('/planner')`
    5. Wait for `day-card-0`
    6. Assert `[data-date="${today}"]` contains `recipe-name` with `'Family GOTO'`
  - _Requirements: 2.1, 2.2_

---

### Group D — Prep Time: Contract → Backend → PWA

- [-] 12. Add `totalTime` to `ScheduleRecipeDto` — full vertical slice

  The `TonightMenuCard` currently shows a hardcoded `"30-45 mins"` pill. `totalTime` is already stored on the `Recipe` model (ISO 8601 duration, e.g. `"PT45M"`) and included in `RecipeDto`, but it is not in `ScheduleRecipeDto` — the object that flows through the schedule API and into `todayStore.currentRecipe`. This task adds it end-to-end.

  - [x] 12.1 Update `specs/openapi.yaml` — add `totalTime` to `ScheduleRecipeDto`:
    ```yaml
    ScheduleRecipeDto:
      properties:
        # ... existing fields ...
        totalTime: { type: [string, 'null'] }
    ```

  - [x] 12.2 Update `api/src/RecipeApi/Dto/ScheduleRecipeDto.cs` — add the property:
    ```csharp
    [JsonPropertyName("totalTime")]
    public string? TotalTime { get; set; }
    ```
    Also update the constructor/record if `ScheduleRecipeDto` uses a positional record — add `string? TotalTime` parameter.

  - [x] 12.3 Update `ScheduleService.GetScheduleAsync` in `api/src/RecipeApi/Services/ScheduleService.cs` — pass `@event.Recipe.TotalTime` when constructing `ScheduleRecipeDto`:
    ```csharp
    new ScheduleRecipeDto(
        @event.Recipe.Id,
        @event.Recipe.Name,
        $"/api/recipes/{@event.Recipe.Id}/hero",
        @event.VoteCount,
        RecipeService.DeserializeIngredients(@event.Recipe.Ingredients),
        @event.Recipe.Description,
        @event.Recipe.TotalTime   // ← add this
    )
    ```

  - [x] 12.4 Run `task agent:reconcile` to regenerate the Kiota PWA client from the updated OpenAPI spec. Verify `totalTime` appears on the generated `ScheduleRecipeDto` TypeScript type.

  - [x] 12.5 Add a `formatTotalTime` utility in `pwa/src/lib/imageUtils.ts` (or a new `pwa/src/lib/formatTime.ts`):
    ```ts
    /** Converts an ISO 8601 duration (e.g. "PT45M", "PT1H30M") to a display string (e.g. "45 mins", "1h 30m"). Returns null if input is null/empty. */
    export function formatTotalTime(iso: string | null | undefined): string | null {
      if (!iso) return null;
      const hours = iso.match(/(\d+)H/)?.[1];
      const mins = iso.match(/(\d+)M/)?.[1];
      if (hours && mins) return `${hours}h ${mins}m`;
      if (hours) return `${hours}h`;
      if (mins) return `${mins} mins`;
      return null;
    }
    ```

  - [x] 12.6 Update `HomeCommandCenter.tsx` — replace the hardcoded `prepTime="30-45 mins"` with the real value:
    ```tsx
    import { formatTotalTime } from '@/lib/formatTime';
    // ...
    <TonightMenuCard
      // ...
      prepTime={formatTotalTime(currentRecipe.totalTime) ?? undefined}
      // ...
    />
    ```
    `TonightMenuCard` already renders the pill conditionally (`{prepTime && ...}`) — if `totalTime` is null, no pill is shown.

  - [-] 12.7 Run `task agent:drift` — zero schema drift. Run `task review` — clean.

  _Files changed: `specs/openapi.yaml`, `ScheduleRecipeDto.cs`, `ScheduleService.cs`, generated PWA client, `HomeCommandCenter.tsx`, new `formatTime.ts`_

---

### Group E — Pivot Card Header Fix

- [ ] 13. Remove "Tonight's Menu" label and static prep-time pill from `TonightPivotCard`
  - File: `pwa/src/components/home/TonightPivotCard.tsx`
  - The pivot card is the *decision* card — it appears when no meal is confirmed yet. "Tonight's Menu" and "30-45 Mins" imply a meal is already set, which is wrong.
  - In the header `<div>`, change the `<h2>` to always render `"What's for Supper?"` regardless of `hasGoto`:
    ```tsx
    <h2 className="font-heading text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40">
      What&apos;s for Supper?
    </h2>
    ```
  - Remove the `{hasGoto && <span>30-45 Mins</span>}` pill entirely
  - No other changes — GOTO image, body text, and footer buttons are unaffected
  - Update the E2E test in `pwa/e2e/home-goto.spec.ts` that currently asserts `"Tonight's Menu"` is shown when a GOTO is configured — change it to assert `"What's for Supper?"` instead
  - **Done when:** pivot card always shows "What's for Supper?" with no prep-time pill; `task review` clean

---

### Group F — Final Validation

- [ ] 14. Checkpoint — all tests pass
  - `dotnet test` — all API service tests pass
  - `task review` — formatting, linting, typecheck, PWA tests pass
  - `task agent:drift` — zero schema drift
  - All tests in `planner-full-cycle.spec.ts`, `home-goto.spec.ts`, `home-recipe.spec.ts` pass

---

## Notes

- **Task 4 schema decision**: `calendar_events.recipe_id` is `NOT NULL REFERENCES recipes(id) ON DELETE CASCADE` in `api/database/schema.sql`, and `CalendarEvent.RecipeId` is `public Guid RecipeId { get; set; }` (non-nullable) in the C# model. Making it nullable would require a migration and is out of scope. **Decision: use `Guid.Empty` as a sentinel RecipeId for "ordered-in with no recipe" events.** The in-memory EF Core DB used in tests does not enforce FK constraints, so tests pass. The real Postgres DB would reject `Guid.Empty` as a FK violation — this is a known limitation accepted for this spec. A future migration to make `recipe_id` nullable is the clean long-term fix.
- The `TestWebApplicationFactory` uses an in-memory EF Core database — not Postgres. Behaviour is equivalent for these tests but note that some Postgres-specific query features (e.g. raw SQL, certain LINQ translations) may differ.
- The E2E tests in Group C use Playwright route mocks. They verify client-side behaviour (optimistic updates, store propagation) but cannot verify real backend persistence due to the Next.js SSR bypass constraint. The service tests in Group A are the persistence verification layer.
- Do not change `buildScheduleDays()`, `weekStore.init()`, or any API contract.
