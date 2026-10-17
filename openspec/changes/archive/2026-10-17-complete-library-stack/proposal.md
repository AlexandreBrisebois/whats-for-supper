# Proposal

## Why

WFS-BL-010: backward wrap joins the first and last pages and disables prefetch, omitting middle recipes and displaying a loaded-array index as the full-deck position.

## Outcome and Scope

Every recipe in a stable filtered library must be reachable in either direction with a correct ordinal. Preserve list mode, detail return, eligibility and existing API ordering. Offset pagination cannot promise a snapshot under concurrent server mutations.

## What Changes

- Preserve page positions and fetch missing adjacent pages during traversal.
- Keep the current card on fetch failure and provide retry.
- Discard requests from a departed collection generation as necessary to keep the new page cache coherent; this overlaps WFS-BL-011 and will be reconciled only to tested scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: complete stack traversal, global positions and failure recovery.

## Impact

Browse page, stack state/action bar as necessary and focused unit/browser fixtures for 126/180 IDs. No API, ranking, database or dependency changes.
