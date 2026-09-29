# Conservative ingredient normalization

> **Archived — historical reference only.** This document is not an active work
> queue or current authority. See [archive guidance](../README.md).

> **Retired 2026-09-29 at owner request.** This planned package was archived
> without revalidation. Its recorded task status and scope are preserved as
> historical evidence; archive placement does not mark any task complete.

Archive transaction validation on 2026-09-29 found no incoming reference to the
former active path; all five retained documents carry the historical-reference
notice, and whitespace checks passed. No implementation, API, or runtime
validation was run because this change archives documentation only.

This specification improves same-language grocery aggregation without translating,
rewriting, or semantically interpreting recipes.

It is deliberately narrow:

1. `IngredientNormalizer` removes only mechanical spelling and typography
   differences that cannot change what is bought.
2. Grocery recomputation aggregates only source names whose conservative
   normalization keys are equal and whose units are compatible.
3. Existing category lookup, aisle reclassification, API shape, PWA rendering,
   and checklist state remain supported.

It does **not** merge English and French names, call a model, introduce aliases,
translate labels, change grocery identity to a new key, or parse recipe prose.

See [ontology](ontology.md), [requirements](requirements.md), [design](design.md),
and [tasks](tasks.md).
