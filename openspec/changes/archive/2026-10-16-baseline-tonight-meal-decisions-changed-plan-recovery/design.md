# Design

## Context

See proposal.md — Why. Existing Home recovery spans local state, independent HTTP operations and two stores, requiring a cross-layer evidence design. This draft changes documentation only.

## Goals / Non-Goals

**Goals:** Preserve observed caller-specific order and cancellation-before-action behavior, referencing existing mutation owners.

**Non-Goals:** No Planner guard port, new transactions, retry UX, expected-version protocol, date fix or runtime qualification.

## Decisions

- First trace: Home menu → SkipRecoveryDialog → Home recovery union state → generated status validation/move/defer/delete SDK → approved schedule paths → ScheduleController → ScheduleService → CalendarEvents saves, grocery recompute and publication → weekStore.init(0), Today sync and caller navigation. Use source and assertions together; mocks do not prove the production chain.
- Reuse accepted meal-planning requirements for legacy validation, explicit movement source, skipped-source preservation, protected explicit-date defer, date-delete and assignment lifecycle. Define only Home’s consequence/order. Do not duplicate server calendar, eligibility, grocery or live-delivery policy.
- Order In applies local Skipped before awaiting validation, preserving recipe association on the server until move/defer; Drop in that branch does not delete. Pick Else retains the replacement but identifies the original from currentRecipe at action time. Its assignRecipe call returns void and posts in the background; do not copy Planner’s awaited replacement and retry memory requirements.
- Tomorrow uses week zero plus local weekday and Sunday targetWeekOffset one; defer uses explicit local date but server-current next-week availability. Preserve these differences rather than inventing a shared timezone guarantee.
- Failure ends at the awaited boundary. Early validation/move/defer/delete success is not compensated if later work fails. Recovery closes before week init, so a later initialization failure does not universally leave the dialog open. No pending lock, sequence/version precondition or completed-disposition retry memory exists in Home.

## Risks / Trade-offs

- [Partial validation/disposition/assignment] → TM-U07 retains no atomicity, rollback or safe retry; background assignment failure is distinct from the awaited catch.
- [Repeated activation or changed current recipe] → TM-U08 records lack of an in-flight guard and captured-original guarantee; do not assert concurrency safety.
- [Local date versus server week] → TM-U01 retains Sunday/midnight mismatch, despite explicit source index and defer date.
- [Different stores and received update guards] → TM-U02/TM-U09 retain possible suppressed local offers and nonconfirmed sync; no immediate convergence promise.

## Migration Plan

No application migration/deployment. Validate the selected sequence, inspect scoped documentation verification and stop with drafts for human review. Acceptance, promotion, archival and runtime/database qualification remain deferred.
