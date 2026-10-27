# Design

## Context and Existing Ownership

The week store owns occurrence reconciliation for extra events and schedule initialization, post-assignment refresh, refresh and snapshots. The review executed its current method/helpers in memory: unchecked version five disappears from a future view when checked version four arrives. Current-week and newer-checked controls distinguish the visibility-order bug from general version handling. Full grocery-shopping and household-live-updates specifications were reviewed during the preceding acceptance audit and remain applicable.

## Decisions and Tradeoffs

Keep one store-local reconciliation path. Restrict existing/incoming rows to the selected absolute occurrence ownership first, retaining checked incoming candidates from the current week for future views. Preserve pending IDs and select the newer occurrence before applying final future-view visibility. Reuse that path from events and every existing schedule entry point, rather than maintaining separate version rules.

Authoritative omission still removes a nonpending row; the payload has no collection generation or tombstone version that would justify a stronger absence-order guarantee. Missing/mismatched identity continues to use existing refresh/eligibility behavior. No server policy, payload or category logic is duplicated.

## First Observable Slice

Exercise the public store event method with future-week selection, loaded unchecked version five and incoming checked version four. Observe the intended failing assertion before implementation. Extend the same regression through schedule initialization, post-assignment refresh, sync and snapshot entry points using the existing generated-type builders/API boundary mocks. All-future offsets, accepted equal/newer checked state, pending updates/deletions, current/past views, wrong-week events and authoritative omission are preservation controls.

## State, Concurrency and Recovery

Resolve occurrence identity and week eligibility, then pending/version precedence, then visibility. A delayed checked representation cannot erase a newer unchecked occurrence. A winning checked occurrence disappears only from future projection; current-week checked history remains. Existing per-ID pending exclusions and navigation guards remain authoritative. Store tests establish deterministic state transitions, not live SSE delivery or physical keyboard behavior.
