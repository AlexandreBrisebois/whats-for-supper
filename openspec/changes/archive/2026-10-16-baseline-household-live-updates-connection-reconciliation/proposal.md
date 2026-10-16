# Proposal

## Why

Household journeys already consume a shared SSE connection, but the promoted baseline does not distinguish connection attempts, registration, snapshot emission, receipt and state application. Extracting this boundary makes the existing reconnection limits reviewable without promising recovery the implementation does not provide.

## What Changes

- Document existing app-shell connection construction, cookie transport, API access checks, registration, week-zero snapshot, framing, heartbeat and teardown.
- Document browser error/reconnect responsibility and conditional reconciliation of the displayed week and Today, preserving optimistic guards.
- Bound connection identity to immediate echo exclusion; record process-local delivery, concurrent-write limits, missing replay and unsuccessful reconciliation.
- Add evidence, source identities, complete requirement/scenario mappings and discrepancies to the durable baseline plan (A81; BSL-household-live-updates-001–005; U95–U101).
- Produce documentation-extraction tasks only. No application, test, contract, client, configuration or infrastructure changes; no runtime qualification, promotion, archive or successor slice.

## Capabilities

### New Capabilities

- `household-live-updates`: shared connection establishment, initial snapshot delivery and conditional reconnection reconciliation. CLI inventory confirms this capability is absent.

### Modified Capabilities

None. Reuse `household-identity` for shared access/member context, `recipe-capture` for readiness/failure notifications, `recipe-quality` for contextual polling/recovery and `background-processing` for workflow acceptance/retries. Domain-specific event mutation semantics remain with their journey owners.

## Impact

Documentation: this change's proposal, design, household-live-updates ADDED delta, extraction tasks and `docs/openspec-baseline-plan.md`. Inspected boundaries: app layout → `useScheduleStream` → native EventSource → `/api/stream` auth/controller → singleton connection manager and schedule read → raw frames → hook → week/Today/planner stores; Kiota request headers and publisher exclusion at the immediate echo boundary.

Source-supported, assertion-inspected baseline only. No durable events, replay, Last-Event-ID recovery, exactly-once delivery, global ordering, cross-replica broadcast, guaranteed reconnection, immediate freshness or complete convergence. U95–U101 record contract omissions, unlocked controller writes, native reconnect limits, guarded/stale state, grocery representation mismatch and substituted assertions. No unresolved product choice blocks this bounded draft; disputed guarantees are withheld. All promoted specifications and historical qualifications, including A34, A69, U01/U70–U94, remain intact.
