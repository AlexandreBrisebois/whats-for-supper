# Proposal

## Why

WFS-BL-004: recipe detail announces Saved before PATCH acknowledgement and compares edits against the original load, losing A→B→A restoration. Closing cancels undispatched notes.

## Outcome and Scope

Preserve exact notes through edits, failure, close and recipe switches within the current tab. Flush on departure; retain failed drafts for reopening and explicit retry. Do not promise survival after closing the browser, cross-device conflict resolution, or alter ratings.

## What Changes

- Track acknowledged notes separately from the draft and serialize saves per recipe.
- Show pending, acknowledged and retryable failure states honestly.
- Retain failed drafts and flush pending edits on departure without blocking navigation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-editing`: notes acknowledgement, ordering and draft recovery.

## Impact

RecipeDetailSheet, a focused notes state owner, existing updateRecipe wrapper and focused unit/browser tests. Existing PATCH shape and persistence semantics remain unchanged. Authorized with WFS-BL-010; separate ownership except shared validation.
