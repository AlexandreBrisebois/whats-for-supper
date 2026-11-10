# Design

## Context and Existing Ownership

`GroceryRecomputeService` groups by normalized name/unit but persists checks under DisplayName; `GroceryList.mutateExtra` focuses the Edit button after checks as well as edits. `GroceryCheckCoordinator` and current PostgreSQL concurrency tests own single-instance ordering. Reuse them; do not infer cross-replica durability.

## Decisions and Tradeoffs

Positive incompatible-unit continuation depends on the same saved ingredient rows
and scheduled occurrences, not observed recipe/name membership. The approved
sequence extracts the coherent canonical identity/guarded-publication prerequisite
before grocery closure, as reviewed in
[the prerequisite boundary](../canonical-ingredient-correction/grocery-prerequisite-review.md).
Grocery stays open; conservative lineage and split/merge fences remain until the
real saved-row path is qualified. No companion completion follows from extraction.

Persist opaque IDs and per-row versions independent of labels; use a stable legacy demand identity initially and canonical food identity later. Preserve only proven continuing-row identity; new structural split/merge groups start unchecked under Alex’s approved rule. Exact range comparison is current.min > checkedBaseline.max, with scalars treated as degenerate intervals. Baseline is captured on unchecked→checked and does not advance when overlaps/decreases preserve the check; 2–3→3–4→4–5 therefore resets on the final update rather than escaping through adjacent overlap. Unknown→known preserves the check, removes review state/copy and requires no special acknowledgement. This favors preserving human intent when purchase amount is unprovable.

Keep category controls visually and interactively aligned with the existing extra tag control. Normal rows mutate ingredient/food category scope across applicable rows; extras mutate one occurrence. UI parity does not authorize merging those mutation scopes.

## First Observable Slice

Three same-name water rows in distinct buckets plus a same-name extra → check one → real item API/PostgreSQL reread and stateful mock browser shows only that row checked. Touch/pointer checking never focuses Edit; keyboard keeps focus on the initiating checkbox without viewport jump while sort order changes. If a projected extra disappears, use a stable adjacent list control without scrolling, not a remote Edit action.

Alex subsequently approved preserving cups, teaspoons and tablespoons as independent units, normalizing equivalent English/French aliases within each family without automatic metric or cross-family conversion. The shared contract and C47 own this rule; historical 240/15/5 ml test assumptions are superseded.

## State, Concurrency and Recovery

Use the shared proposed item/bulk DTOs, absolute week, row/list versions and mutation IDs. Mutations and recompute use fresh persisted checks at one coordinated processing position. Per-row UI intent is serialized; stale failures cannot undo a later successful toggle. Commit-before-notification semantics remain. Proven increase compares to the baseline saved with the last unchecked→checked transition and resets once; a check after it captures the newly acknowledged demand and survives unchanged replay. Recompute, duplicate true writes and bulk entries that remain true never advance the baseline. New identities cannot inherit stale true values merely because their names match.

## Compatibility, Rollout and Reversal

Requires a reviewed row-ID/client fence and the migration companion's fresh-list upgrade contract. Alex confirms there will be no active grocery list during update and the next list will be new. Create new recipe-derived rows unchecked with no copied old-name checks or baselines; preserve historical lists/check data and extra occurrence history. Do not build a one-time ambiguous active-check conversion or shopping review UI. If assessment contradicts the no-active-list condition, stop/report rather than discard data. This is not permission to reset household state.

## User Experience

Retain sorting, aisle collapse, contributors, existing subtotal/freshness and error behavior. Remove prior-check review messages in both locales, markers and acknowledgement handling entirely, with no replacement badge/space/copy. Existing brief proven-increase list feedback stays separate. Check actions never open or focus category/edit controls. Phone/tablet, keyboard, 200% EN/FR and actual pointer tests establish visual behavior.

See the shared [dependency/conflict review](../canonical-ingredient-correction/review.md) for approval and release order, and [acceptance corpus](../canonical-ingredient-correction/acceptance-corpus.md) for preservation cases. Proposed API/schema details have one owner in [contracts.md](../canonical-ingredient-correction/contracts.md).


## Proposed display-only slice — known amounts without units

Current `GroceryList.tsx` `formatQuantityHint` returns no hint when `unitText` is absent, and `GroceryList.test.tsx` deliberately enforces that policy. Canonical amounts already allow an independently missing unit. The proposed change is rendering eligibility, not a correction to the supplied totals or permission to infer count semantics from a bare value.

The approved implementation reuses that formatter and the existing localized known-subtotal path. A trusted amount is sufficient to render; a usable unit supplies the existing suffix, and a missing/blank unit supplies none. Complete amounts remain parenthesized; incomplete rows reuse `{{amount}} known` / `{{amount}} connus` exactly once in the existing amount position. Retain current scalar/range precision and trailing-zero removal. Missing amounts remain quiet. No API/schema/generated-client, quantity arithmetic, grouping, unit conversion, food mapping, catalogue, check baseline, list version or source-disclosure change is planned.

The first observable outcome is a loaded row with trusted amount two and no unit showing `(2)` instead of silently omitting it. A known incomplete subtotal remains explicitly partial in either locale. A display change must cause no mutation/recompute request or row/check transition. It can ship independently of bilingual qualification and does not justify combining French/English or incompatible-unit rows.

Trade-off: bare amounts retain useful information but remain ambiguous about the absent unit. Keeping them hidden preserves the old policy but discards known information. Inventing piece/clove/litre or merging rows would change purchase meaning and is excluded. Preserve the already-qualified test consolidation; use focused formatter/component coverage and one existing grocery browser owner rather than a new screenshot or recovery matrix. This bounded display slice is implemented and locally qualified as recorded in tasks.md; it does not establish acceptance of the other grocery or bilingual work.
