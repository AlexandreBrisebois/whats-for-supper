# Proposal

Approved implementation direction, based on `e433b12ad51d11812841107c9be792681fad23fb` after dependency PR269. Product decisions are settled; implementation and qualification are tracked in tasks.md. The version 5 draft package and version 18 review draft are the source artifacts; the settled contracts below govern this change.

## Why

Recover overlooked ideas through existing choice surfaces. Existing source evidence and comparison are in the consolidated review; no research establishes a four-week optimum.

## Outcome and Scope

Use the four-complete-week signal across Discovery, Library Explore, blank Browse, typed Search and Quick Find/Replace. Quick Find uses eligible live-liked first, historical liked-but-unselected second, then existing Discovery fallback, max five unique recipes; other surfaces augment existing keys. No shelf, badge or universal ranker. Current-week selected recipes are excluded from Discovery using existing week events; no global historical-vote cancellation is introduced.

## What Changes

Add purpose-specific historical ranking and explicit continuation stability. Quick Find priority intentionally changes, with a full Search escape even when empty. Preserve existing relevance, live counts, ratings, consensus and meaningful recency priorities elsewhere. No-history parity excludes separately accepted cooldown and unavailable-candidate safety.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `weekly-household-interest`: focused delta; preserve unchanged canonical requirements.
- `meal-assignment`: focused delta; preserve unchanged canonical requirements.
- `recipe-discovery`: focused delta; preserve unchanged canonical requirements.
- `recipe-library`: focused delta; preserve unchanged canonical requirements.
- `recipe-search`: focused delta; preserve unchanged canonical requirements.

## Impact

See design.md for existing owners and exact seams. Runtime contract owner is `specs/openapi.yaml`; no API edits occur in this draft. Dependencies: history capture precedes ranking; cooldown consumer behavior requires rotation state. All three can be reviewed independently. WFS-BL-009 remains deferred. Future insights/seasonality and hard history reset are outside this package.
