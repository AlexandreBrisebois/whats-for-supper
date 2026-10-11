# COOK-01 — Step-by-step Cook's Mode design

## Integration map

`RecipeDetailSheet` and `HomeCommandCenter` own entry visibility and mount `CooksMode`. The overlay calls `getRecipe` for `GET /api/recipes/{id}`, then feeds `recipeInstructions` to `parseRecipeSteps`. `plannerStore` owns only `cookProgress`; component state owns fetched detail, parsed/fallback steps, ingredient checks, edit UI, celebration, and report context.

Instruction edits use `updateRecipe` and the existing recipe `PATCH /api/recipes/{id}` contract; there is no Cook's Mode controller. Both completion controls call `todayStore.markCooked(viewedRecipeId)`, posting `{ status: 2, recipeId }` to `POST /api/schedule/day/{date}/validate` for the browser-local current date. `ScheduleService.ValidateDayAsync` updates that recipe's `LastCookedDate`, and updates the calendar event and publishes `slot_updated` only when its recipe matches. An unscheduled/different recipe updates history without altering the calendar and publishes `fill_the_gap_invalidated`. Missing/deleted recipes return 404. The success envelope is `{ data: { message, mealMarkedCooked } }`; the store changes today's status only when the server confirms completion and the current local recipe still matches. The optional callback is a post-save notification, not the persistence boundary. Schedule SSE reconciliation remains a Home/today concern.

## State flow

```text
entry recipe id -> GET recipe -> parser or fallback -> local step/progress UI
explicit completion -> recipe-specific validate -> conditional today/stream state
save success -> celebration -> optional notification -> close
instruction edit -> PATCH recipe -> local detail + reparsed steps
```

The feature flag selects paged versus single-page presentation; it does not change the recipe instruction representation. COOK-02 is mounted as a nested sheet and returns updated recipe detail without changing the progress map.

## Failure and recovery

Initial detail failure yields fallback steps and still permits navigation. Edit failure retains the editor and supplies retry; save does not lock the non-single-page Save control through its `editPending` state. There is no error state for the initial fetch or cancellation of old requests. Cooking completion guards duplicate submissions, disables the completion button while saving, and starts celebration/close only after success. Failure keeps the view open with a localized alert and re-enables retry.

## Evidence seams and dependencies

`CooksMode.test.tsx` covers detail loading, parsing/fallback, progress, flag variants, edits, reporting entry, recipe-specific completion, and failed-save recovery; `stepParser.test.ts` covers representations. `RecipeDetailSheet.test.tsx` covers detail entry. `todayStore.test.ts`, `cooking-contract.test.ts`, `ScheduleServiceTests.cs`, and `RecipeCookingIntegrationTests.cs` cover recipe identity, server confirmation, request serialization, history/rotation, and conditional scheduled-meal completion. `cook-mode-steps.spec.ts` covers recipe-detail completion with matching and different supper recipes. Contracts are recipe GET/PATCH and schedule-day validate in `specs/openapi.yaml`. This packet depends on LIB-02/LIB-03, Home/today and schedule state, and COOK-02 without duplicating their ownership.
