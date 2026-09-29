# Design: Conservative ingredient normalization

> **Archived — historical reference only.** This design is not an active work
> queue or current authority. See [archive guidance](../README.md).

> **Retired 2026-09-29 at owner request.** This planned package was archived
> without revalidation. Its recorded task status and scope are preserved as
> historical evidence; archive placement does not mark any task complete.

## Ownership and flow

```text
unchanged recipe supply name
  -> conservative IngredientNormalizer.Normalize
  -> current normalized-key category lookup (legacy-key fallback when needed)
  -> group by normalized key + normalized unit bucket
  -> deterministic existing display name + existing grocery_state key
  -> schedule snapshot / existing SSE
```

The source name remains the recipe fact. The normalized key is an internal,
conservative aggregation key, not a translation, canonical ingredient ID, or
claim that two terms mean the same thing.

## Normalization algorithm

Keep the current NFD diacritic folding, invariant lowercasing, trimming, and
whitespace collapse. Add a small ordered transform set:

1. normalize apostrophe and hyphen typography to their ASCII equivalents;
2. remove the registered-trademark character and punctuation separators while
   retaining the surrounding tokens; and
3. recognize only the enumerated pairs `pita(s)` / `pitas`, `tomato(es)` /
   `tomatoes`, and `zucchini(s)` / `zucchinis`, and normalize each pair to its
   stated singular key.

The implementation must express every optional-plural transformation as a test
case. It must not add broad singularization, token deletion, prefix/suffix
matching, or fuzzy similarity. Parenthetical alternatives and descriptive text
remain unchanged.

Quantity/unit extraction and removal are intentionally out of scope: the
current list contains names such as `400 g spaghetti`, but safely interpreting
them requires a structured recipe parser rather than a normalization rule.
Likewise, utensils and recipe instructions are import-quality issues, not
ingredient aliases.

## Aggregation and state

`GroceryRecomputeService` continues its current batch category lookup and
`(normalizedKey, unit bucket)` aggregation. It must explicitly order source
entries before selecting the display name and order output lines/recipe IDs
before serializing them.

Before persisting a newly recomputed list, it compares the prior line identities
and the current `grocery_state`. If multiple old lines now contribute to one
line, it replaces their state entries with the new displayed line's state:

```text
merged checked = every predecessor line is explicitly checked
```

This is conservative: it never marks an unpurchased item as bought. The grocery
state update and recomputed list are saved atomically; an existing
`grocery_updated` event carries the replacement state after commit.

## Category compatibility

`ingredient_categories` remains the existing normalized-key section cache; no
columns or tables change. A legacy normalizer is retained only as a lookup
compatibility path. When the new key lacks a row but its legacy key has one, use
that row's section. Manual records are never overwritten or deleted by this
feature. A future, separately authorized migration may consolidate equivalent
cache keys after a data review.

## Verification

- Unit tests for every permitted transform and every protected descriptor.
- Grocery recomputation tests for permitted same-key aggregation, incompatible
  units, deterministic output, category legacy-key fallback, and no network/LLM
  dependency.
- Schedule/integration tests for the conservative merged-state transition and
  its SSE payload.
- Existing category reclassification regression coverage and `git diff --check`.
