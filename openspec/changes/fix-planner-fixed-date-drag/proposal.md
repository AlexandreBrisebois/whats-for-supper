# Proposal

## Why

Human designer feedback reports that moving recipes between days appears broken and that including dates in the draggable card obscures what moves. Source inspection confirms that the date is inside `Reorder.Item`, even though the store swaps meal content while restoring each slot's date. The reported interaction failure has not yet been reproduced.

## Outcome and Scope

Display a fixed left date column beside the seven meal slots. Drag only the recipe card; keep the source slot recognizable and show the candidate destination. Alex confirmed that dropping onto an occupied date swaps the two meals; dropping onto an empty date moves the recipe and leaves its source empty. Intermediate dates do not shift.

Keep the increment within the selected week and existing movement policy. Preserve hold-to-move, ordinary touch scrolling, keyboard movement, meal detail/pivot actions, pending-state distinctions, non-cooking content, movement request shape and snapshot reconciliation. Treat pointer cancellation or a drop outside a destination as cancellation without a move request. A handle belongs to movable recipe content, not an empty slot or a recipe-free non-cooking plan.

The baseline drag investigation and actual post-change movement checks are separate acceptance obligations. A clearer layout alone cannot establish that movement works. No runtime diagnosis or fix is claimed by these planning artifacts.

## What Changes

- Separate fixed date rows from draggable recipe surfaces and preserve readable alignment across card heights.
- Show source/destination feedback that communicates swap rather than list insertion.
- Make pointer movement target fixed slots rather than reorder whole dated rows.
- Retain existing API/store movement and failure behavior; cancellation discards only uncommitted preview.
- Replace weak drag visibility assertions with actual gesture, dated-content and request assertions, including keyboard and touch preservation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-rescheduling`: fixed-date drag presentation, target feedback and cancellation, preserving existing swap and commit behavior.

## Impact

- `pwa/src/app/(app)/planner/page.tsx`, `pwa/src/components/planner/PlannerDragHandle.tsx` and any small Planner-local presentation/session module extracted from them.
- Existing `weekStore.reorderLocally` / `commitMove` and Planner snapshot guards are reuse boundaries, not a new movement service. Touch their implementation only when the selected interaction needs it and regression evidence supports it.
- Page/handle/store unit tests and `pwa/e2e/planner.spec.ts`; existing non-cooking and voting acceptance protect nearby behavior.
- `pwa/e2e/mock-api.ts` owns browser schedule state and movement mocks. Verify its existing same-week path before relying on read-after-drop evidence; correct a demonstrated mismatch only within this accepted contract.
- No intended API, persistence, generated-client, dependency or cross-week behavior changes. Existing tokens and Lucide icons remain in use. Any new user-facing drag copy must have equivalent EN/FR values.

Independent of the existing badge-removal and return-arrow plans. Preserve those artifacts and reconcile shared Planner-file changes. Past/today styling, broader contrast repairs and grocery-view continuity are separate increments.
