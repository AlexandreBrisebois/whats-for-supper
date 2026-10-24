# Proposal

## Why
Recipe detail logs initial read failures but continues displaying loading indefinitely; a failed Recycle Bin read appears empty. Failed move and restore actions have no visible feedback.

## What Changes
- Give detail read failures a visible message and Retry; keep Close available and suppress stale recipe content after an ID change.
- Distinguish bin read failure from successful empty results, with Retry.
- Retain failed restore entries and show feedback; show failed move feedback without closing detail.
- Preserve existing successful operations and permanent purge behavior.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `recipe-library`: detail failure recovery and stale-response protection.
- `recipe-recycle-bin`: read, move and restore failure feedback.

## Impact
Only RecipeDetailSheet, RecycleBinSheet, English/French recovery copy and focused component/browser tests. Existing GET recipe detail/trash, DELETE recipe and POST restore contracts, API wrappers and generated clients remain authoritative and unchanged. No Search, voting or permanent-purge changes.
