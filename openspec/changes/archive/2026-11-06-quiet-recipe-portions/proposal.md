# Proposal — quiet portions and consistent screens

## Why
Recipe detail repeats portion explanations during ordinary reading. Home Tonight also passes original ingredient strings where its adjacent Cook uses dated quantities, so the same supper can display different amounts.

## Outcome and Scope
Stage 1 is independently releasable using existing storage and projection contracts. Keep the agreed quiet reading design and align Home's assigned ingredient list with its captured dated Cook context. No canonical schema, new correction flags, numeric editing, parser extension or automated repair is required here.

## What Changes
- Keep one effective Ingredients count and 2/4/6 temporary controls; reveal basis and temporary meaning after deliberate preview/original inspection.
- Use **Set recipe portions** to open the existing saved-basis editor. Preserve Save/Cancel/failure recovery.
- Remove repeated ordinary date/count and generic detail amounts-review copy with no replacement cue. Keep genuine errors, actual preparation facts and grocery warning semantics.
- Put original inspection in overflow by default and inline after changed preview, with one list and one return; retain the source date in grocery original review.
- Read Home's assigned ingredients through the existing shared dated projector; preserve original standalone reading and stale/error guards.

## Capabilities
### New Capabilities
None.

### Modified Capabilities
- `recipe-library`: quiet default, deliberate preview/original reading and existing basis correction entry.
- `supper-servings`: quiet detail feedback and consistent Home/dated consumer projection using current storage.

## Impact
RecipeDetailSheet, ActionGearMenu, HomeCommandCenter/TonightMenuCard, existing API wrappers, shared method-sensitive mocks and EN/FR copy. Existing GET detail/ingredient-preview/ingredient-projection contracts remain sufficient; no generated DTO or migration change is planned.

[Stage boundaries and retained decisions](scope-stages.md) link the dependent [ingredient correction change](../../canonical-ingredient-correction/proposal.md) and [deferred automated repair](../../selective-ingredient-repair/proposal.md). Stage 1 does not solve structured numeric editing. Planning approval does not authorize implementation, deployment or DV reset.
