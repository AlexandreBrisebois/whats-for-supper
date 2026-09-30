# HOME-02 — Empty-night fallback: requirements

## Status

**Implemented capability baseline.** Canonical owner of the Home empty-night offer and its Quick Find entry.

## Current behavior

- **HOME-02-AC-01 — Empty state.** When `todayStore` has no recipe and is not cooked/skipped, `HomeCommandCenter` renders `TonightPivotCard` and loads `GET /api/goto/active`. A ready `200` shows “Make This Tonight”; missing or failed lookup leaves the no-GOTO pivot.
- **HOME-02-AC-02 — Selection.** Ready GOTO selection calls `todayStore.assignRecipe`; Discover opens Quick Find. Assignment changes Home immediately and fires `POST /api/schedule/assign` without awaiting a response.
- **HOME-02-AC-03 — Quick Find.** The modal fetches `GET /api/schedule/fill-the-gap?weekOffset=0`, shows recipe cards plus a library-search nudge, preserves `addToDay`/`weekOffset` in the search link, and refetches after `fill_the_gap_invalidated`.
- **HOME-02-AC-04 — Empty/pending GOTO.** No configured/ready GOTO offers profile setup, discovery, and Order In. The active endpoint returns ready entries only; the card has pending rendering and Home re-fetches on a local `recipe_ready` signal.

## Limitations and boundaries

- `loadActiveGoTo` maps all errors to no active GOTO. Assignment failure is logged only. A failed suggestions request is shown as “No recipes found.”
- Quick Find does not enforce the API's five-result maximum itself; Skip cycles from its nudge card to the first recipe rather than ending the stack.
- HOME-04 owns GOTO list, readiness, and selection policy; HOME-03 owns changed-plan recovery. Contract owners: active GOTO, schedule assignment/fill-the-gap, and `fill_the_gap_invalidated`/`recipe_ready` event shapes.
