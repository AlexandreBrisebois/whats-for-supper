# HOME-03 — Changed-plan recovery: design

## State and integration

`HomeCommandCenter` holds `closed`, first step, Quick Find (optional pick-else intent), and second step with intent plus `pendingRecipe`. `SkipRecoveryDialog` presents numbered steps and emits named actions; it never mutates schedule state.

Tomorrow calculates Monday-based indexes and posts a push move, using week 1 for Sunday rollover. Next Week posts source date/recipe ID to defer. Drop deletes the source date. `ScheduleController` delegates to `ScheduleService`. After each awaited original-plan operation, Home initializes `weekStore` and syncs `todayStore`; replacement assignment is a separate background write. Stream `slot_updated`/`week_updated` can also mutate both stores, with no recovery-operation correlation.

## Failure behavior and evidence

The handler catches and logs all failures; pre-applied Ordered In state is not undone. Defer maps missing source to 404 and conflicts to 409 in the controller, but this UI does not present them. Evidence: `HomeCommandCenter.tsx`, `SkipRecoveryDialog.tsx`, `todayStore.ts`, `weekStore.ts`, `planner.ts`, `ScheduleController.cs`, `ScheduleService.cs`, `specs/openapi.yaml`, `HomeCommandCenter.test.tsx`, `SkipRecoveryDialog.test.tsx`, and Home E2E specs.
