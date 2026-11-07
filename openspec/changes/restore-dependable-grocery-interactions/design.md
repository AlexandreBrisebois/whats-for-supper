# Design

## Context and Existing Ownership

`GroceryRecomputeService` groups by normalized name/unit but persists checks under DisplayName; `GroceryList.mutateExtra` focuses the Edit button after checks as well as edits. `GroceryCheckCoordinator` and current PostgreSQL concurrency tests own single-instance ordering. Reuse them; do not infer cross-replica durability.

## Decisions and Tradeoffs

Persist opaque IDs and per-row versions independent of labels; use a stable legacy demand identity initially and canonical food identity later. Preserve only proven continuing-row identity; new structural split/merge groups start unchecked under the proposed shared contract. Exact range comparison proposed as new.min > old.max avoids treating overlap as proof of a larger requirement. Unknown→known preserves the check, removes review state/copy and requires no special acknowledgement. This favors preserving human intent when purchase amount is unprovable.

Keep category controls visually and interactively aligned with the existing extra tag control. Normal rows mutate ingredient/food category scope across applicable rows; extras mutate one occurrence. UI parity does not authorize merging those mutation scopes.

## First Observable Slice

Three same-name water rows in distinct buckets plus a same-name extra → check one → real item API/PostgreSQL reread and stateful mock browser shows only that row checked. Touch/pointer checking never focuses Edit; keyboard keeps focus on the initiating checkbox without viewport jump while sort order changes. If a projected extra disappears, use a stable adjacent list control without scrolling, not a remote Edit action.

## State, Concurrency and Recovery

Use the shared proposed item/bulk DTOs, absolute week, row/list versions and mutation IDs. Mutations and recompute use fresh persisted checks at one coordinated processing position. Per-row UI intent is serialized; stale failures cannot undo a later successful toggle. Commit-before-notification semantics remain. Proven increase resets once; a check after it survives unchanged replay. New identities cannot inherit stale true values merely because their names match.

## Compatibility, Rollout and Reversal

Requires a reviewed row-ID/client fence plus the migration companion's one-time check transition. The user confirms no shopping in progress; retain a transition manifest and present the actual ambiguous name→rows set. Recommend resetting only ambiguous recipe checks without inferring historical individual intent, preserving one-to-one checks and extra history. This recommendation is not accepted yet. Do not reset all household data or introduce a shopping review UI.

## User Experience

Retain sorting, aisle collapse, contributors, existing subtotal/freshness and error behavior. Remove prior-check review messages in both locales, markers and acknowledgement handling entirely, with no replacement badge/space/copy. Existing brief proven-increase list feedback stays separate. Check actions never open or focus category/edit controls. Phone/tablet, keyboard, 200% EN/FR and actual pointer tests establish visual behavior.

See the shared [dependency/conflict review](../canonical-ingredient-correction/review.md) for approval and release order, and [acceptance corpus](../canonical-ingredient-correction/acceptance-corpus.md) for preservation cases. Proposed API/schema details have one owner in [contracts.md](../canonical-ingredient-correction/contracts.md).
