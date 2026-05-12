# Requirements Document: Dietitian Agent — Phase 2

## Introduction

Phase 2 builds on the newer CNF/provider foundation, search/grocery augmentation, and family health profiles. It no longer owns CNF ingestion, `pg_trgm` setup, `cnf_foods` schema creation, or `NutrientLookup`; those are owned by `cnf-data-ingestion`.

This feature owns the next layer:

1. **HEFI-style weekly scoring** — deterministic scoring for a week plan using provider-backed recipe nutrition and food-guide groups, with a softer user-facing "week balance" or "Canada's Food Guide alignment" presentation until exact HEFI parity is validated.
2. **Ingredient-level allergy and intolerance matching reuse** — reuses the family-health provider-backed matching seam for recommendation candidate filtering and explanation context.
3. **Agent-driven weekly recommendations** — a single bounded LLM call that suggests recipes from the user's library for open planner slots.
4. **User-facing transparency** — documentation and copy that explain what the score and suggestions mean.

**This feature does not answer diet questions. It does not replace a dietitian. It nudges meal selection.**

**Dependencies:**
- `cnf-data-ingestion` complete — provider strategy, `cnf_foods.food_name_en`, `cnf_foods.food_name_fr`, `NutrientLookup`, and CNF-backed `FopFlags` exist.
- `cnf-search-augmentation` health nudge explainability complete — reason/source/confidence rules exist.
- `family-health-profiles` complete — `HealthProfile`, allergies, intolerances, preferences, warning levels, and provider-backed ingredient review reminders exist.
- `recipe-categorization` complete — `dietary_profile` and category fields are populated.

---

## Glossary

- **Food data provider strategy**: The provider seam created by `cnf-data-ingestion`. Canada CNF is the default provider, but dietitian behavior consumes provider-facing lookup/identity interfaces where possible.
- **CNFFood**: The Canada provider's canonical food row. Current schema uses `food_name_en` and optional `food_name_fr`.
- **HEFI-2019**: Healthy Eating Food Index 2019. A validated scoring algorithm that measures adherence to the 2019 Canada's Food Guide.
- **HEFIScore**: The week-level score object returned by deterministic scoring and stored on `weekly_plans.hefi_score`.
- **Ingredient-level allergy/intolerance matching**: Matching health profile allergy/intolerance terms against recipe ingredients through provider identity, localized names, and deterministic synonym tables.
- **AgentRecommendation**: A plain-language meal suggestion returned by the LLM agent, shown as a non-blocking planner card.
- **Health nudge source/confidence**: Explainability categories defined by `cnf-search-augmentation`.

---

## Requirements

### Requirement 1: Provider-backed dietitian dependencies

**User Story:** As a maintainer, I want dietitian phase 2 to reuse the CNF/provider foundation, so the app has one food-data implementation instead of duplicated ingestion and lookup logic.

#### Acceptance Criteria

1. This spec SHALL NOT create or modify `cnf_foods`, `pg_trgm`, `ingredient_categories.cnf_food_id`, `NutrientLookup`, or `task data:cnf:seed`.
2. Dietitian services SHALL consume provider-backed food identity and nutrient lookup from `cnf-data-ingestion`.
3. Canada CNF-specific code in this spec SHALL reference `food_name_en` and `food_name_fr`, not the old `food_name` column.
4. When provider data is unavailable for a recipe ingredient, dietitian features SHALL degrade gracefully to existing family-health/profile behavior.
5. Any user-facing dietitian nudge SHALL use deterministic reason/source/confidence metadata per `cnf-search-augmentation`, but broad generic schedule/search DTOs SHALL NOT be widened just to carry that metadata everywhere.

---

### Requirement 2: HEFI-2019 weekly score

**User Story:** As a meal planner, I want a weekly score that summarizes how closely my plan aligns with Canada's Food Guide, so I can improve balance without reading nutrition spreadsheets.

#### Acceptance Criteria

1. A `HEFIScorer` service SHALL compute an `HEFIScore` from week recipe dietary profiles, provider food-guide groups, and available provider-backed nutrient summaries.
2. `HEFIScore` SHALL include at minimum: `totalScore`, `vegetableFruitScore`, `wholeGrainScore`, `proteinFoodScore`, `plantProteinRatio`, `sodiumScore`, `saturatedFatScore`, and `fopWeekSummary`.
3. The scorer SHALL be deterministic and SHALL NOT call an LLM.
4. `weekly_plans` SHALL gain nullable JSONB column `hefi_score`.
5. `GET /api/schedule` SHALL include nullable `hefiScore` in `ScheduleDays`.
6. The planner UI SHALL display `totalScore` only when present, but until exact HEFI-2019 parity is validated it SHALL present the result with softer user-facing copy such as `Week balance`, `Canada's Food Guide alignment`, or `Estimated week balance` rather than as a bare official HEFI label.
7. HEFI scoring SHALL respect health guidance opt-out for user-facing display. The server MAY compute/store the score, but it SHALL NOT surface dietitian-style nudges when health guidance is disabled.
8. The scoring implementation SHALL document whether it is exact HEFI-2019 parity or a CFG-proportion approximation. Exact parity requires validation against a published reference dataset before being labelled exact.
9. Until exact HEFI-2019 parity is validated, user-facing copy SHALL describe the score as an estimate or week-balance indicator and SHALL NOT imply official HEFI equivalence.

---

### Requirement 3: Ingredient-level allergy and intolerance matching reuse

**User Story:** As a meal planner, I want dietitian recommendations to respect the same family-health ingredient checks already used by recipe and planner warnings, so suggestions do not bypass household safety reminders.

#### Acceptance Criteria

1. Dietitian recommendation and candidate-filtering code SHALL reuse the provider-backed ingredient matching seam owned by `family-health-profiles`.
2. Allergy and intolerance semantics, warning levels, reminder copy, and DTO ownership SHALL remain governed by `family-health-profiles`.
3. Dietitian code SHALL NOT create a second allergen synonym table unless it is explicitly upstreamed to the family-health matching seam first.
4. Recommendation candidates MAY be deprioritized or annotated when family-health matching emits a possible allergy/intolerance reminder, but suggestions SHALL remain non-blocking unless a future explicit attendance/serving model chooses otherwise.
5. Recommendation copy SHALL use the same conservative reminder language: `"Check ingredients for {allergy}: possible match in {ingredient}."`
6. Absence of a warning SHALL NOT be presented as proof that a recipe is allergy-safe.

---

### Requirement 4: Health-agent weekly recommendations

**User Story:** As a meal planner with open slots, I want a few practical recipe suggestions from my own library that improve the week, so I do not have to browse manually when decision fatigue is high.

#### Acceptance Criteria

1. When health guidance is enabled and a week has at least one open dinner slot and its balance/HEFI state indicates improvement opportunities, `GenerateWeeklyRecommendationsProcessor` SHALL produce 1-3 recipe recommendations.
2. The processor SHALL use deterministic scoring and family profile context to build a compact payload.
3. The LLM payload SHALL include conditions and preferences where appropriate, but SHALL NOT include full allergy lists unless the dietitian allergen-matching implementation explicitly needs them and passes safety review.
4. Candidate recipes SHALL be drawn from the user's recipe library and SHALL exclude recipes already assigned to the week.
5. The LLM output SHALL be validated: unknown `recipeId` values are discarded.
6. Recommendations SHALL be stored in nullable `weekly_plans.recommendations` and returned by `GET /api/schedule`.
7. Planner recommendation cards SHALL be non-blocking. The user can ignore, dismiss, or open a suggestion. Suggestions SHALL NOT auto-assign recipes.
8. The processor SHALL be idempotent: if the underlying week state has not changed, it SHALL not call the LLM again.
9. When health guidance is disabled, the health agent SHALL NOT run: no workflow task SHALL be enqueued, no LLM call SHALL be made, and no new recommendations SHALL be generated or shown.
10. The health guidance gate SHALL be enforced both before recommendation workflow enqueue and again inside `GenerateWeeklyRecommendationsProcessor` before any LLM payload is built.
11. Recommendation reasons SHALL follow health nudge explainability rules when health-related.
12. Recommendation justification details SHALL be available behind a compact information affordance, not rendered inline by default.
13. If planner recommendations expose structured explainability over the wire, they SHALL do so through a dedicated recommendation-specific DTO or nested detail object rather than by widening unrelated generic DTOs.

---

### Requirement 5: User-facing transparency

**User Story:** As a user, I want to understand what dietitian-style scores and recommendations mean, so I can trust them without feeling judged.

#### Acceptance Criteria

1. `api/docs/DIETITIAN_AGENT_PHASE2.md` SHALL exist.
2. The documentation SHALL explain what the HEFI-style logic measures, what the score means for a home cook, what user-facing label is used, and whether the implementation is exact or approximate.
3. The documentation SHALL explain that CNF/provider data is local, deterministic reference data.
4. The documentation SHALL explain ingredient-level allergy/intolerance matching and its limits.
5. The documentation SHALL explain that weekly recommendations are suggestions, not automatic assignments or medical advice.
6. The documentation SHALL include token/cost behavior for the LLM recommendation call.
7. The documentation SHALL include a Mermaid data-flow diagram.
8. Copy SHALL avoid moralizing labels and SHALL use calm household-actionable language.
9. Detailed justification metadata SHALL have a consistent UI home: an information icon that opens a tooltip/sheet/popover with reason, source, confidence, and limitation text for users who want more detail.

---

## Risks and Questions

- **HEFI exactness**: The official HEFI-2019 algorithm requires careful validation. Do not label the score exact until tested against a reference dataset, and do not use HEFI as the primary user-facing label before that validation exists.
- **Allergy safety**: Ingredient matching improves warnings but does not certify safety. Copy must remain conservative.
- **Provider coverage**: Missing or ambiguous provider matches should degrade gracefully.
- **LLM recommendations**: The LLM must only select from validated candidate recipes and must not invent recipe IDs.
- **Health guidance opt-out**: Dietitian recommendations and HEFI nudges must be suppressed when disabled. The health agent must not run when health guidance is disabled.
- **Explanation noise**: Reason/source/confidence metadata can clutter planner cards. Keep it behind an information icon and progressive disclosure.

---

## Notes / Decisions

- **2026-05-11**: Updated to depend on `cnf-data-ingestion` for CNF/provider schema, seed, and lookup. Removed duplicated ownership of CNF ingestion and `NutrientLookup`.
