# Design

## Context

See proposal.md — Why. Overdue finalization has workflow and startup callers but no dedicated household HTTP action. The remaining direct reads return suggestions, not assignments.

## Goals / Non-Goals

**Goals:** Close BSL-meal-planning-034–036 and the controller-wide coverage inventory.

**Non-Goals:** No scheduler SLA, actual cooking proof, discovery selection/threshold policy, grocery checks/quantities or history UI extraction. No application changes.

## Decisions

- First slice: dreaming.yaml finalize-overdue-meals → registered FinalizeOverdueMealsProcessor → ScheduleService.FinalizeOverdueMealsAsync → clock UTC date filter → transactional save/recalculate/save/commit helper → each distinct Monday schedule/publication. Startup RecipeSearchFilterBackfillService.InitializeAsync calls finalization before materialization; hosted StartAsync catches/logs errors. These entry points are evidenced, not a guaranteed daily run or retry SLA.
- Reuse background-processing “Select due pending tasks for processor dispatch”, “Record processor execution and successful task completion” and “Promote dependencies after successful task completion” for workflow execution. dreaming materializer declares depends_on finalization; recipe-search affinity/materialization internals remain outside planning.
- Reuse household-live-updates “Attempt incremental schedule publication after supported saves” for delivery limits. After finalization commit, publication can fail; subsequent invocation may find no overdue entries and will not replay missing snapshots. No convergence/repair guarantee is invented.
- Direct fill-the-gap and smart-defaults are planning API read boundaries. Trace controller/DTO/OpenAPI/generated builder, but leave service selection over RecipeMatches/DiscoveryRecipes/votes to discovery. No accepted discovery, grocery, cooking-history or Tonight main specs currently exist; record those ownership gaps rather than placeholders or invented references.
- Enumerate grocery PATCH routes as grocery-owned, including legacy whole-map replacement. Contract-only/mock-only routes are not positive application capabilities. Do not add one requirement per controller method merely for counts; shared accepted operations are referenced in the coverage matrix.

## Risks / Trade-offs

- [Automatic Cooked means calendar inference, not user confirmation] → Label the trigger and selected states; do not claim a cooking event was observed.
- [Clock date, transaction provider and missed publications] → MP-U11; no household-local midnight/atomic side effects/replay guarantee.
- [Mock endpoints and contract vocabulary mismatch] → MP-U12 and inherited U122; no universal parity or runtime enforcement claim.

## Migration Plan

No deployment. Finish cross-slice semantic/mapping/source review, strict selected/full inventory validation and explicit complete-path documentation verification. Human acceptance and separately authorized promotion remain the exact next lifecycle action; do not archive or claim baseline-complete.
