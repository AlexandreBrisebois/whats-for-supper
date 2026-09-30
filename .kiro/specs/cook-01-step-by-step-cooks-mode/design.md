# COOK-01 — Step-by-step Cook's Mode design

## Integration map

`RecipeDetailSheet` and `HomeCommandCenter` own entry visibility and mount `CooksMode`. The overlay calls `getRecipe` for `GET /api/recipes/{id}`, then feeds `recipeInstructions` to `parseRecipeSteps`. `plannerStore` owns only `cookProgress`; component state owns fetched detail, parsed/fallback steps, ingredient checks, edit UI, celebration, and report context.

Instruction edits use `updateRecipe` and the existing recipe `PATCH /api/recipes/{id}` contract; there is no Cook's Mode controller. Completion returns through the optional callback: Home delegates to `todayStore.markCooked`, which posts `{ status: 2 }` to `POST /api/schedule/day/{date}/validate`; recipe-detail has no equivalent callback. Schedule SSE reconciliation is therefore a Home/today concern, not Cook's Mode state.

## State flow

```text
entry recipe id -> GET recipe -> parser or fallback -> local step/progress UI
final step -> optional Home callback -> schedule validate -> today/stream state
instruction edit -> PATCH recipe -> local detail + reparsed steps
```

The feature flag selects paged versus single-page presentation; it does not change the recipe instruction representation. COOK-02 is mounted as a nested sheet and returns updated recipe detail without changing the progress map.

## Failure and recovery

Initial detail failure yields fallback steps and still permits navigation. Edit failure retains the editor and supplies retry; save does not lock the non-single-page Save control through its `editPending` state. There is no error state for the initial fetch, no cancellation of old requests, and no recovery for a failed Home cooked validation beyond later store/server updates.

## Evidence seams and dependencies

`CooksMode.test.tsx` covers detail loading, parsing/fallback, progress, flag variants, edits, and reporting entry; `stepParser.test.ts` covers representations. `RecipeDetailSheet.test.tsx` covers detail entry. `todayStore` tests and schedule API tests own cooked validation. Contracts are recipe GET/PATCH and schedule-day validate in `specs/openapi.yaml`. This packet depends on LIB-02/LIB-03, Home/today and schedule state, and COOK-02 without duplicating their ownership.
