# Tasks: CNF Cross-Spec Review

Use this checklist to launch independent review conversations. Each task includes a kickoff prompt. Paste the prompt into a fresh Codex conversation when you want to work that branch.

Before patching specs in any branch, wait for the human decision.

---

## R0 - Allergy Reminders And Ingredient Matching Ownership

- [x] Resolved: pull ingredient-level allergy/intolerance matching forward into `family-health-profiles`; use non-blocking "check ingredients" / "possible match" reminders.

Kickoff prompt for follow-up verification:

```text
Review branch R0 from .kiro/specs/cnf-cross-spec-review. Verify that allergy semantics are consistent across family-health, CNF search, orchestration, and dietitian specs. Use the Mère-Designer lens. Confirm there are no remaining claims that a warning blocks planning or that absence of a warning means allergy-safe. Surface only one issue if you find one; offer 2-3 fixes and recommend the best.
```

---

## R1 - Health Guidance Setting Ownership And Semantics

- [ ] Review where `health_guidance_enabled` should live and exactly what it gates.

Why this matters:

- CNF ingestion introduces the setting.
- Search, family-health, planner nudges, week balance, and dietitian workflows all depend on it.
- If the setting is too broad, it may hide useful household reminders. If too narrow, the app may nag after opt-out.

Kickoff prompt:

```text
Use shared-understanding and the Mère-Designer lens. Review R1 in .kiro/specs/cnf-cross-spec-review: health_guidance_enabled ownership and semantics. Required context: .kiro/specs/cnf-data-ingestion/requirements.md, .kiro/specs/cnf-search-augmentation/requirements.md, .kiro/specs/family-health-profiles/requirements.md, .kiro/specs/dietitian-agent-phase2/requirements.md, api/src/RecipeApi/Services/SettingsService.cs, api/src/RecipeApi/Controllers/SettingsController.cs. Surface one blind spot, propose 2-3 solutions, recommend one, and wait for my decision before patching specs.
```

---

## R2 - FOP Thresholds, Raw Nutrition, And CNF Estimates

- [ ] Reconcile conflicting nutrition thresholds and data sources.

Why this matters:

- Family-health requirements still mention hypertension at 600 mg sodium, while FOP constants in code/spec use 345 mg.
- CNF-derived nutrition is estimated from ingredients, units, and yield.
- User trust depends on clear distinction between source nutrition and estimated nutrition.

Kickoff prompt:

```text
Review R2 in .kiro/specs/cnf-cross-spec-review: FOP thresholds, raw nutrition, and CNF estimates. Required context: .kiro/specs/family-health-profiles/requirements.md, .kiro/specs/family-health-profiles/design.md, .kiro/specs/cnf-data-ingestion/requirements.md, .kiro/specs/cnf-data-ingestion/design.md, api/src/RecipeApi/Services/FopThresholds.cs, api/src/RecipeApi/Utils/NutritionParser.cs. Find the highest-impact inconsistency, give 2-3 solutions, recommend one, and ask me to decide.
```

---

## R3 - Alias Expansion Seam Duplication

- [ ] Decide whether bilingual expansion in CNF ingestion and broader alias expansion in search should be one seam or two.

Why this matters:

- `cnf-data-ingestion` Task 8 adds `ICnfBilingualQueryExpander`.
- `cnf-search-augmentation` Task 2 adds `ICnfIngredientAliasExpander`.
- Two expanders can drift in limits, SQL, provider abstraction, tests, and reason metadata.

Kickoff prompt:

```text
Review R3 in .kiro/specs/cnf-cross-spec-review: alias expansion seam duplication. Required context: .kiro/specs/cnf-data-ingestion/design.md section "Modified: RecipeSearchService bilingual query expansion", .kiro/specs/cnf-data-ingestion/tasks.md Task 8, .kiro/specs/cnf-search-augmentation/design.md section "New service: ICnfIngredientAliasExpander", and .kiro/specs/cnf-search-augmentation/tasks.md Tasks 2-3. Surface one ownership/seam problem, propose 2-3 fixes, recommend one, and wait for my decision.
```

---

## R4 - Search Contract Drift Before New Search Behavior

- [ ] Reconcile existing search DTO/OpenAPI drift before adding CNF-powered behavior.

Why this matters:

- Current code has `healthyOnly` in `RecipeSearchFiltersDto`, but OpenAPI lacks it.
- Current search service emits `pantry-match`, while OpenAPI has `inventory-fit`.
- New reason sources and nutrition filters will compound drift if cleanup does not go first.

Kickoff prompt:

```text
Review R4 in .kiro/specs/cnf-cross-spec-review: search contract drift. Required context: specs/openapi.yaml RecipeSearchFiltersDto and RecipeSearchReasonDto, api/src/RecipeApi/Dto/RecipeSearchFiltersDto.cs, api/src/RecipeApi/Dto/RecipeSearchReasonDto.cs, api/src/RecipeApi/Services/RecipeSearchService.cs, .kiro/specs/cnf-search-augmentation/tasks.md Task 1. Verify current drift, propose 2-3 cleanup paths, recommend one, and wait for my decision.
```

---

## R5 - Grocery Locale Source And Checked-State Preservation

- [ ] Decide how server-side grocery recompute chooses display locale and preserves checked state.

Why this matters:

- PWA locale can come from client localStorage, `NEXT_PUBLIC_DEFAULT_LOCALE`, or selected member `preferredLanguage`.
- Server recompute cannot read browser localStorage.
- Grocery state is keyed by display name today, and locale reconciliation changes display names.

Kickoff prompt:

```text
Review R5 in .kiro/specs/cnf-cross-spec-review: grocery locale source and checked-state preservation. Required context: .kiro/specs/cnf-search-augmentation/requirements.md Requirement 6, .kiro/specs/cnf-search-augmentation/design.md "Active grocery locale" and "Grocery state preservation", pwa/src/components/common/LocaleProvider.tsx, pwa/src/lib/i18n/index.ts, api/src/RecipeApi/Services/GroceryRecomputeService.cs, api/src/RecipeApi/Services/ScheduleService.cs. Surface one dead end, give 2-3 solutions, recommend one, and ask me to decide.
```

---

## R6 - Meal Attendance / Family-Member Presence

- [ ] Decide whether warnings should eventually depend on who is eating a specific meal.

Why this matters:

- We decided warnings are non-blocking and member-specific.
- The user explicitly wants meals to remain plannable when the affected member is not present.
- The app may not currently model meal attendance, so suppressing warnings could require a new product concept.

Kickoff prompt:

```text
Review R6 in .kiro/specs/cnf-cross-spec-review: meal attendance / family-member presence. Required context: .kiro/specs/family-health-profiles/requirements.md, .kiro/specs/family-health-profiles/design.md, .kiro/specs/cnf-health-orchestration/user-flows.md Flow 5, specs/openapi.yaml schedule schemas, api/src/RecipeApi/Services/ScheduleService.cs. Should we keep member-specific non-blocking warnings only, add a meal attendance model now, or defer attendance as a future planner feature? Give 2-3 solutions, recommend one, and wait for my decision.
```

---

## R7 - Provider Strategy Scope And Abstraction Weight

- [ ] Review whether the provider strategy is right-sized for CanadaCNF first.

Why this matters:

- The specs correctly want future USDA/Swedish providers.
- The first implementation still uses CNF-specific schema names.
- Too much abstraction can slow the core supper value; too little can trap Canada-specific logic everywhere.

Kickoff prompt:

```text
Review R7 in .kiro/specs/cnf-cross-spec-review: provider strategy scope. Required context: .kiro/specs/cnf-data-ingestion/requirements.md Requirement 3, .kiro/specs/cnf-data-ingestion/design.md "Provider strategy", .kiro/specs/cnf-search-augmentation/design.md seam inventory, .kiro/specs/dietitian-agent-phase2/requirements.md Requirement 1. Find the right boundary between provider interfaces and CNF-specific tables. Offer 2-3 approaches, recommend one, and wait for my decision.
```

---

## R8 - CNF False-Positive Cache And Operator Correction

- [ ] Review how wrong CNF matches can be inspected, corrected, or cleared.

Why this matters:

- `similarity >= 0.4` can create false positives.
- `ingredient_categories.cnf_food_id` makes matches sticky.
- Operators need a path that is safer than manual DB surgery.

Kickoff prompt:

```text
Review R8 in .kiro/specs/cnf-cross-spec-review: CNF false-positive cache and operator correction. Required context: .kiro/specs/cnf-data-ingestion/requirements.md Risks and Requirement 4, .kiro/specs/cnf-data-ingestion/design.md NutrientLookup section, .kiro/specs/cnf-data-ingestion/tasks.md Task 5 and Task 9, api/src/RecipeApi/Models/IngredientCategory.cs if present. Surface the operational dead end, propose 2-3 correction/audit paths, recommend one, and wait for my decision.
```

---

## R9 - Unit/Yield Approximations And Confidence Propagation

- [ ] Decide how approximate quantity/yield conversions should affect user-facing health confidence.

Why this matters:

- CNF values are per 100g.
- Recipe supplies can say "2 chicken breasts", "1 onion", or unknown units.
- Defaulting to 100g and recipeYield 2 can produce useful but approximate FOP flags.

Kickoff prompt:

```text
Review R9 in .kiro/specs/cnf-cross-spec-review: unit/yield approximations and confidence propagation. Required context: .kiro/specs/cnf-data-ingestion/design.md UnitWeightTable and ClassifyDietaryProfileProcessor sections, .kiro/specs/cnf-search-augmentation/design.md Health nudge explainability, .kiro/specs/dietitian-agent-phase2/design.md HEFI scoring. Propose how approximations should flow into confidence/source metadata. Give 2-3 options, recommend one, and wait for my decision.
```

---

## R10 - Health Nudge Explainability Contract

- [ ] Decide whether reason/source/confidence stays internal or becomes OpenAPI DTO fields.

Why this matters:

- Specs require health nudges to have reason/source/confidence.
- Some UI surfaces need details behind an information affordance.
- Adding fields late may cause client churn; adding too early may over-contract uncertain UI.

Kickoff prompt:

```text
Review R10 in .kiro/specs/cnf-cross-spec-review: health nudge explainability contract. Required context: .kiro/specs/cnf-search-augmentation/requirements.md Requirement 7, .kiro/specs/cnf-search-augmentation/design.md Health nudge explainability, .kiro/specs/dietitian-agent-phase2/requirements.md Requirement 5, specs/openapi.yaml search and schedule schemas. Should source/confidence be internal helpers, response DTO fields, or surface-specific DTOs? Give 2-3 solutions, recommend one, and wait for my decision.
```

---

## R11 - HEFI Exactness, Naming, And User Trust

- [ ] Decide how to name and label HEFI if implementation is approximate.

Why this matters:

- Official HEFI-2019 parity is non-trivial.
- A numeric score can feel authoritative.
- Household utility may be better served by a softer "week balance" indicator until validated.

Kickoff prompt:

```text
Review R11 in .kiro/specs/cnf-cross-spec-review: HEFI exactness, naming, and user trust. Required context: .kiro/specs/dietitian-agent-phase2/requirements.md Requirement 2, .kiro/specs/dietitian-agent-phase2/design.md HEFI Scoring, .kiro/specs/cnf-health-orchestration/user-guide.md Dietitian Phase 2, pwa/src/components/planner/BalanceIndicator.tsx if relevant. Offer 2-3 naming/scoring paths, recommend one using the Mère-Designer lens, and wait for my decision.
```

---

## R12 - Cross-Spec Wave Ordering After Pulled-Forward Allergy Matching

- [ ] Re-check implementation waves after the R0 allergy decision.

Why this matters:

- Allergy matching moved from dietitian Phase 2 into family-health before warning UI.
- This may require provider identity/alias tasks before family-health warning surfaces.
- Orchestration waves should prevent implementers from building UI before the matcher exists.

Kickoff prompt:

```text
Review R12 in .kiro/specs/cnf-cross-spec-review: cross-spec wave ordering after pulled-forward allergy matching. Required context: .kiro/specs/cnf-health-orchestration/design.md, .kiro/specs/cnf-health-orchestration/tasks.md, .kiro/specs/family-health-profiles/tasks.md, .kiro/specs/cnf-data-ingestion/tasks.md, .kiro/specs/cnf-search-augmentation/tasks.md. Identify the next sequencing conflict, give 2-3 ordering solutions, recommend one, and wait for my decision.
```

---

## R13 - DTO Shape Risks: Warnings, Schedule Records, Search Filters

- [ ] Review contract and DTO risks before implementing family-health/search response changes.

Why this matters:

- `ScheduleRecipeDto` is a positional C# record.
- `warnings` may be null or empty depending on schedule/discovery context.
- Search filters already have `healthyOnly` drift.

Kickoff prompt:

```text
Review R13 in .kiro/specs/cnf-cross-spec-review: DTO shape risks. Required context: specs/openapi.yaml RecipeDto, ScheduleRecipeDto, RecipeSearchFiltersDto, api/src/RecipeApi/Dto/ScheduleDayDto.cs, api/src/RecipeApi/Dto/RecipeSearchFiltersDto.cs, .kiro/specs/family-health-profiles/tasks.md Tasks 2, 5, 6, .kiro/specs/cnf-search-augmentation/tasks.md Task 1. Surface one contract risk, propose 2-3 fixes, recommend one, and wait for my decision.
```

---

## R14 - LLM Recommendation Safety, Privacy, And Opt-Out

- [ ] Review what the dietitian LLM sees and when it is allowed to run.

Why this matters:

- Health guidance disabled must stop workflow enqueue and LLM calls.
- Candidate recipes must come from the library and validate returned IDs.
- Sensitive allergy data should not be sent unless deterministic filtering has handled it and the design explicitly allows it.

Kickoff prompt:

```text
Review R14 in .kiro/specs/cnf-cross-spec-review: LLM recommendation safety, privacy, and opt-out. Required context: .kiro/specs/dietitian-agent-phase2/requirements.md Requirement 4, .kiro/specs/dietitian-agent-phase2/design.md Weekly Recommendations, .kiro/specs/cnf-data-ingestion/requirements.md Requirement 6, .kiro/specs/cnf-health-orchestration/requirements.md gates. Surface one LLM safety/privacy dead end, give 2-3 solutions, recommend one, and wait for my decision.
```

---

## Notes / Decisions

- 2026-05-11: Created as a durable review backlog for the coordinated CNF/health/search/dietitian specs.
- 2026-05-11: Prompts are intentionally independent and narrow. Use one prompt per fresh conversation.
