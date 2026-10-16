# Design

## Context

See proposal.md for motivation. The first observable slice is saved grocery map → attempted publication → successful named-frame bytes → parsed event → matching loaded-week check replacement. Lifecycle dispatch shares the same manager and hook but hands presentation/recovery to existing journey owners. BSL-household-live-updates-010/011 records actual source/test evidence.

## Goals / Non-Goals

**Goals:** Close shared grocery/ready-hint/context-handoff coverage. **Non-Goals:** Own grocery aggregation, atomic toggling, readiness finalization, workflow retries or capture UI; qualify runtime behavior, fix defects, promote or archive.

## Decisions

- Reuse accepted connection/process-local output requirements and preserve U95–U101. Full map update and toggle save before PublishGroceryUpdatedAsync. Recompute publishes only changedState with nonnull publisher. Dictionary is raw event groceryState; hook applies it directly, unlike snapshot applySnapshot's additionalData lookup (U100). setGroceryState replaces, not merges; no sequence/revision guard or optimistic grocery protection exists. Comments calling toggle an atomic merge do not establish concurrent database safety.
- Use actual owner references. Recipe-capture “Finalize photo recipe readiness and broadcast completion”, “Inline transition to ready status upon completion” and “Persistent failure banner on workflow failure” own lifecycle and presentation; background-processing “Retain terminal task failure and pause its workflow” and “Classify automatic retry eligibility at the attempt boundary” own failure/retry state. This delta adds shared dispatch details, not new completion or failure rules. Recipe-quality “Address capture retry to the loaded workflow failure” owns the separate failure-list retry journey.
- Trace ready attempts without strengthening their owner. RecipeReadyProcessor returns without broadcasting for missing/already-finalized recipes; normal path saves ready/discoverable then records optional PDF readiness before attempting ready publication. File failure or later output failure does not roll back the save. Re-execution on already-ready data can skip publication. WorkflowWorker failure helper follows failure/pause and report handling; skips indexing, requires recipe identity, assembles optional partial name/image and catches/logs publication exceptions. Retryable task errors do not use that fatal helper. Lifecycle mechanics stay non-normative here where already owned/qualified.
- Hook ready handler obtains pending capture, removes/appends context only on a match, then markReady unconditionally if preceding calls return. Failure only removes/appends for pending match and never marks ready. Name selection uses nullish fallback, so empty strings are not replaced. Queue appends; pending removal generally suppresses later duplicate notifications for that identity, but is neither a durable deduplicator nor exactly-once processing. GOTO uses Set membership in session; it is not persisted readiness. No check-map/lifecycle replay is added.
- Follow consumers to observable state without extracting their UI policy. LibraryToast filters ready notifications; RecipeFailureBanner filters failures and uses workflow identity for retry, displaying friendly text rather than raw diagnostics. HomeCommandCenter subscribes to readyRecipeIds for active GOTO identity. CaptureStore/libraryStore/gotoStore are memory-only; reconnect connected schedule does not rebuild these queues. Existing capture/corrective polling remains owner-specific.

## Risks / Trade-offs

- Persisted state without emitted/received lifecycle update → retain HLU-U05 and A34. No guaranteed later notification or eventual convergence.
- Raw incremental dictionary differs from wrapped snapshots → retain U100 and HLU-U03; no claim that connected snapshot fully restores checks.
- Assertion gaps → ScheduleIntegrationTests verify mocked ready/grocery calls, GroceryRecomputeServiceTests verify a resulting map through mock publisher, WorkflowWorkerTests use EF InMemory/CapturingEventPublisher, hook tests replace transport/stores. SseEventPublisherTests does not cover recipe_failed/grocery frames in its current assertion set. These are inspected, not executed; no end-to-end live application claim.

## Migration Plan

Documentation only: complete mappings, strict selected/all validation and explicit-path task verify after final scope/preservation review. No deploy or migration applies. Stop at human review; acceptance/promotion and runtime qualification remain separate.

## Open Questions

None blocks supported shared dispatch. Database concurrency, native transport, real publisher-to-browser behavior and notification recovery remain unqualified under A34 and the recorded uncertainties.
