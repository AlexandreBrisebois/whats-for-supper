# Proposal

Approved implementation direction, based on `e433b12ad51d11812841107c9be792681fad23fb` after dependency PR269. Product decisions are settled; implementation and qualification are tracked in tasks.md. The version 5 draft package and version 18 review draft are the source artifacts; the settled contracts below govern this change.

## Why

Retain overlooked household interest without changing working votes. Existing source evidence and comparison are in the consolidated review; no research establishes a four-week optimum.

## Outcome and Scope

Capture positive recipe/week aggregates on safe close, including selected recipes; touched-only revotes, privacy, indefinite retention and operational recovery. Existing early votes and recipe/member live meanings remain. The primary close-only flow snapshots available round votes before clearing. Record API-only purge compatibility C1 separately; it does not require a new product decision or checkpoint in the normal flow.

## What Changes

Add positive aggregate storage and close/restore invariants. Strengthen close retry/concurrency behavior without turning live votes into persistent preferences. Versioned backup addition and demo reset coverage are required; no history screen or hard-reset UI.

## Capabilities

### New Capabilities

- `weekly-household-interest`: distinct owner defined by its delta.

### Modified Capabilities

- `planning-lifecycle`: focused delta; preserve unchanged canonical requirements.
- `data-backup-and-recovery`: focused delta; preserve unchanged canonical requirements.
- `demo-household`: focused delta; preserve unchanged canonical requirements.

## Impact

See design.md for existing owners and exact seams. Runtime contract owner is `specs/openapi.yaml`; no API edits occur in this draft. Dependencies: history capture precedes ranking; cooldown consumer behavior requires rotation state. All three can be reviewed independently. WFS-BL-009 remains deferred. Future insights/seasonality and hard history reset are outside this package.
