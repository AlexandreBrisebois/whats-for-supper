# SSE and asynchronous React state

Start with the relevant requirement, actual regression assertion and implementation.
Do not replace established guards with a universal ref/counter recipe. Trace only
the mechanism affected by the task; local invalidation and server freshness differ.

| Mechanism | Source and regression navigation (repository-relative) |
|---|---|
| Authoritative session state | `openspec/specs/household-live-updates/spec.md`: authoritative snapshots, reconnect reconciliation and stale projections. `pwa/src/store/discoveryStore.ts`: `refreshSession`/`applySession`. `pwa/src/store/votingSession.test.ts`: older/duplicate revisions, changed incarnation, pending HTTP versus newer SSE, superseded malformed reads, failed-read freshness, other-week suggestions and coalesced refreshes. |
| Discovery invalidation/optimistic votes | `pwa/src/app/(app)/discovery/page.tsx`: invalidation effect and refetch guards. Adjacent `page.test.tsx`: empty-stack restoration, cooled-card removal and an older response not resurrecting a swiped card. |
| Transport reconnect | `pwa/src/hooks/useScheduleStream.ts` (`onopen` reconciliation) and `pwa/e2e/voting-session-live.spec.ts`: fixture-gated isolated reconnect/two-member scenarios. Inspect required fixtures before selecting a run; their existence is not pass evidence. |

## Choose the guard for the mechanism

- An invalidation generation requests work; it is not an authoritative revision or
  an event identity. A repeated transport frame may increment a local counter again.
- Session freshness uses server incarnation/revision and the owning round/week.
  Unexpected incarnations require an authoritative read before adopting a baseline;
  superseded HTTP reads must not replace newer accepted stream state.
- Readiness must cause the consumer to re-evaluate when initialization completes.
  A ref mutation alone does not trigger rendering/effects. Loaded-empty data can be
  ready: do not restore a `recipes.length === 0` early return that blocks repopulation.
- Reconciliation must preserve optimistic local mutations while rejecting stale
  responses. Inspect the existing generation/vote guards and coalescing before editing.

Cover only affected arrival orders with controlled promises/events and real stores
where integration matters. Assert accepted state, ignored stale/duplicate data and
observable completion separately; avoid claims that one dependency list eliminates races.
If older spec wording conflicts with current intent/regressions, surface the conflict
for reconciliation rather than silently changing contracts or copying an obsolete recipe.

## Browser transport fixtures

`route.fulfill()` ends an SSE response; EventSource may reconnect and replay its body.
Test intentional replay/reconciliation explicitly or use the existing fixture's
transport controls. A local counter guard cannot deduplicate replayed server events.
`pwa/e2e/home-race.spec.ts` disables an unrelated stream with HTTP 204 while checking
optimistic assignment/reload; it does not qualify reconnect behavior. Keep mocked
arrival-order evidence separate from fixture-gated live transport qualification.
