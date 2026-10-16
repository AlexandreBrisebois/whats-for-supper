# Design

## Context

See proposal.md for motivation. This extraction spans ScheduleController, ScheduleService, SseEventPublisher/manager, raw EventSource handlers and week/Today/Search stores. The first observable slice is saved validation → attempted slot publication → successful named-frame output → parsed receipt → a matching loaded date. These are separate success boundaries, not a transaction. BSL-household-live-updates-007/008/011 in the capability plan holds current source and assertion evidence.

## Goals / Non-Goals

**Goals:** Document only missing incremental consequences and distinguish request-ID exclusion from numeric move confirmation. Preserve the accepted 15/38 connection baseline verbatim.

**Non-Goals:** Reimplement calendar, assignment, voting, cooking or non-cooking policy; repair source/contract mismatches; add recovery or cross-device guarantees; execute application tests or services.

## Decisions

- Add requirements to the existing capability, rather than restating main snapshot rules. Main requirements “Reconcile only the displayed snapshot week”, “Defer day replacement during local moves”, “Preserve existing day content under snapshot merge guards”, “Apply available snapshot adjuncts conditionally” and “Preserve Today's recent optimistic recipe guard” continue to own ordinary reconciliation. Meal-planning “Project stored recipe and non-cooking read content” and “Publish a saved recipe-free slot before returning success” own their domain-specific consequences.
- Keep a source trigger catalogue in the plan. OpenVoting/Lock/Assign/Remove/Move/Defer/FinalizeOverdueMeals publish reread weeks at their actual boundaries. ValidateDay publishes slots except its unscheduled-cooking early return, which invalidates suggestions only. Missing/no-op operations and failed preceding steps do not establish publication. Cross-week MoveScheduleEventAsync publishes only the source snapshot; withhold a target-refresh guarantee. Defer separately publishes both distinct weeks when reached.
- Reuse named-frame transport and current-process exclusion semantics. Publisher anonymous objects contain lower-case payload keys but omit the approved union's required `type`. DTO JsonPropertyName attributes map nested schedules/recipes/non-cooking data. Hook JSON.parse bypasses Kiota; generated models contain ScheduleDays and additionalData grocery holder, but no incremental event models. Do not claim schema parity or change either contract or source (U95/HLU-U01).
- Record actual consumer order. Slot: Today if local date matches → week slot → Search invalidation. Week: applySnapshot(schedule, echoSeq) → Search invalidation → Today entry. No catch or rollback spans these calls. Slot updates have no move/drag guard, pending metadata may remain beyond the cleared marker, and lastSyncedAt/groceries do not advance on that path. Keep these limitations non-normative except the observable conditional state application.
- Echo handling precedes offset filtering and advances confirmedMoveSeq with Math.max; it returns without applying the supplied days/status/adjuncts. Deferred release requires equality (an echo beyond local sequence can leave deferral). Today still receives the echo's date entry if prior steps return; request-ID exclusion can mean the origin never receives an echo. Withhold automatic move confirmation/convergence claims.

## Risks / Trade-offs

- Contract discriminator drift and malformed data → retain U95/U97; describe conditional valid receipt, not schema repair or malformed-frame recovery.
- Partial publication or application after persistence → retain U96/U98/U101 and HLU-U01–03; no atomicity, ordering, replay, revision or eventual repair guarantee.
- Source-supported cases exceed asserted tests → label assertion inspection separately. Schedule tests use EF InMemory and mock publisher calls; publisher tests use real manager/MemoryStream bytes; hook tests replace EventSource and store methods. Store tests fabricate snapshots, dates and counters. No combination proves the live full path.

## Migration Plan

Documentation only. Validate this delta and all OpenSpec items strictly, reconcile complete plan mappings, review preservation and run task verify with every task-owned changed path. No deployment/migration applies. Stop at human review; acceptance and promotion remain separate.

## Open Questions

No blocking normative decision remains. Native transport, concurrent output, real database/auth, multi-device receipt/application and final convergence remain unqualified under A34/U95–U101.
