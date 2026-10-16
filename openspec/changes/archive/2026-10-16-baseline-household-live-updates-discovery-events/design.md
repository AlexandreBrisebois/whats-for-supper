# Design

## Context

See proposal.md for motivation. The first observable slice is saved vote → counted likes → attempted vote publication → named-frame output → parsed hook → matching planner count and Discovery offer. Smart defaults and fill-the-gap extend that shared transport path. BSL-household-live-updates-009/011 records evidence, source identities and test substitutions.

## Goals / Non-Goals

**Goals:** Document shared fan-out, nested-week gate, pending-slot merge and freshness signals. **Non-Goals:** Adopt vote/consensus algorithms, ranking, Search promotion policy or recommendation results as shared delivery policy; implement defects or qualify runtime behavior.

## Decisions

- Reuse existing household-live-updates capability and its process-local transport/exclusion requirements. No main requirement is modified. Recipe-discovery and recipe-search have no accepted main requirements yet; do not invent owner references or extract their policy here.
- Keep vote trigger arithmetic in evidence. DiscoveryService saves vote, counts Like rows, publishes vote_updated without request exclusion, then computes family size and conditionally publishes week-zero smart defaults when count equals threshold or threshold-minus-one. This is a resulting-count check, not proof of a transition; no vote-purge publisher was found. Repeated boundary counts can publish again. Defining threshold and ranking remains recipe discovery's work.
- Hook forwards vote identity/count to week then Discovery. Week changes nested recipe.voteCount, not pending _voteCount. Discovery actual code locks front and sorts the full tail by voteCount then queueOrder; older comments describing only positions 1–3 are stale. Do not specify that domain ranking here. Store assertions inspect interest updates, unknown recipe no-op, front retention and position-4+ movement.
- Hook smart-default gate uses nested defaults.weekOffset strictly, ignoring outer weekOffset. Store has another offset gate defaulting absent to zero, but handler rejects absent nested offset before it reaches that fallback. ApplySmartDefaultsUpdate protects persisted/status-three slots, maps preSelectedRecipes by index, clears withdrawn pending suggestions and has no independent voting-open gate. Record this limitation without introducing a new eligibility assertion.
- Fill-the-gap uses ScheduleService actual assignment/removal/unscheduled-cooking branches. Discovery generations advance globally and per supplied week. QuickFindModal subscribes to per-week value and attempts fetch only after initial completion/newer version; latestFetchId rejects stale completions. Discovery page subscribes globally, waits for loaded nonempty stack and attempts category refetch. Failed fetch logs; no guaranteed later retry. Search promotion generation advances on slot/week/fill events and page guards stale promotion data; ranking, refresh result and UI behavior remain owned by Search. Shared spec claims signal invalidation only.
- Compare payloads with OpenAPI event fields, DTO JsonPropertyName mappings and generated models. Raw hook parsing bypasses Kiota; required union discriminator remains absent on incremental frames. Do not repair or claim contract parity (U95/HLU-U01).

## Risks / Trade-offs

- Missing publisher for declared discovery_nudge → exclude that event, retain HLU-U04; do not infer behavior from generated/schema declarations or stale store comments.
- Partial handler completion, mismatched weeks and failed consumer fetches → retain U97/U98/U101 and HLU-U02/03. Signals are not result freshness or convergence evidence.
- Mocked assertions can overstate delivery → publisher MemoryStream tests establish only byte assertions; ScheduleIntegrationTests mocks publisher/uses InMemory; hook tests replace stores/EventSource; QuickFindModal tests stub APIs/store versions; none ran this session.

## Migration Plan

Documentation only. Strict change/all validation, durable full-scenario mapping, preservation review and explicit-path task verify precede handoff. No application deploy or migration applies; leave the draft for human review and separate promotion.

## Open Questions

None blocks these conditional assertions. Runtime transport, multi-device application and owner-policy qualification remain deferred under A34.
