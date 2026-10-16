# Proposal

## Why

The accepted shared connection baseline covers initial and reconnect snapshots but leaves incremental schedule receipt and move echoes unspecified. Extract the supported consequences without adding delivery or freshness guarantees.

## What Changes

- Add shared slot receipt, date filtering, week-event dispatch and move-echo reconciliation requirements.
- Reuse accepted snapshot, Today and process-local delivery requirements without repeating them.
- Record trigger, payload, browser and store evidence in BSL-household-live-updates-007/008/011 and retain U95–U101 plus the incremental qualifications in the capability plan.
- Produce documentation extraction and validation tasks only; no application implementation, promotion or archival.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `household-live-updates`: add missing incremental schedule-event consumer consequences and move-echo handling.

## Impact

Planning documents only. Inspected seams: ScheduleController → ScheduleService → SseEventPublisher → SseConnectionManager → named raw frames → useScheduleStream → week/Today stores. Meal-planning owns operation eligibility, dates and non-cooking policy; capture and background-processing retain their accepted ownership. No API/client/test/configuration changes or runtime qualification. Attempted publication, emitted bytes, received frames and applied state remain distinct. No unresolved decision blocks these conditional source-supported assertions.
