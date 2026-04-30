# Feature: Grocery State Rehydration

## Intent

When a user opens the grocery checklist, their previously checked-off items are lost on page refresh or across devices because there is no `GET` endpoint to load persisted state. This feature adds `GET /api/schedule/{weekOffset}/grocery` so the `GroceryList` component can rehydrate from the server instead of always starting blank.

## Contracts & Routes

- **Existing**: `PATCH /api/schedule/{weekOffset}/grocery` — persists `Record<string, boolean>` to `WeeklyPlan.GroceryState` column. See `specs/openapi.yaml#/paths/~1api~1schedule~1{weekOffset}~1grocery`.
- **Missing**: `GET /api/schedule/{weekOffset}/grocery` — must be added to `specs/openapi.yaml`, the backend controller/service, and the generated PWA client.
- **Backend model**: `WeeklyPlan.GroceryState` (string JSON column) in `api/src/RecipeApi/Models/WeeklyPlan.cs`.
- **Backend service**: `ScheduleService.UpdateGroceryStateAsync` at `api/src/RecipeApi/Services/ScheduleService.cs:457`.
- **Backend controller**: `ScheduleController` at `api/src/RecipeApi/Controllers/ScheduleController.cs:77`.
- **PWA hook**: `useSchedule()` in `pwa/src/lib/api/schedule.ts` — exposes `updateGroceryState`; needs a companion `fetchGroceryState`.
- **PWA component**: `GroceryList` at `pwa/src/components/planner/GroceryList.tsx:26` — currently initializes state from local store only.

## Tasks

1. [ ] Add `GET /api/schedule/{weekOffset}/grocery` to `specs/openapi.yaml`. Response schema must match the existing PATCH response: `{ data: Record<string, boolean> }`. Run `task agent:drift` to confirm zero drift.

2. [ ] Write integration test in `api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs` asserting that a GET after a PATCH returns the same state. Follow existing test patterns (see `GroceryState_Persists_And_Can_Be_Retrieved` at line 200).

3. [ ] Implement `GetGroceryStateAsync` in `ScheduleService` and add the `[HttpGet("{weekOffset}/grocery")]` action to `ScheduleController`. Return `{}` (empty object) when no state has been saved yet (null `GroceryState` column). Run `task agent:test:impact`.

4. [ ] Regenerate the PWA Kiota client (`task agent:reconcile`) and add `fetchGroceryState(weekOffset)` to `pwa/src/lib/api/schedule.ts` using the new generated method.

5. [ ] Update `GroceryList` to call `fetchGroceryState` on mount and seed `plannerStore` before the local-initialization guard. Preserve the existing optimistic-toggle + revert-on-error pattern. Run `task review`.

## Risks & Questions

- **Empty-state behavior**: When `GroceryState` is null (week plan exists but grocery never touched), the GET should return `{}` — not a 404. Confirm this is acceptable before implementing.
- **Race condition**: The component calls GET on mount and PATCH on every toggle. If both in-flight simultaneously, the GET response could overwrite a newer PATCH result. Sequence the load so it only runs once, before any user interaction, and abort if already initialized from a PATCH response.
- **Client regeneration**: `task agent:reconcile` rewrites all generated files under `pwa/src/lib/api/generated/`. Confirm CI does not regress on the eslint-disable headers added in commit `aa16d0f`.

## Notes / Decisions

- 2026-04-30: Spec created. PATCH endpoint and persistence layer already exist; this feature is purely additive on both the contract and implementation side, making it a low-risk first validation target for the Kiro spec-driven workflow.
