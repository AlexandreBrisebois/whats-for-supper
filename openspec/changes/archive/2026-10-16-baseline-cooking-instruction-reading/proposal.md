# Proposal

## Why

The preparation draft needs the existing reading journey accounted for. Extract structured/legacy parsing, focused navigation and the effective single-page flag without asserting durable progress.

## What Changes

- Add supported instruction representations and presentation rules.
- Add focused and effective-flag-enabled single-page navigation and in-memory recipe bookmarks.
- Record language, accessibility and device limits in the cooking plan, BSL-cooking-004–007.

## Capabilities

### New Capabilities

- `cooking`: Additional disjoint ADDED requirements for the same absent main cooking capability introduced by baseline-cooking-entry-preparation; review after that predecessor.

### Modified Capabilities

None.

## Impact

Documentation only. Read-only CooksMode → recipes adapter/generated recipe detail → existing library content owner, plus stepParser, instructionPresentation, plannerStore and featureFlagStore. No server progress operation exists in this path. Member preferences owns effective feature selection and language preference policy; cooking consumes the effective flag and current content. No new architecture or implementation decision; optional design omitted. See docs/openspec-baseline/cooking.md for all scenario mappings, unsupported mixed/malformed inputs and A34 limits.
