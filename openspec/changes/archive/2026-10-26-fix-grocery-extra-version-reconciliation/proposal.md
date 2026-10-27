# Proposal

## Why

A future-week grocery view can lose a newer unchecked extra when an older checked event or schedule response arrives. The current reconciliation filters checked projections before comparing versions, contradicting the existing newer-version preservation requirements.

## Outcome and Scope

Compare occurrence versions before deciding future-week visibility for events and schedule reads/snapshots. Retain pending-operation protection and remove projected rows when an accepted equal-or-newer state is checked. Limit implementation to the week store and focused regression coverage; retain current/past-week behavior, recipe groceries and authoritative absence handling.

## What Changes

- Preserve a loaded version-five unchecked extra when a delayed version-four checked representation arrives in any future-week view.
- Exercise event, initialization, refresh and snapshot reconciliation, including pending and newer-checked controls.
- Add explicit regression scenarios to the existing grocery and live-update owners without changing their policy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `grocery-shopping`: Explicit delayed checked schedule-response scenario under occurrence version reconciliation.
- `household-live-updates`: Explicit delayed checked event scenario under newer local extra preservation.

## Impact

`pwa/src/store/weekStore.ts` and its existing tests own the correction. No OpenAPI, generated-client, server, persistence, dependency or UI-layout change is needed. Existing uncommitted audit/tooling/spec work and all historical incomplete-task markers are preserved. Sync/archive, commit and PR creation remain outside this slice. Browser/live SSE and physical Android qualification are separate from deterministic store tests.
