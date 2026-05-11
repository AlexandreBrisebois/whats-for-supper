# Requirements Document: CNF Search Augmentation

## Introduction

CNF ingestion gives the app the first implementation of a pluggable canonical food taxonomy: English and French food names, a stable `food_id`, Canada Food Guide group mapping, and per-100g nutrient values. The first CNF slice seeds this data, links `ingredient_categories` to `cnf_food_id`, improves FOP flags, adds bounded bilingual query expansion, and establishes provider strategy seams so future US, Swedish, or other food guide providers can be swapped in.

This spec is the next search-focused slice. It uses CNF identity to improve recipe search and grocery-list cleanup without translating recipe content:

- ingredient synonym expansion beyond English/French pairs,
- pantry-photo matching by canonical `cnf_food_id` instead of exact strings,
- explicit search reasons for ingredient alias matches,
- nutrition-aware search filters once CNF-backed FOP flags exist,
- grocery-list reconciliation under the user's locale when English and French ingredient rows map to the same canonical food.

This spec must not weaken the archived grocery invariant that raw recipe ingredient strings remain recoverable and recipe content stays in its original language. Provider identity is an additional semantic bridge used for cleaned-up grocery display, not an LLM translation step and not a rewrite of recipe ingredients.

**Dependencies:**
- `cnf-data-ingestion` Tasks 1-8 complete.
- Active food data provider strategy configured. Default is `CanadaCNF`.
- Health guidance settings available.
- `ingredient_categories.cnf_food_id` populated for common ingredients.
- `recipes.dietary_profile.fopFlags` reclassified from CNF where possible.
- Existing search contract drift is reconciled before new search DTO fields or reason sources are added.

---

## Glossary

- **CNF identity**: The `cnf_food_id` linked to an ingredient or pantry item. Multiple normalized keys such as `"ground beef"`, `"boeuf hache"`, and `"minced beef"` may point to the same CNF food.
- **Food data provider strategy**: The provider seam introduced by `cnf-data-ingestion`. CNF is the first provider; this spec must consume provider-facing interfaces where possible.
- **Health guidance setting**: The app setting that enables/disables user-facing health recommendations and dietary steering.
- **Alias expansion**: Query expansion that adds equivalent ingredient names for search ranking, e.g. `"minced beef"` -> `"ground beef"` and `"boeuf hache"`.
- **Pantry canonical match**: Pantry-photo ingredient and recipe ingredient match because both resolve to the same `cnf_food_id`, even if their strings differ.
- **Nutrition-aware filter**: A search filter that uses deterministic recipe nutrition flags/values, not an LLM, e.g. low sodium or diabetes friendly.
- **Health nudge**: Any user-facing health-oriented reason, warning, filter explanation, planner nudge, or search result annotation that encourages or cautions around a food choice.
- **Health nudge source**: A deterministic explanation category for why a health nudge exists. Initial values: `source-nutrition`, `estimated-from-ingredients`, `profile-rule`, `food-guide-group`, `unknown`.
- **Health nudge confidence**: A deterministic confidence category for a health nudge. Initial values: `high`, `medium`, `low`. Confidence is about data quality, not moral judgement.
- **Locale grocery reconciliation**: Grocery recompute behavior that groups equivalent ingredient rows by shared provider food identity and chooses the display label in the user's active locale, e.g. English recipes with `"chicken"` and French recipes with `"poulet"` produce one grocery line labelled `"chicken"` for English locale or `"poulet"` for French locale.
- **Active grocery locale**: The language used to display cleaned-up grocery ingredient names. It SHALL resolve from the existing default UI language configuration. `NONE` means no grocery-specific override and therefore follows the default UI language. It is independent from the recipe import language setting.
- **Search reason source**: `RecipeSearchReasonDto.source`, governed by `specs/openapi.yaml`.

---

## Requirements

### Requirement 1: Search contract reconciliation

**User Story:** As a developer, I want the search OpenAPI contract to match the implementation before adding CNF-powered search behavior, so new search features do not deepen schema drift.

#### Acceptance Criteria

1. `RecipeSearchReasonDto.source` in `specs/openapi.yaml` SHALL include every source the API can emit and SHALL reject undocumented sources in tests.
2. The current pantry-photo boost reason SHALL be reconciled: either the implementation emits the existing contract value `inventory-fit`, or the OpenAPI contract is intentionally changed to include `pantry-match`. The chosen value SHALL be used consistently in code, OpenAPI, mock data, and tests.
3. `RecipeSearchFiltersDto` SHALL be reconciled with OpenAPI. If `healthyOnly` remains supported by the API DTO, it SHALL be added to `specs/openapi.yaml`; otherwise it SHALL be removed from the DTO and service filter path.
4. Contract drift checks SHALL pass before any new reason source or nutrition-aware filter is added.

---

### Requirement 2: CNF alias expansion beyond bilingual names

**User Story:** As a user, I want search to understand common ingredient synonyms, so that “minced beef”, “ground beef”, and “boeuf hache” can find the same relevant recipes.

#### Acceptance Criteria

1. A CNF-backed alias expander SHALL accept the original search query and return at most 8 additional ingredient terms.
2. Alias expansion SHALL include:
   - localized names from the active food data provider (`food_name_en` and `food_name_fr` for Canada CNF),
   - deterministic static synonyms for high-value ingredient families,
   - CNF `food_id` equivalence when an input term resolves to a known `cnf_food_id`.
3. The initial synonym table SHALL include at minimum:
   - `"ground beef"` <-> `"minced beef"` <-> `"boeuf hache"`
   - `"chicken breast"` <-> `"poitrine de poulet"`
   - `"shrimp"` <-> `"prawn"` <-> `"crevette"`
   - `"scallion"` <-> `"green onion"` <-> `"spring onion"` <-> `"oignon vert"`
   - `"zucchini"` <-> `"courgette"`
   - `"bell pepper"` <-> `"sweet pepper"` <-> `"poivron"`
4. Expansion SHALL be additive. The original query remains part of ranking and telemetry.
5. Expansion SHALL be deterministic and local. It SHALL NOT call an LLM, translation API, or network service.
6. Expansion SHALL be bounded and deduplicated case-insensitively. Terms already present in the original query SHALL not be repeated.
7. If CNF data is empty or the expander fails, search SHALL behave exactly as it did before this spec.

---

### Requirement 3: Pantry matching by CNF identity

**User Story:** As a user searching from pantry photos, I want the app to find recipes using equivalent ingredients even when the pantry item and recipe use different language or synonym text.

#### Acceptance Criteria

1. Pantry-assisted search SHALL continue to accept the existing `pantrySnapshotId` flow. The OpenAPI request shape SHALL NOT change for this requirement.
2. When a pantry snapshot contains inferred ingredients, the API SHALL attempt to resolve each pantry ingredient to `cnf_food_id`.
3. Recipe ingredients SHALL be resolved to `cnf_food_id` through the existing `ingredient_categories.cnf_food_id` cache when available.
4. A recipe SHALL receive the pantry boost when at least one pantry ingredient and one recipe ingredient share the same `cnf_food_id`.
5. Exact normalized string matching SHALL remain as fallback when CNF resolution is unavailable.
6. The boost SHALL remain bounded by the existing pantry/inventory boost constant. CNF identity improves match recall; it SHALL NOT dominate query relevance.
7. Pantry snapshots SHALL remain request-scoped and in memory. This spec SHALL NOT persist pantry snapshots.

---

### Requirement 4: Search reasons for CNF-powered matches

**User Story:** As a user, I want search result reasons to explain when a result matched through an ingredient alias, so I can understand why a recipe appeared.

#### Acceptance Criteria

1. OpenAPI SHALL add a new `RecipeSearchReasonDto.source` value: `ingredient-alias-match`.
2. When a recipe is included or boosted because of CNF alias expansion, the API MAY add a reason:
   ```json
   { "source": "ingredient-alias-match", "label": "Matched poulet to chicken" }
   ```
3. Labels SHALL be short, user-safe, and deterministic. They SHALL not include raw SQL scores or internal IDs.
4. If multiple aliases match, the API SHALL include at most one alias reason per result.
5. Existing reason sources SHALL remain unchanged unless reconciled by Requirement 1.

---

### Requirement 5: Nutrition-aware search filters

**User Story:** As a family meal planner, I want to filter search results by simple health needs, so I can quickly find recipes that fit a family member’s constraints.

#### Acceptance Criteria

1. `RecipeSearchFiltersDto` and `specs/openapi.yaml` SHALL add nullable boolean filters:
   - `lowSodium`
   - `lowSugar`
   - `lowSaturatedFat`
   - `diabetesFriendly`
2. The filters SHALL use deterministic recipe data only:
   - `lowSodium`: recipe has `fopFlags.highInSodium == false`
   - `lowSugar`: recipe has `fopFlags.highInSugars == false`
   - `lowSaturatedFat`: recipe has `fopFlags.highInSaturatedFat == false`
   - `diabetesFriendly`: recipe has `highInSugars == false` and `highInSodium == false`; carbohydrate support is deferred until CNF carbohydrate per-portion values are stored in a queryable profile shape.
3. Recipes with `fopFlags == null` SHALL be excluded by nutrition-aware filters. Unknown nutrition is not treated as healthy.
4. Filters SHALL apply before final top-pick selection.
5. `appliedFilters` in `RecipeSearchResponseDto` SHALL mirror the nutrition filters.
6. No nutrition-aware filter SHALL call an LLM or external service.
7. Nutrition-aware filters SHALL only be surfaced/applied when health guidance is enabled. When health guidance is disabled, search SHALL ignore these filters or omit them from the UI according to the final contract decision, and SHALL not steer ranking by health metadata.

---

### Requirement 6: Locale-aware grocery list reconciliation

**User Story:** As a bilingual household, I want ingredients from English and French recipes to reconcile into one cleaned-up grocery list under my chosen locale, so I do not buy duplicate items just because recipes use different languages.

#### Acceptance Criteria

1. `GroceryRecomputeService` SHALL use provider food identity to group equivalent grocery line items when distinct normalized keys map to the same canonical food. Example: `"chicken"` and `"poulet"` can reconcile through the same `cnf_food_id`.
2. Reconciliation SHALL choose the grocery line display name from the active grocery locale:
   - English locale uses the provider English/canonical label when available.
   - French locale uses the provider French/localized label when available.
   - Missing localized label falls back to the best original ingredient display name.
3. The active grocery locale SHALL follow the current UI locale configuration convention. This spec SHALL NOT introduce a new grocery-specific environment variable.
4. If a grocery display locale override is implemented later, it SHALL use the existing convention where `NONE` means "not set / follow the default UI language".
5. The resolved grocery locale SHALL support:
   - `EN` / `en`
   - `FR` / `fr`
   - `NONE` / `none`, meaning use the app's default UI language.
6. Grocery locale resolution SHALL NOT read or alter `IMPORT_TARGET_LANGUAGE`. `IMPORT_TARGET_LANGUAGE=NONE` continues to mean recipes stay as imported.
7. Recipe cards, recipe names, recipe ingredients, instructions, and stored `raw_metadata` SHALL remain in their original language. Grocery reconciliation SHALL NOT translate or rewrite recipe content.
8. Reconciliation SHALL be deterministic and local. It SHALL NOT call an LLM, translation API, or network service.
9. Reconciliation SHALL preserve existing grocery list DTO shape unless a separate contract task explicitly changes it. The existing `GroceryLineItemDto` fields MAY carry the locale-facing `displayName` and a stable grouping `normalizedKey`.
10. Reconciliation SHALL preserve checked/unchecked grocery state across recompute. If display names change because of locale reconciliation, the implementation SHALL map prior checked state from any merged source display names to the reconciled display name.
11. Quantity rollup SHALL only merge items when unit families are compatible under the existing `UnitNormalizer` rules. Items with incompatible or unknown units SHALL remain separate lines even when they share a provider food identity.
12. Grocery section assignment SHALL continue to use `ingredient_categories.grocery_section` or `AisleMapper` fallback. If merged source rows disagree on section, human/manual category rows win; otherwise use the highest-confidence/category source or deterministic fallback.
13. If provider identity is unavailable, empty, or ambiguous, grocery recompute SHALL behave exactly as it did before this spec.
14. Tests SHALL cover default UI language resolution, `NONE`, English locale, French locale, mixed English/French recipes, no-provider fallback, unit incompatibility, and grocery-state preservation.

---

### Requirement 7: Health nudge explainability and household safety

**User Story:** As a busy parent, I want health nudges to explain themselves briefly and honestly, so I can make informed choices without feeling judged or misled.

#### Acceptance Criteria

1. Any user-facing health nudge introduced or modified by this spec SHALL include a short deterministic reason. Examples: `"Lower sodium option"`, `"Estimated high sodium from ingredients"`, `"Vegetable-forward recipe"`.
2. Any health nudge introduced or modified by this spec SHALL carry a source category:
   - `source-nutrition`: source recipe nutrition data supplied the signal.
   - `estimated-from-ingredients`: CNF/provider ingredient estimates supplied the signal.
   - `profile-rule`: a `family-health-profiles` rule supplied the signal.
   - `food-guide-group`: provider food-guide grouping supplied the signal.
   - `unknown`: only when the system cannot identify the source; this SHOULD be avoided for new behavior.
3. Any health nudge introduced or modified by this spec SHALL carry a confidence category:
   - `high`: direct source nutrition or high-confidence provider match.
   - `medium`: provider estimate with partial ingredient coverage or approximate unit conversion.
   - `low`: sparse provider coverage, unknown units, or fallback assumptions.
4. Health nudge copy SHALL avoid moralizing labels such as `"bad"`, `"guilty"`, or `"unhealthy"` as standalone explanations. Copy SHALL be calm, specific, and household-actionable.
5. `IsHealthyChoice` SHALL NOT be exposed as a bare boolean in user-facing copy when this spec contributes to the decision. It SHALL be paired with at least one deterministic reason/source pair.
6. Nutrition-aware search filters SHALL provide enough response metadata or existing `appliedFilters` detail for the UI to explain why filters are active. Hidden/excluded recipes do not need per-result reasons.
7. Allergy, intolerance, preference ownership, and the first provider-backed allergy/intolerance reminder surface SHALL remain with `.kiro/specs/family-health-profiles`. This spec SHALL NOT imply that absence of a warning means a recipe is safe for an allergy or intolerance.
8. Health copy SHALL use conservative language such as `"Check ingredients for Shellfish: possible match in shrimp"` or omit allergy claims entirely. Search augmentation SHALL NOT block ranking, planning, or grocery behavior because an allergy reminder exists.
9. When health guidance is disabled, health nudges, health reasons, and health confidence labels SHALL not be shown or used for ranking, while non-health search and grocery behavior continue.
10. Detailed health justification SHALL not be shown inline by default. It SHALL live behind a compact information affordance such as an `i` icon, tooltip, sheet, or popover.
11. The default visible nudge SHALL remain short enough to scan in a busy planning/search flow.
12. Tests SHALL cover reason/source/confidence presence for nutrition-aware nudges, calm copy constraints for new labels, conservative allergy language, and information-affordance disclosure.

---

### Requirement 8: Guardrails and scope boundaries

**User Story:** As a maintainer, I want CNF search upgrades to stay bounded, so search remains predictable and does not silently change grocery or health semantics.

#### Acceptance Criteria

1. This spec SHALL NOT change `weekly_plans.grocery_items` shape unless an explicit contract task is added first.
2. This spec MAY merge distinct grocery `normalized_key` rows for display only when they share a provider food identity. It SHALL NOT rewrite recipe ingredients or remove raw normalized keys from `ingredient_categories`.
3. This spec SHALL NOT add HEFI scoring or weekly recommendations. Those remain in `dietitian-agent-phase2`.
4. This spec SHALL NOT perform ingredient-level allergy/intolerance matching. That remains in `dietitian-agent-phase2`.
5. This spec SHALL NOT change PWA UI controls except where nutrition filters are already surfaced by the existing search filter component.
6. This spec SHALL NOT bypass the food data provider strategy by hard-coding CNF-specific implementation details in search consumers.
7. This spec SHALL NOT show health-oriented search reasons, filters, or boosts when health guidance is disabled.
8. This spec SHALL NOT redefine `HealthProfile`, allergy, intolerance, or preference semantics. Those remain governed by `.kiro/specs/family-health-profiles` and future dietitian specs.

---

## Risks and Questions

- **False positive aliases**: CNF can match broad foods where culinary use differs. Keep alias expansion bounded and explainable.
- **Contract ordering**: Search reason and filter contract reconciliation must happen first; otherwise drift compounds.
- **Nutrition unknowns**: Excluding null `fopFlags` may hide many recipes until CNF reclassification has run. This is intentional but should be documented in the UI/filter copy if surfaced.
- **Nudge trust**: If health nudges do not expose reason/source/confidence, users may either over-trust approximate CNF estimates or ignore useful warnings. Every new nudge needs a short deterministic explanation.
- **Allergy safety**: CNF aliases can improve ingredient understanding, but this spec does not certify allergen safety. Allergy and preference logic remains owned by `family-health-profiles`, and allergy copy stays non-blocking and reminder-based.
- **Pantry resolution latency**: Resolving many pantry ingredients via `pg_trgm` could add latency. Prefer cached `ingredient_categories.cnf_food_id`, batch where possible, and fall back cleanly.
- **Grocery state keys**: Current grocery state is keyed by display name. Locale reconciliation can change display names, so recompute must explicitly preserve checked state from merged source display names.
- **Section conflicts**: English and French aliases may have separate human grocery-section corrections. Manual corrections should win, but conflicting manual corrections need deterministic handling and logging.
- **UI locale source**: The PWA currently lets users switch UI language client-side. Server-side grocery recompute cannot rely on per-browser localStorage. Grocery display locale must therefore follow the configured default UI language, not each viewer's transient client-side selection.

---

## Notes / Decisions

- **2026-05-11**: Created as a follow-up to `cnf-data-ingestion`. Initial CNF ingestion owns the canonical data and bilingual search bridge; this spec owns broader search behavior and contract changes.
- **2026-05-11**: Added locale-aware grocery reconciliation. Recipe language remains locked; the grocery list can use provider bilingual names to show one cleaned-up locale-facing line without LLM translation.
- **2026-05-11**: Grocery display locale follows the existing default UI language configuration. No new grocery-specific environment variable is introduced. `NONE` follows current convention and means no explicit override.
- **2026-05-11**: Health nudges must include deterministic reason/source/confidence and avoid allergy-safety claims. Family-health owns possible allergy/intolerance reminders.
