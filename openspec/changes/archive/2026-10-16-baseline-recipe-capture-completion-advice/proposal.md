# Proposal

## Why

Post-readiness name advice is implemented but not yet specified. Existing finalization wording also promises ordinary metadata writes that the current processor reserves for retained PDFs.

## What Changes

- Reconcile the two promoted finalization blocks with conditional database updates and publication attempts.
- Extract inline ready-name duplicate advice and the explicit request to discard the newly captured recipe.
- Reference library lookup/deletion and household event owners without duplicating their policy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-capture`: bounded completion handoff, inline duplicate advice and discard feedback.

## Impact

Documentation only. Evidence BSL-recipe-capture-022 in `docs/openspec-baseline/recipe-capture.md`. No implementation, contract, test, client, workflow or deployment edits; no promotion, archival or runtime qualification. Advice is session-bound and is not duplicate prevention or successful deletion in all states.
