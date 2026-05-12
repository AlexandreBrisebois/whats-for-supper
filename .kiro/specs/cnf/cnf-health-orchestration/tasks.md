# Tasks: CNF Health Orchestration

This is a coordination checklist. Do not implement product behavior directly from this spec. Use it to choose the next owning spec/task.

---

## Wave 0 — Align Specs Before Code

**What:** Remove cross-spec drift before implementation starts.

1. [x] Update `dietitian-agent-phase2` to reference provider strategy instead of owning CNF ingestion.
2. [x] Update `dietitian-agent-phase2` CNF schema references from `food_name` to `food_name_en` / `food_name_fr`.
3. [x] Remove duplicated CNF ingestion/NutrientLookup tasks from `dietitian-agent-phase2` or mark them as dependencies on `cnf-data-ingestion`.
4. [x] Confirm `family-health-profiles` remains owner of allergies, intolerances, preferences, warning levels, and the first provider-backed allergy/intolerance reminder surface.
5. [ ] Confirm `cnf-search-augmentation` does not claim allergy-safe results.
6. [ ] Keep `user-guide.md`, `data-flows.md`, and `user-flows.md` synchronized with any changed implementation sequence.

**Gate:** Spec review only. No code required.

---

## Wave 1 — CNF Data Foundation

**Owning spec:** `.kiro/specs/cnf-data-ingestion`

1. [ ] Build Tasks 1-3: schema, model/fixtures, provider strategy seam.
2. [ ] Build Task 4: CNF ingestion service and seed command.
3. [ ] Build Task 5: `NutrientLookup` and `UnitWeightTable`.
4. [ ] Build Task 6: health guidance settings gate.

**Gate:** `task agent:drift`, `task agent:test:impact`, `task review`.

---

## Wave 2 — Categorization And Bilingual Foundation

**Owning spec:** `.kiro/specs/cnf-data-ingestion`

1. [ ] Build Task 7: provider-backed nutrients and food-guide groups in `ClassifyDietaryProfileProcessor`.
2. [ ] Build Task 8: bilingual provider alias expansion for recipe search.
3. [ ] Build Task 9: CNF backup export and operator documentation.

**Gate:** CNF-backed `FopFlags`, category, `IsHealthyChoice`, and bilingual search foundation are tested.

---

## Wave 3 — Family Health Profile Contract And CRUD

**Owning spec:** `.kiro/specs/family-health-profiles`

1. [ ] Build Tasks 1-2: schema/model/OpenAPI/client.
2. [ ] Build Task 3: `ConditionRuleEngine`.
3. [ ] Build Task 4: health profile CRUD.

**Gate:** Health profile DTOs and routes are contract-aligned; CRUD and rule-engine tests pass.

---

## Wave 4 — Family Health Warning Surfaces

**Owning spec:** `.kiro/specs/family-health-profiles`

1. [ ] Build pulled-forward provider ingredient matching for allergy/intolerance reminders as soon as `cnf-data-ingestion` Task 8 is complete.
2. [ ] Build Tasks 5-6: discovery and schedule warnings.
3. [ ] Verify allergy reminders use "check ingredients" / "possible match" copy and never block planning.
4. [ ] Verify warnings are member-specific and informational, supporting household planning awareness without adding meal-attendance tracking.
5. [ ] Build Task 7: backup/restore.

**Gate:** Warning DTOs are contract-aligned; deterministic warnings show in discovery and schedule; allergy reminders are provider-backed, non-blocking, and do not claim safety.

---

## Wave 5 — Search Contract, Aliases, Pantry

**Owning spec:** `.kiro/specs/cnf-search-augmentation`

1. [ ] Build Task 1: search contract drift cleanup.
2. [ ] Build Task 2: CNF/provider ingredient alias expansion.
3. [ ] Build Task 3: `ingredient-alias-match` reason.
4. [ ] Build Task 4: pantry matching by provider food identity.

**Gate:** OpenAPI drift passes; search reasons and pantry matching are deterministic.

---

## Wave 6 — Bilingual Grocery Cleanup

**Owning spec:** `.kiro/specs/cnf-search-augmentation`

1. [ ] Build Task 6: locale-aware grocery list reconciliation.
2. [ ] Verify default UI locale drives grocery display language.
3. [ ] Verify `IMPORT_TARGET_LANGUAGE=NONE` does not affect grocery display locale.
4. [ ] Verify grocery checked state survives merged English/French display names.

**Gate:** Grocery recompute, grocery state, and locale tests pass.

---

## Wave 7 — Nutrition Filters And Explainable Nudges

**Owning spec:** `.kiro/specs/cnf-search-augmentation`

1. [ ] Build Task 5: nutrition-aware search filters gated by health guidance settings.
2. [ ] Build Task 7: health nudge reason/source/confidence.
3. [ ] Verify no moralizing copy.
4. [ ] Verify no allergy-safe claim is emitted by this spec.
5. [ ] Verify justification details are behind an information icon/sheet/popover, not inline by default.

**Gate:** Health guidance opt-out suppresses filters/nudges/ranking; non-health search still works.

---

## Wave 8 — Dietitian Phase 2 Alignment And Build

**Owning spec:** `.kiro/specs/dietitian-agent-phase2`

1. [ ] Align the spec to provider strategy and current CNF schema.
2. [ ] Build HEFI-style scoring with softer user-facing "week balance" naming until exact parity is validated.
3. [ ] Build ingredient-level allergy/intolerance matching.
4. [ ] Reuse the family-health ingredient matching seam; extend only if HEFI/recommendation candidate filtering requires more coverage.
5. [ ] Build LLM weekly recommendations.
6. [ ] Add user-facing transparency docs.
7. [ ] Verify the health agent is not enqueued and no LLM call is made when health guidance is disabled.

**Gate:** HEFI-style scoring and weekly recommendations are deterministic or clearly labelled by source, user-facing score copy stays softer than bare HEFI until validated, and any ingredient-level allergy/intolerance context reuses family-health reminders without blocking planning.

---

## Wave 9 — Cross-Spec Hardening

1. [ ] Run `task agent:drift`.
2. [ ] Run `task agent:test:impact`.
3. [ ] Run `task review`.
4. [ ] Add/verify E2E coverage for bilingual search, bilingual grocery cleanup, health opt-out, and planner warnings.
5. [ ] Archive completed specs or mark completed tasks with dated notes.

---

## Notes / Decisions

- **2026-05-11**: Orchestrator added as the synchronization checklist for CNF, grocery, health, and dietitian work.
- **2026-05-11**: `dietitian-agent-phase2` remains relevant for HEFI, family-health reminder reuse, and LLM weekly recommendations, but is stale until its duplicated CNF ingestion/schema sections are aligned to `cnf-data-ingestion`.
- **2026-05-11**: Updated `dietitian-agent-phase2` to remove duplicated CNF ingestion/lookup ownership and depend on the provider foundation.
- **2026-05-11**: Health-agent recommendation work must not run when health guidance is disabled. Justification detail belongs behind an information affordance.
- **2026-05-11**: Ingredient-level allergy/intolerance matching is pulled forward into `family-health-profiles` before visible allergy badges. Copy is a friendly member-specific reminder, e.g. "Check ingredients for Shellfish: possible match in shrimp." It is never a planning block and never an allergy-safe claim.
- **2026-05-12**: Until exact HEFI parity is validated against a reference dataset, planner surfaces should present the score as `Week balance` or similar softer CFG-alignment copy rather than a bare `HEFI` label.
- **2026-05-12**: Split family-health into an earlier contract/CRUD wave and a dedicated warning-surface wave so provider-backed allergy/intolerance reminders can land immediately after `cnf-data-ingestion` Task 8 instead of waiting behind later search and grocery slices.
