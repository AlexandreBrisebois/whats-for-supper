# HOME-03 — Changed-plan recovery: requirements

## Status

**Implemented capability baseline.** Canonical owner of Home's skip/backup-plan dialog and its schedule operations.

## Current behavior

- **HOME-03-AC-01 — Start recovery.** The planned card opens `SkipRecoveryDialog`; its first step offers Ordering In or Pick Something Else. With no current recipe, Ordering In invokes `todayStore.markOrderedIn`.
- **HOME-03-AC-02 — Select replacement.** Pick Something Else opens HOME-02 Quick Find. A selected recipe is dialog-local `pendingRecipe`; Home then asks what to do with the original.
- **HOME-03-AC-03 — Original plan action.** Step two moves to tomorrow via `POST /api/schedule/move`, defers via `POST /api/schedule/defer`, or removes via `DELETE /api/schedule/day/{date}/remove`. Ordering In pre-applies skipped state and posts validation `{ status: 3 }`. Home refreshes week/today state and navigates to Planner for tomorrow/drop.
- **HOME-03-AC-04 — Apply replacement.** After a pick-else move/defer/drop, Home calls optimistic, unawaited `assignRecipe(pendingRecipe)`.

## Limitations and boundaries

- No pending lock, inline error, rollback, or retry exists; the handler only logs failure. Validation and subsequent plan operations are independent requests, not a transaction.
- Assignment's `displacedRecipe` is not shown; defer's `message` becomes a toast if present. Browser date/day index can differ from SSR server date near a day boundary.
- HOME-02 owns Quick Find candidates; `ScheduleService` owns schedule conflict/destination policy. Contracts: move, defer, remove, validate, and assign schedule routes.
