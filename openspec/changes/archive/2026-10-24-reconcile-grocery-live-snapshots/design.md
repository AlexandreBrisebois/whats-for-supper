# Design

## Context and Existing Ownership

ScheduleDays.GroceryState is already a dictionary; StreamController and ScheduleStreamPublisher serialize it directly. useScheduleStream parses the wire object without generated-client decoding. weekStore.applySnapshot currently extracts only additionalData after its accepted week/move guards; initialization already supports generated GET dictionaries.

## Decisions and Tradeoffs

Normalize only at applySnapshot's existing extraction expression by preferring additionalData then the direct map. Both input paths converge here and existing guards remain authoritative. This avoids hook-specific adaptation or a new abstraction. No contract, state or persistence addition is needed.

## First Observable Slice

Dispatch actual JSON connected and week_updated payloads through useScheduleStream into the real week and planner stores in focused integration tests; observe grocery lines and boolean checks, then reconnect with an empty map. Store tests separately retain generated GET compatibility and week/move preservation boundaries. EventSource is mocked; browser/service delivery remains separate qualification.

## State, Concurrency and Recovery

No new concurrency policy. Wrong-week snapshots remain rejected, move echoes remain confirmation-only, and active/unconfirmed moves defer the entire snapshot. Null/absent dictionaries retain prior checks; an explicit empty object clears them.
