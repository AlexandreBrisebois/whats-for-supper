# PLAN-05 — Automatic schedule maintenance: requirements

## Status

- **Status:** Implemented capability baseline.
- **Kind:** Capability baseline; behavior-first.

## Outcome

The recurring Dreaming workflow marks overdue planned/locked meals as cooked and reschedules itself; it does not itself create future schedule suggestions.

## Implemented behavior

- **PLAN-05-AC-01 — Scheduling.** Startup `DreamingWorkflowSeeder` creates a pending Dreaming instance at the next `DREAMING_CRON_UTC` occurrence (default `0 6 * * *`) unless a Dreaming instance is already Pending or Processing. The `reschedule` Dreaming task starts the next instance after report completion using the same cron expression.
- **PLAN-05-AC-02 — Overdue finalization.** `dreaming.yaml` invokes `FinalizeOverdueMeals`, whose processor calls `ScheduleService.FinalizeOverdueMealsAsync`. It selects calendar rows before the injected-clock date that have a recipe and status Planned or Locked, marks them Cooked, recalculates each affected recipe’s `LastCookedDate`, and publishes affected week snapshots.
- **PLAN-05-AC-03 — Preserved states.** Future dates, recipe-less ordered-in/Skipped entries, AwaitingConsensus entries, and already Cooked rows are outside the query and remain unchanged. No rows means no persistence or events.
- **PLAN-05-AC-04 — Workflow sequence.** Dreaming also prunes workflows, starts backup/maintenance/search-reconciliation work, materializes recipe-search filters after overdue finalization, generates a report, then reschedules. `FinalizeOverdueMeals` has no browser route or user-triggered retry.
- **PLAN-05-AC-05 — Suggestions boundary.** Smart defaults are calculated on demand by `ScheduleService.GetSmartDefaultsAsync`/voting events; Dreaming does not seed or curate future planner proposals. Search filter materialization consumes post-finalization cooked history, but that is `plat-03-recipe-search-indexing` work.
- **PLAN-05-AC-06 — Shared visibility.** Finalization publishes `week_updated` per affected week. The current browser stream’s connected event is week 0 and `weekStore` applies events only to the currently loaded week.

## Limitations and non-goals

- A workflow failure is handled by the generic workflow engine; this packet found no feature-specific user notification or manual retry surface.
- The update transaction saves events before recalculating affected recipe last-cooked dates; no explicit idempotency key is exposed beyond selecting non-Cooked statuses on later runs.
- Cron timing is configuration/clock dependent; this baseline makes no delivery-time guarantee.
