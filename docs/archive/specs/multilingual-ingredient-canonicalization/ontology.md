# Ontology: Conservative ingredient normalization

> **Archived — historical reference only.** This ontology is not an active work
> queue or current authority. See [archive guidance](../README.md).

> **Retired 2026-09-29 at owner request.** This planned package was archived
> without revalidation. Its recorded task status and scope are preserved as
> historical evidence; archive placement does not mark any task complete.

These terms define specification meaning. They do not introduce runtime types.

| Term | Meaning |
| --- | --- |
| Source name | The ingredient string supplied by a recipe. It is preserved verbatim and remains the recipe fact. |
| Display name | The deterministic source-derived name emitted on a grocery line and used by the existing checklist-state contract. It is not a translation. |
| Normalization | A deterministic lexical transform that removes only mechanical spelling/typography variation. It is not semantic understanding. |
| Normalized key | The internal result of normalization, used for current category lookup and grocery aggregation. Equal keys permit aggregation only after unit compatibility is confirmed. |
| Legacy key | The key produced by the pre-change normalizer. It exists only to retain access to an existing category-cache row while the new key is adopted. |
| Mechanical variation | Case, diacritic, whitespace, equivalent apostrophe/hyphen typography, non-token punctuation, trademark mark, or explicit optional-plural notation. |
| Descriptor | A source token that may change what a shopper buys: freshness, preservation, salt, fat, flavour, colour, cut, preparation, cooked state, packaging, alternative, amount, unit, or instruction. Descriptors are identity-bearing in this spec. |
| Same-language equality | Equality produced by the conservative lexical rules without translation or synonym reasoning. It does not require language detection for the approved mechanical rules. |
| Cross-language alias | Two names that refer to the same product in different languages, such as `apple` and `pomme`. It is explicitly out of scope. |
| Semantic alias | A synonym or inferred equivalent product. It is explicitly out of scope, even within one language. |
| Compatible unit bucket | The existing `UnitNormalizer` result that permits quantities to be summed. Different buckets remain separate grocery lines. |
| Predecessor line | A persisted grocery line from before a recompute that now contributes to one newly merged line. |
| Conservative checked-state merge | The rule that a new merged line is checked only when every predecessor line is explicitly checked; absent state is unchecked. |
| Category cache | The existing `ingredient_categories` lookup from normalized key to grocery section. It is not an alias registry. |
