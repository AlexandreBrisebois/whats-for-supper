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

- [x] Resolved: keep `health_guidance_enabled` as a family-wide generic setting that gates derived wellness steering, ranking, filters, nudges, and dietitian behavior, but not explicit allergy/intolerance "check ingredients" reminders.

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

- [x] Resolved: standardize family-health nutrition warnings on `FopThresholds` (`SodiumMg = 345 mg`) and describe warning nutrition as CNF-derived estimates when available, falling back to raw metadata.

Why this matters:

- Family-health requirements previously mentioned hypertension at 600 mg sodium, while FOP constants in code/spec use 345 mg.
- CNF-derived nutrition is estimated from ingredients, units, and yield.
- User trust depends on clear distinction between source nutrition and estimated nutrition.

Kickoff prompt:

```text
Review R2 in .kiro/specs/cnf-cross-spec-review: FOP thresholds, raw nutrition, and CNF estimates. Required context: .kiro/specs/family-health-profiles/requirements.md, .kiro/specs/family-health-profiles/design.md, .kiro/specs/cnf-data-ingestion/requirements.md, .kiro/specs/cnf-data-ingestion/design.md, api/src/RecipeApi/Services/FopThresholds.cs, api/src/RecipeApi/Utils/NutritionParser.cs. Find the highest-impact inconsistency, give 2-3 solutions, recommend one, and ask me to decide.
```

---

## R3 - Alias Expansion Seam Duplication

- [x] Resolved: collapse bilingual expansion and broader ingredient alias expansion into one public `ICnfIngredientAliasExpander` seam. `cnf-data-ingestion` Task 8 creates the bilingual-only initial implementation; `cnf-search-augmentation` Task 2 extends the same seam with static synonyms and richer alias matches.

Why this matters:

- `cnf-data-ingestion` Task 8 creates `ICnfIngredientAliasExpander` with bilingual CNF aliases only.
- `cnf-search-augmentation` Task 2 extends `ICnfIngredientAliasExpander` with broader aliases and match metadata.
- Two expanders can drift in limits, SQL, provider abstraction, tests, and reason metadata.

Kickoff prompt for follow-up verification:

```text
Review R3 in .kiro/specs/cnf-cross-spec-review: alias expansion seam duplication. Verify that cnf-data-ingestion Task 8 and cnf-search-augmentation Tasks 2-3 use one public ICnfIngredientAliasExpander seam, with no separate ICnfBilingualQueryExpander public dependency in RecipeSearchService. Surface one remaining ownership/seam issue if you find one, propose 2-3 fixes, recommend one, and wait for my decision.
```

---

## R4 - Search Contract Drift Before New Search Behavior

- [x] Resolved: document `inventory-fit` as the pantry-photo reason source already aligned with live search behavior, and treat the remaining `healthyOnly` contract drift as a separate implementation-validated cleanup before any new CNF search reason/filter work.

Why this matters:

- Current code has `healthyOnly` in `RecipeSearchFiltersDto`, but OpenAPI lacks it.
- Pantry-photo search reasons already use `inventory-fit`; the review backlog should not keep describing stale `pantry-match` drift.
- New reason sources and nutrition filters will compound drift if the remaining filter mismatch does not go first.

Kickoff prompt:

```text
Review R4 in .kiro/specs/cnf-cross-spec-review: search contract drift. Required context: specs/openapi.yaml RecipeSearchFiltersDto and RecipeSearchReasonDto, api/src/RecipeApi/Dto/RecipeSearchFiltersDto.cs, api/src/RecipeApi/Dto/RecipeSearchReasonDto.cs, api/src/RecipeApi/Services/RecipeSearchService.cs, .kiro/specs/cnf-search-augmentation/tasks.md Task 1. Verify current drift, propose 2-3 cleanup paths, recommend one, and wait for my decision.
```

---

## R5 - Grocery Locale Source And Checked-State Preservation

- [x] Resolved: server-side grocery recompute uses the configured system default UI locale only; it does not follow browser localStorage or selected-member `preferredLanguage`. Preserve checked state by remapping prior display-name keys during recompute within the existing `grocery_state` shape.

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

- [x] Resolved: keep planner warnings member-specific and non-blocking, but do not add meal-attendance tracking; schedule warnings remain household planning awareness for all profiled members.

Why this matters:

- We decided warnings are non-blocking and member-specific.
- The user explicitly wants the planner to stay simple and not record attendance.
- The current schedule contract does not model who is eating a meal, so attendance-based suppression would add a new product concept.

Kickoff prompt for follow-up verification:

```text
Review R6 in .kiro/specs/cnf-cross-spec-review: meal attendance / family-member presence. Verify that family-health and orchestration specs keep planner warnings member-specific and non-blocking without adding meal-attendance tracking or per-slot participant scoping. Confirm the copy frames warnings as household planning awareness rather than auto-suppressed signals based on who is eating. Surface one remaining ambiguity if you find one, propose 2-3 fixes, recommend one, and wait for my decision.
```

---

## R7 - Provider Strategy Scope And Abstraction Weight

- [x] Resolved: keep provider abstraction at the consumer-capability layer; keep first-slice storage, operator tasks, and docs explicitly CNF-shaped until a second provider creates proven duplication.

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

- [x] Resolved: add a small operator-facing correction workflow for sticky CNF matches. Keep `normalized_key` as the lexical cache key, keep `cnf_food_id` as attached canonical identity, and support inspect / clear / override actions with audit logging instead of manual DB surgery.

Why this matters:

- `similarity >= 0.4` can create false positives.
- `ingredient_categories.cnf_food_id` makes matches sticky.
- Operators need a path that is safer than manual DB surgery.

Kickoff prompt for follow-up verification:

```text
Review R8 in .kiro/specs/cnf-cross-spec-review: CNF false-positive cache and operator correction. Verify that cnf-data-ingestion defines a supported operator-facing inspect / clear / override path for sticky `ingredient_categories.cnf_food_id` matches, with no requirement to replace `normalized_key` or add a user-facing admin UI. Surface one remaining audit/ownership issue if you find one, propose 2-3 fixes, recommend one, and wait for my decision.
```

---

## R9 - Unit/Yield Approximations And Confidence Propagation

- [x] Resolved: compute one shared internal `NutritionEstimateMetadata` seam in `cnf-data-ingestion`, then have search nudges and HEFI/week-balance consume that metadata for conservative source/confidence mapping instead of inventing separate heuristics.

Why this matters:

- CNF values are per 100g.
- Recipe supplies can say "2 chicken breasts", "1 onion", or unknown units.
- Defaulting to 100g and recipeYield 2 can produce useful but approximate FOP flags.

Kickoff prompt for follow-up verification:

```text
Review R9 in .kiro/specs/cnf-cross-spec-review: unit/yield approximations and confidence propagation. Verify that cnf-data-ingestion owns one shared internal NutritionEstimateMetadata seam derived from provider coverage, approximate unit conversion usage, 100g fallback usage, and default recipe-yield usage. Confirm that cnf-search-augmentation and dietitian-agent-phase2 consume that seam for source/confidence mapping instead of inventing separate heuristics, and that no new OpenAPI DTO fields were added in this branch. Surface one remaining ambiguity if you find one, propose 2-3 fixes, recommend one, and wait for my decision.
```

---

## R10 - Health Nudge Explainability Contract

- [x] Resolved: keep reason/source/confidence as shared internal explainability metadata by default, and expose it only through surface-specific DTOs where a real information affordance needs structured detail. Do not add broad generic fields to existing search or schedule DTOs in this branch.

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

- [x] Resolved: keep `HEFIScore` / `hefiScore` as the technical seam, but use softer user-facing labels like `Week balance` or `Estimated week's alignment with Canada's Food Guide` until exact HEFI parity is validated.

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

- [x] Resolved: split family-health into an earlier contract/CRUD wave and a dedicated warning-surface wave; make pulled-forward provider ingredient matching depend on `cnf-data-ingestion` Task 8 rather than later `cnf-search-augmentation` alias/pantry/grocery slices.

Why this matters:

- Allergy matching moved from dietitian Phase 2 into family-health before warning UI.
- This may require provider identity/alias tasks before family-health warning surfaces.
- Orchestration waves should prevent implementers from building UI before the matcher exists.

Kickoff prompt:

```text
Review R12 in .kiro/specs/cnf-cross-spec-review: cross-spec wave ordering after pulled-forward allergy matching. Required context: .kiro/specs/cnf-health-orchestration/design.md, .kiro/specs/cnf-health-orchestration/tasks.md, .kiro/specs/family-health-profiles/tasks.md, .kiro/specs/cnf-data-ingestion/tasks.md, .kiro/specs/cnf-search-augmentation/tasks.md. Identify the next sequencing conflict, give 2-3 ordering solutions, recommend one, and wait for my decision.
```

Resolution note:

- Family-health no longer waits behind broader search/grocery polish once the provider foundation exists.
- `cnf-data-ingestion` Task 8 remains the enabling seam for provider-backed ingredient matching.
- Search alias/pantry/grocery work continues later as reuse/extension work, not as a blocker for the first household allergy/intolerance reminder surface.

---

## R13 - DTO Shape Risks: Warnings, Schedule Records, Search Filters

- [x] Resolved: keep `warnings` as a non-null array on actual `RecipeDto` and `ScheduleRecipeDto` objects, and reserve `null` for the outer `ScheduleDayDto.recipe` only when a planner slot is empty. Continue treating `healthyOnly` as separate search-contract drift owned by `cnf-search-augmentation` Task 1.

Why this matters:

- `ScheduleRecipeDto` is a positional C# record.
- Letting `warnings` be null on assigned recipes blurs "evaluated and found none" vs "not evaluated".
- Search filters already have `healthyOnly` drift, but that cleanup belongs to `cnf-search-augmentation` Task 1 rather than the family-health warning contract.

Kickoff prompt:

```text
Review R13 in .kiro/specs/cnf-cross-spec-review: DTO shape risks. Required context: specs/openapi.yaml RecipeDto, ScheduleRecipeDto, RecipeSearchFiltersDto, api/src/RecipeApi/Dto/ScheduleDays.cs, api/src/RecipeApi/Dto/RecipeSearchFiltersDto.cs, .kiro/specs/family-health-profiles/tasks.md Tasks 2, 5, 6, .kiro/specs/cnf-search-augmentation/tasks.md Task 1. Surface one contract risk, propose 2-3 fixes, recommend one, and wait for my decision.
```

---

## R14 - LLM Recommendation Safety, Privacy, And Opt-Out

- [x] Resolved: block health-agent recommendation workflow enqueue upstream when `health_guidance_enabled` is disabled, and keep the processor-level early return as defense in depth before any LLM payload is built.

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
- 2026-05-12: R14 resolved. Health guidance opt-out must stop dietitian recommendation workflow enqueue upstream, not only short-circuit inside `GenerateWeeklyRecommendationsProcessor`. Keep the processor guard too so no LLM payload is built if an enqueue path regresses.
