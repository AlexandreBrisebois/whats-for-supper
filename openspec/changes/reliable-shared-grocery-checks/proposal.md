# Proposal

## Why

Two household members checking different groceries should not erase each other's saved progress. Issue [#258](https://github.com/AlexandreBrisebois/whats-for-supper/issues/258) identifies a source-supported read/modify/write race, not a reproduced production incident; the current grocery specification explicitly guarantees sequential updates only.

## Outcome and Scope

On the user's confirmed single-instance deployment, overlapping recipe-derived item checks survive a fresh persisted read. Conflicting values for one key follow server processing order, not click time or FIFO arrival order. Existing full-map replacement and recomputation must participate because they write the same map, without changing their business semantics.

The user selected simultaneous grocery checks and explicitly excluded the separate overnight maintenance scenario. This is specification-only exploration: no implementation, merge, archive or application-contract edit is authorized here.

Excluded: planner/overnight-maintenance coordination, distributed queues or locks, grocery-extra versioning changes, canonical ingredient IDs, multilingual aliases, generic locking infrastructure, administrative restore/reset redesign, arbitrary throughput promises, and a new client revision/incarnation protocol. Durable saving and ordered publication attempts do not guarantee universal HTTP/SSE response freshness.

## What Changes

- Intentionally extend the sequential guarantee to overlapping single-instance item checks, retaining existing names, request shapes, explicit false values and success statuses.
- Coordinate every normal writer of the recipe-derived check map; recomputation preserves unrelated checks and its supported predecessor transitions.
- Keep success behind persistence, release coordination after failures/cancellation, and distinguish uncommitted work from a committed write whose acknowledgement or notification was lost.
- Order this mutation boundary's grocery publication attempts with its saves. Verify authoritative reread recovery without promising transport delivery or stale cross-channel response rejection.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `grocery-shopping`: persisted single-key concurrency, replacement compatibility, recomputation and recovery.
- `household-live-updates`: ordered grocery check-map publication attempts from coordinated writers.

## Impact

Source reviewed at `3d1bd68ea0965bb6df2c3689dd8f4aed1c6e598e`: `ScheduleController` item/full-map PATCH; `ScheduleService.ToggleGroceryItemAsync` and `UpdateGroceryStateAsync`; `GroceryRecomputeService.RecomputeForWeekAsync`; EF weekly-plan JSON persistence; `IScheduleEventPublisher`; PWA `GroceryList`, `plannerStore`, `weekStore`, `useScheduleStream` and method-sensitive E2E mocks. Reuse the host-local async gate/fresh-scope pattern in `VotingSession`, not its voting lock or domain ownership.

A future authorized implementation must reconcile the existing atomicity wording in `specs/openapi.yaml`, regenerate Kiota output and synchronize affected tests/mocks. This draft changes only its own OpenSpec change directory; canonical specs and shared configuration remain untouched.

