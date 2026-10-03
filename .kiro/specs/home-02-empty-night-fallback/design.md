# HOME-02 — Empty-night fallback: design

## Ownership and flow

`HomeCommandCenter.tsx` derives emptiness from `todayStore`, then calls `familyStore.loadActiveGoTo`. `TonightPivotCard.tsx` is presentation-only and enables confirmation only for `status === 'ready'`. `todayStore.assignRecipe` creates a local recipe then invokes `assignRecipeToDay`.

`QuickFindModal.tsx` owns cards, index, loading, and a fetch-generation ID. It uses `getFillTheGap`; `useScheduleStream.ts` increments discovery invalidation on `fill_the_gap_invalidated`, and an open modal re-fetches only after initial completion. `GoToController.GetActive` returns 404 if `GoToService` finds no ready configured entry. `ScheduleController.AssignRecipe` owns persistence; its response can contain a displaced recipe but Home ignores it.

`recipe_ready` marks a local ID in `gotoStore`; Home only uses that signal to reload an already-pending active item. Selection, detail hydration, and assignment remain separate requests with no compensation.

## Evidence

`HomeCommandCenter.tsx`, `TonightPivotCard.tsx`, `QuickFindModal.tsx`, `todayStore.ts`, `familyStore.ts`, `gotoStore.ts`, `useScheduleStream.ts`, `planner.ts`, `GoToController.cs`, `GoToService.cs`, `ScheduleController.cs`, `specs/openapi.yaml`; `TonightPivotCard.test.tsx`, `QuickFindModal.test.tsx`, `HomeCommandCenter.test.tsx`, `home-goto.spec.ts`.
