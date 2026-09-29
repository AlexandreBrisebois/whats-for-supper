# Conservative ingredient normalization

> **Archived — historical reference only.** These requirements are not an
> active work queue or current authority. See [archive guidance](../README.md).

> **Retired 2026-09-29 at owner request.** This planned package was archived
> without revalidation. Its recorded task status and scope are preserved as
> historical evidence; archive placement does not mark any task complete.

## Goal

Merge mechanically equivalent ingredient spellings within the same language so
that compatible quantities aggregate into one grocery line. Recipe source text
is never rewritten. A word that could change the purchased product remains part
of the identity.

The normative meanings used below are defined in [ontology](ontology.md).

## Scope

Included:

- A conservative, deterministic upgrade to `IngredientNormalizer`.
- Grocery aggregation using the resulting normalized key and existing compatible
  unit buckets.
- Compatibility for existing `ingredient_categories`, manual aisle
  reclassification, persisted grocery lines, and checklist state.
- Focused API tests proving permitted merges, required separations, and state
  preservation.

Excluded:

- Cross-language aliases or translation, including `apple` / `pomme`.
- LLM, network, fuzzy matching, stemming, lemmatization, synonym lookup, or a
  registry/schema/API/PWA redesign.
- Removal of amounts, units, recipe instructions, alternatives, or product
  descriptors from source text.
- Ingredient-category workflow changes, rebuild jobs, deployment work, and
  category-management UX changes.

## Requirements

### CIN-1 — Conservative normalization

`IngredientNormalizer.Normalize(sourceName)` SHALL remain deterministic,
locale-invariant, and non-empty only when its nonblank source input contains a
nonblank ingredient name.

In addition to the existing case, diacritic, and whitespace handling, it MAY
canonicalize only these mechanical forms:

1. equivalent straight/curly apostrophes and hyphen glyphs;
2. redundant punctuation and registered-trademark marks that do not remove a
   token; and
3. the explicit optional plural suffixes `(s)` and `(es)` attached to a word or
   separated from it only by whitespace, together with that word's exact,
   explicitly enumerated written plural form.

The initial enumerated optional-plural rules are `pita(s)` / `pitas`,
`tomato(es)` / `tomatoes`, and `zucchini(s)` / `zucchinis`. Each pair produces
the specified singular key. Adding a pair requires a test and an approved spec
update. `huile d'olive` / `huile d’olive` is a permitted typography equality.

The normalizer SHALL NOT use a general trailing-`s` rule or remove, translate,
or infer words. It SHALL retain every product, freshness, preservation, fat,
salt, flavour, colour, cut, preparation, cooked-state, packaging, alternative,
amount, unit, and instruction token. Therefore `blueberries`, `fresh
blueberries`, and `frozen blueberries` remain distinct; so do `salted butter`
and `unsalted butter`.

### CIN-2 — Same-language boundary

Equal normalized keys are a lexical equality only. They do not establish a
cross-language or semantic alias. The implementation SHALL NOT merge a pair
merely because it is a translation, apparent synonym, or related grocery
product.

The existing recipe/source language is not required for CIN-1 mechanical
normalization. Any future language-specific lexical rule requires a separately
approved spec and an explicit language source; it must not be inferred from a
name during grocery recomputation.

### CIN-3 — Existing grocery and category behavior

`GroceryRecomputeService` SHALL continue to use the normalized key for its
existing category lookup and group only by `(normalizedKey,
normalizedUnitBucket)`. It SHALL make no LLM or network call.

Existing `ingredient_categories` rows and the manual reclassification endpoint
remain valid. If a new normalization rule would make a legacy category key
unreachable, the implementation SHALL perform a compatibility lookup using the
legacy key before falling back to `AisleMapper`; it SHALL NOT silently discard or
replace a manual category.

### CIN-4 — Stable output and checklist safety

For equal aggregation keys, emitted display name, section, unit, recipe-ID
ordering, and line ordering SHALL be deterministic regardless of database or
recipe input order.

The existing `grocery_state` contract remains keyed by the emitted display name;
this spec does not introduce `groceryStateKey`. When a new mechanical rule
merges two formerly separate lines in an existing week, recomputation SHALL map
their prior checked states to the emitted line as checked only when every
predecessor line was checked. Missing prior state counts as unchecked. It SHALL
remove obsolete predecessor state entries atomically and publish the resulting
state through the existing SSE mechanism. A recompute that does not create a new
merge shall preserve current state unchanged.

## Acceptance

1. Existing case, diacritic, and whitespace equality remains unchanged.
2. Approved mechanical forms such as curly/straight apostrophes and explicit
   optional plural notation aggregate only with compatible units.
3. `blueberries`, `fresh blueberries`, and `frozen blueberries` are three
   separate grocery identities; `salted butter` and `unsalted butter` are
   separate too.
4. `broccoli` and `brocoli`, `apple` and `pomme`, and other cross-language
   pairs remain separate.
5. A pre-existing manual category remains applied when a new normalized key has
   a legacy-key match.
6. Reordered source input produces identical grocery output.
7. When a new merge replaces two existing grocery lines, a checked result occurs
   only if both predecessor lines were checked; the persisted state and
   `grocery_updated` event agree.
