# Proposal

Approved implementation direction, based on `e433b12ad51d11812841107c9be792681fad23fb` after dependency PR269. Product decisions are settled; implementation and qualification are tracked in tasks.md. The version 5 draft package and version 18 review draft are the source artifacts; the settled contracts below govern this change.

## Why

Make cooked breaks reversible and understandable. Existing source evidence and comparison are in the consolidated review; no research establishes a four-week optimum.

## Outcome and Scope

Cooked cooldown defaults to four complete calendar weeks. At successful Dreaming evaluation, let W be the current deployment-calendar Monday and N the positive integer week setting (default 4). Cutoff = W.AddDays(-7 * N). A non-null cooked date on or after cutoff is recent, including the current partial week; a date before cutoff has aged out. For W = 2026-10-12, September 14 is recent and September 13 has aged out. At W = October 19, September 14 has aged out; restoration still waits for successful Dreaming. This can exceed 28 elapsed days and is not calendar-month arithmetic.

Human Discovery OFF records Human provenance and remains off until explicit Human ON. Dreaming and AI cannot erase or reactivate that intent. Human ON clears the human exclusion and effective cooked suppression immediately, subject to supper suitability and the separate current-plan visibility guard; it is not a permanent cooldown exemption. The next successful Dreaming evaluation may suppress it again. Legacy unknown OFF remains Unknown, is not backfilled Human, and may be restored by ordinary Dreaming reconciliation. No session-pause state or lifecycle is required.

## What Changes

Persist distinct cooldown/manual/suitability reasons and reconcile within existing Dreaming. Explain controls and eventual consistency in the Family Guide. Explicit unsuitable Human ON returns a validation error without mutation; omitted/null values preserve intent and legacy unknown OFF remains reconcilable.

## Capabilities

### New Capabilities

- `recipe-rotation`: distinct owner defined by its delta.

### Modified Capabilities

- `scheduled-maintenance`: focused delta; preserve unchanged canonical requirements.
- `recipe-discovery`: focused delta; preserve unchanged canonical requirements.
- `recipe-editing`: focused delta; preserve unchanged canonical requirements.

## Impact

See design.md for existing owners and exact seams. Runtime contract owner is `specs/openapi.yaml`; no API edits occur in this draft. Dependencies: history capture precedes ranking; cooldown consumer behavior requires rotation state. All three can be reviewed independently. WFS-BL-009 remains deferred. Future insights/seasonality and hard history reset are outside this package.
