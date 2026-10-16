# Proposal

## Why

Incremental discovery signals already reach browser stores but are absent from the promoted shared baseline. Extract their conditional receipt and invalidation consequences without owning discovery eligibility or ranking policy.

## What Changes

- Document vote-event fan-out to loaded planner and Discovery consumers.
- Document nested-week filtering and pending-slot application of received smart defaults.
- Document fill-the-gap publication boundaries and global/per-week invalidation signals, including Search freshness invalidation.
- Record BSL-household-live-updates-009/011 evidence and qualifications; produce extraction tasks only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `household-live-updates`: missing shared delivery consequences for discovery events and freshness signals.

## Impact

Documentation only across DiscoveryService/ScheduleService → publisher/manager → raw EventSource → week/Discovery/Search stores → consuming pages and QuickFindModal. Recipe discovery owns votes, consensus, ranking and candidate selection; recipe search owns promotion eligibility and presentation; meal-planning owns assignment/date policy. These owners are not created by this change. No runtime, API, generated client, tests, configuration, promotion or archive. Preserve U95–U101/A34 and local HLU qualifications. No blocking product decision remains; unsupported guarantees are excluded.
