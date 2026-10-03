# PLAN-03 — Schedule movement and exceptions: requirements

## Status

- **Status:** Implemented capability baseline.
- **Kind:** Capability baseline; behavior-first.

## Outcome

A planner user can reorder a scheduled meal, carry it into a later week when a recovery flow requests it, remove it, or record an ordered-in/skipped day; shared schedule updates are reconciled without overwriting a local drag.

## Implemented behavior

- **PLAN-03-AC-01 — Drag move.** Reorder feedback swaps only the two affected local slots. On drag end, `commitMove` makes one `POST /api/schedule/move` request with `{ weekOffset, recipeId, fromIndex, toIndex }`; a request failure restores the pre-drag snapshot.
- **PLAN-03-AC-02 — Server move rules.** With default intent, the service swaps source and target event recipe/status/vote data. With `intent: push`, it finds the first empty date up to 14 days from the source-week Monday and shifts events; if none exists it falls back to swap. Cross-week push searches only the target week and silently returns when full.
- **PLAN-03-AC-03 — Exceptions.** A Recovery dialog can push Tomorrow/Next Week, call defer to the first available date from next Monday onward, or remove the source. Defer rejects `AwaitingConsensus` with HTTP 409 and returns 404 when the exact date/recipe no longer matches. A skipped source preserves its ordered-in placeholder and creates a new planned event at the destination.
- **PLAN-03-AC-04 — Ordered in and removal.** `POST /api/schedule/day/{date}/validate` status 3 creates a recipe-less Skipped event if absent. `DELETE /api/schedule/day/{date}/remove` deletes an existing event. Both update the stream; removal recomputes grocery data and invalidates Quick Find.
- **PLAN-03-AC-05 — Echo and concurrent move handling.** A browser move increments `localMoveSeq`; the auth layer sends it as `X-Move-Seq`, and `week_updated.echoSeq` confirms it. During drag/unconfirmed moves, a foreign snapshot is deferred; server status still updates. Other slot events only apply if their date is in the current loaded week.
- **PLAN-03-AC-06 — Scope boundary.** Assignment/replacement is PLAN-02; Cooked status and today UI are `home-01-tonights-meal-status`; weekly navigation is PLAN-01.

## Limitations and non-goals

- Direct move errors are silent except for rollback; plan-later logs its failure and does not show recovery UI.
- The service does not return a changed schedule from move/defer; clients depend on stream/refetch.
- Cross-week move publishes only the source-week schedule in `MoveScheduleEventAsync`; defer publishes both affected weeks.
