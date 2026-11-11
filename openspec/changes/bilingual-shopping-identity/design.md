# Design

> **Release disposition — 2026-11-10:** Deferred from the first dependable-portions release. Do not schedule catalogue adoption, cross-language merging or mapping/category APIs as baseline prerequisites; retain these requirements for their later release. Existing human protection and any persisted references remain preservation obligations. See the [accepted baseline](../canonical-ingredient-correction/proposal.md).

## Context and Existing Ownership

`IngredientNormalizer`, `UnitNormalizer`, `AisleMapper`, `CategorizeIngredientsProcessor` and `GroceryRecomputeService` currently use normalized raw supply names. Canonical publication replaces stale evidence reads; identity mapping is saved at import/correction, never guessed per grocery refresh. See [dataset evaluation](sources.md).

## Decisions and Tradeoffs

App-owned IDs outlive upstream code changes. Confirmed preparation variants can share an ID; purchase qualifiers keep fresh/canned, salted/unsalted, dietary and product forms separate. A food ID is not a row ID: grams and volume may remain separate shopping rows. Missing translation keeps source shopping spelling and deterministic fallback key. Do not publish unvalidated EN/FR labels as facts or strip accents blindly when they create collisions.

A curated initial vocabulary and safe fallback is preferable to a large permissive-but-noisy automatic crosswalk. AI can propose at ingestion; source links, exact relation, qualifiers and collision tests determine acceptance, not confidence alone. Private manual corrections never auto-publish as global aliases. Pin dictionary revision; changing a label alone does not change row/check identity. Mapping changes re-run structural continuity policy with explicit affected-set review, not silent global merges.

## First Observable Slice

Import fixture onion diced, onion sliced and verified oignon émincé associations → saved IDs/provenance → real API/PostgreSQL → deterministic grocery grouping in EN then FR. Fresh and canned tomato remain separate. Spy on provider boundary and assert zero calls for read/recompute. Category correction preserves manual scope and crosses real persistence/recompute plus method-sensitive mocks.

## State, Concurrency and Recovery

Canonical contentRevision guards recipe shopping corrections; categoryRevision guards household aisle overrides. Catalogue release/revision is separate from recipe content and cannot silently rewrite saved mappings. Multiple source aliases for one match key or conflicting manual categories remain unresolved until reviewed. Backup preserves the referenced identity revisions and protected corrections without requiring upstream network access.

## Compatibility, Rollout and Reversal

Depends on canonical quantities/association and dependable row identity; reuses their schemas. Keep initial normal category key endpoint until the explicit food-scoped contract is approved, then move known mappings under a guarded adapter and retain fallback-key correction for unresolved identities. A mapping release has affected row/alias/category manifests and can be disabled without deleting human corrections. No dataset dependency is added during planning.

See the shared [dependency/conflict review](../canonical-ingredient-correction/review.md) for approval and release order, and [acceptance corpus](../canonical-ingredient-correction/acceptance-corpus.md) for preservation cases. Proposed API/schema details have one owner in [contracts.md](../canonical-ingredient-correction/contracts.md).
