# Tasks: CNF Search Augmentation

Each task is a vertical slice. Do not start this spec until `cnf-data-ingestion` Tasks 1-8 are complete.

**Before marking any task done:**
- `task agent:drift` — zero drift confirmed
- `task agent:test:impact` — targeted tests pass
- `task review` — full suite passes

---

## Task Dependency Graph

```json
{
  "waves": [
    ["Task 1"],
    ["Task 2"],
    ["Task 3", "Task 4"],
    ["Task 5", "Task 6"],
    ["Task 7"]
  ]
}
```

---

## Task 1 — Search contract drift cleanup

**What:** Reconcile existing search DTO/OpenAPI drift before adding new CNF search behavior.

**Read before starting:**
- `specs/openapi.yaml` — `RecipeSearchReasonDto`, `RecipeSearchFiltersDto`
- `api/src/RecipeApi/Dto/RecipeSearchReasonDto.cs`
- `api/src/RecipeApi/Dto/RecipeSearchFiltersDto.cs`
- `api/src/RecipeApi/Services/RecipeSearchService.cs`

**Step 1 — Write tests first:**

Create or update contract/drift tests:

1. Every `RecipeSearchReasonDto.source` emitted by `RecipeSearchService` exists in the OpenAPI enum.
2. Pantry-photo boost emits `inventory-fit`, and no undocumented pantry-specific reason source is reintroduced.
3. `RecipeSearchFiltersDto` C# JSON properties match OpenAPI filter properties exactly.
4. `healthyOnly` is either formalized through an implementation-validated contract update, or removed from code.

**Step 2 — Contract and implementation:**

1. Update `specs/openapi.yaml`.
2. Confirm `RecipeSearchService.ApplyPantryBoostAsync` continues to use `inventory-fit`.
3. Ensure generated/mock PWA types remain aligned if contract generation is required.

**Definition of done:** Contract drift tests pass. `task agent:drift`, `task agent:test:impact`, and `task review` pass.

- [ ] Task 1 complete

---

## Task 2 — Extend CNF ingredient alias expansion

**What:** Extend the existing `ICnfIngredientAliasExpander` seam beyond bilingual CNF names through the active food data provider strategy. Do not add a second expander to `RecipeSearchService`.

**Dependency:** Task 1 complete.

**Read before starting:**
- `cnf-data-ingestion` design § `RecipeSearchService` alias expansion
- design.md § Existing service extended: `ICnfIngredientAliasExpander`
- `api/src/RecipeApi/Services/RecipeSearchService.cs`

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Services/CnfIngredientAliasExpanderTests.cs`:

1. `"boeuf hache"` expands to `"ground beef"` and `"minced beef"`.
2. `"minced beef"` expands to `"ground beef"` and `"boeuf hache"`.
3. `"courgette"` expands to `"zucchini"`.
4. Expansion returns at most 8 terms.
5. Expansion deduplicates case-insensitively and omits terms already present in the query.
6. Empty query returns no expansions.
7. Expander exception path returns no expansions and logs warning/error.
8. A fake non-CNF provider can supply localized aliases through the same interface without changing `RecipeSearchService`.

Add to `api/src/RecipeApi.Tests/Integration/RecipeSearchIntegrationTests.cs`:

1. Fake alias expander maps `"minced beef"` to `"ground beef"`; query `"minced beef"` returns recipe containing `"ground beef"`.
2. Fake alias expander maps `"boeuf hache"` to `"ground beef"`; query `"boeuf hache"` returns recipe containing `"ground beef"`.
3. Original query behavior is preserved when the expander returns empty.

**Step 2 — Implementation:**

Modify:
- `api/src/RecipeApi/Services/CnfIngredientAliasExpander.cs`
- `api/src/RecipeApi/Services/PostgresCnfIngredientAliasExpander.cs`

Modify `RecipeSearchService`:
1. Keep the existing optional `ICnfIngredientAliasExpander?` injection from `cnf-data-ingestion` Task 8.
2. For non-empty queries, build expanded lexical query from original + aliases.
3. Preserve original query for telemetry, urgent-query planner logic, and response semantics.

**Definition of done:** Alias expander tests pass; search integration tests pass with fake expander; no OpenAPI DTO change beyond Task 1. `task review` passes.

- [ ] Task 2 complete

---

## Task 3 — Search reason for ingredient aliases

**What:** Add an explicit reason source for CNF alias matches.

**Dependency:** Task 2 complete.

**Step 1 — Write tests first:**

Update OpenAPI/contract tests:

1. `RecipeSearchReasonDto.source` enum includes `ingredient-alias-match`.
2. PWA/client models accept `ingredient-alias-match` after regeneration.

Add to `RecipeSearchIntegrationTests.cs`:

1. Query `"poulet"` with fake alias match `"chicken"` returns a result with one `ingredient-alias-match` reason.
2. The reason label is deterministic, e.g. `"Matched poulet to chicken"`.
3. Multiple alias matches produce at most one alias reason per result.

**Step 2 — Implementation:**

1. Update `specs/openapi.yaml`.
2. Run the repo's OpenAPI/client reconciliation task if required.
3. Add alias reason generation in `RecipeSearchService`.

**Definition of done:** OpenAPI drift passes. Search result reason tests pass. `task review` passes.

- [ ] Task 3 complete

---

## Task 4 — Pantry matching by CNF identity

**What:** Improve pantry-assisted search so equivalent ingredient strings match through shared provider food identity. Canada CNF uses `cnf_food_id`.

**Dependency:** Task 2 complete.

**Read before starting:**
- `api/src/RecipeApi/Services/InventoryCaptureService.cs`
- `api/src/RecipeApi/Services/RecipeSearchService.cs` — `ApplyPantryBoostAsync`
- `api/src/RecipeApi/Models/IngredientCategory.cs`

**Step 1 — Write tests first:**

Add to `RecipeSearchIntegrationTests.cs`:

1. Pantry snapshot contains `"boeuf hache"`; recipe ingredients contain `"ground beef"`; both map to the same fake `cnf_food_id`; recipe receives inventory boost.
2. Pantry snapshot contains `"courgette"`; recipe ingredients contain `"zucchini"`; shared `cnf_food_id` boosts recipe.
3. When CNF IDs are missing, exact normalized string matching still works.
4. When neither CNF nor exact normalized matching succeeds, no pantry boost is applied.
5. Pantry boost reason source remains `inventory-fit`.

**Step 2 — Implementation:**

Create `api/src/RecipeApi/Services/CnfPantryMatcher.cs` per design.md.

Modify `RecipeSearchService.ApplyPantryBoostAsync`:
1. Use `ICnfPantryMatcher` when available.
2. Keep exact normalized fallback.
3. Keep boost bounded by existing `PantryMatchBoost`.
4. Do not persist pantry snapshots.

**Definition of done:** Pantry integration tests pass. Existing photo/pantry search tests still pass. `task review` passes.

- [ ] Task 4 complete

---

## Task 5 — Nutrition-aware search filters gated by health guidance settings

**What:** Add deterministic nutrition filters based on provider-backed FOP flags, suppress them when health guidance is disabled, and provide health nudge reason/source/confidence metadata for any user-facing health explanation added here.

**Dependency:** Tasks 1 and `cnf-data-ingestion` Task 7 complete. Task 2 is not required.

**Read before starting:**
- `specs/openapi.yaml` — `RecipeSearchFiltersDto`
- `api/src/RecipeApi/Dto/RecipeSearchFiltersDto.cs`
- `api/src/RecipeApi/Services/RecipeSearchService.cs` — `ApplyFilters`
- `api/src/RecipeApi/Models/RecipeDietaryProfile.cs`
- `api/src/RecipeApi/Models/FopFlags.cs`
- `api/src/RecipeApi/Services/SettingsService.cs`
- design.md § Health nudge explainability
- `.kiro/specs/family-health-profiles/requirements.md` — preferences, allergy/intolerance ownership, warning levels
- CNF ingestion design § Health guidance settings

**Step 1 — Write tests first:**

Update contract tests:

1. OpenAPI contains `lowSodium`, `lowSugar`, `lowSaturatedFat`, `diabetesFriendly`.
2. C# DTO contains matching nullable bool properties.
3. PWA generated types/mocks align after reconciliation.

Add to `RecipeSearchIntegrationTests.cs`:

1. `lowSodium: true` excludes recipes with `fopFlags.highInSodium == true`.
2. `lowSugar: true` excludes recipes with `fopFlags.highInSugars == true`.
3. `lowSaturatedFat: true` excludes recipes with `fopFlags.highInSaturatedFat == true`.
4. `diabetesFriendly: true` excludes high sugar and high sodium recipes.
5. Any nutrition-aware filter excludes recipes with `fopFlags = null`.
6. `appliedFilters` mirrors all nutrition filter values.
7. When `health_guidance_enabled` is false, nutrition-aware filters/boosts are not applied and normal non-health search still returns results.
8. Any user-facing health reason produced by this task includes deterministic reason/source/confidence.
9. New health reason copy avoids moralizing standalone labels such as `"bad"` or `"unhealthy"`.
10. No allergy-safe claim is emitted by search filters.
11. Detailed source/confidence/limitation metadata is available behind an information affordance, not rendered inline by default.
12. Provider-backed health explanations reuse the shared `NutritionEstimateMetadata` mapping from `cnf-data-ingestion`; search does not invent a second confidence heuristic.

**Step 2 — Contract and implementation:**

1. Update `specs/openapi.yaml`.
2. Update `RecipeSearchFiltersDto`.
3. Apply filters in `RecipeSearchService`, using deterministic `dietary_profile.fopFlags` only, and only when health guidance is enabled.
4. Add internal health nudge metadata per design.md when surfacing health explanations, reusing shared `NutritionEstimateMetadata` from `cnf-data-ingestion` for provider-backed confidence/source mapping. If the API needs to expose new fields, update OpenAPI first and regenerate clients.
5. Reconcile generated clients/mocks.

**Definition of done:** Contract, API, and search integration tests pass. `task agent:drift`, `task agent:test:impact`, and `task review` pass.

- [ ] Task 5 complete

---

## Task 6 — Locale-aware grocery list reconciliation

**What:** Use provider bilingual/canonical food identity to merge equivalent grocery lines across English and French recipe ingredients, displaying the cleaned-up list in the configured system default locale without translating recipe content.

**Dependency:** Task 2 complete and `cnf-data-ingestion` Task 8 complete. Task 5 is not required.

**Read before starting:**
- design.md § New service: `IGroceryLocaleReconciler`
- design.md § Active grocery locale
- `api/src/RecipeApi/Services/GroceryRecomputeService.cs`
- `api/src/RecipeApi/Dto/GroceryLineItemDto.cs`
- `api/src/RecipeApi/Models/IngredientCategory.cs`
- `api/src/RecipeApi/Services/ScheduleService.cs` grocery state persistence
- current configuration/env handling, including `IMPORT_TARGET_LANGUAGE` and the configured default UI locale
- archived grocery specs for invariants around `grocery_items`, `grocery_state`, and human reclassification

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Configuration/GroceryDisplayLocaleOptionsTests.cs`:

1. Default UI language `EN` resolves active grocery locale to English.
2. Default UI language `FR` resolves active grocery locale to French.
3. Default UI language `NONE` follows current unset convention and resolves to English.
4. Unset default UI language resolves to English.
5. `IMPORT_TARGET_LANGUAGE=NONE` does not affect active grocery locale.
6. Invalid default UI language fails startup/config validation with a clear error.

Add to `api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs`:

1. English locale: recipe A supplies `"chicken"`, recipe B supplies `"poulet"`, both normalized keys map to the same fake `cnf_food_id`; recompute emits one grocery line with `displayName = "chicken"`.
2. French locale: same inputs emit one grocery line with `displayName = "poulet"`.
3. Recipe language lock: source recipe `raw_metadata.supply[]` values remain `"chicken"` and `"poulet"` after recompute.
4. Missing provider identity: `"chicken"` and `"poulet"` remain separate lines using existing normalized-key behavior.
5. Incompatible units: shared provider identity with incompatible/unknown units remains separate lines.
6. Compatible units: shared provider identity and compatible units roll up quantity using existing `UnitNormalizer`.
7. Section conflict: a human/manual `ingredient_categories` section wins over lower-confidence non-human rows.
8. Missing localized provider label falls back to the best original ingredient display name.

Add grocery-state preservation coverage, either in `GroceryRecomputeServiceTests.cs` or `ScheduleServiceTests.cs`:

1. Existing checked state for `"poulet"` remains checked after English-locale reconciliation emits `"chicken"`.
2. Existing checked state for `"chicken"` remains checked after French-locale reconciliation emits `"poulet"`.
3. Stale merged source display-name keys are not left behind if the recompute path updates `grocery_state`.

**Step 2 — Implementation:**

Create `api/src/RecipeApi/Services/GroceryLocaleReconciler.cs` per design.md.

Add a small resolver for grocery display locale that reads the existing default UI language configuration, for example:

```csharp
public interface IGroceryDisplayLocaleResolver
{
    string ResolveLocale();
}
```

Modify `GroceryRecomputeService`:
1. Inject optional `IGroceryLocaleReconciler?`.
2. Resolve active grocery locale from the configured default UI language; when `NONE` or unset, default to English.
3. Build reconciliation candidates from the current intermediate grocery rows.
4. If reconciler is available, group by provider food identity plus compatible unit bucket.
5. If reconciler is unavailable or provider identity is missing, keep existing `(normalizedKey, canonicalUnit)` grouping.
6. Persist the same `GroceryLineItemDto` shape.
7. Preserve or remap `grocery_state` checked values for merged display names in the same transaction.

**Decision note:** Grocery locale follows the configured system default only. It does not follow per-browser locale overrides or selected-member `preferredLanguage`. Checked-state preservation remains display-name remapping within the existing persisted state shape.

**Do NOT:**
- translate recipe cards, recipe ingredients, recipe names, or instructions,
- call an LLM or translation API,
- add a new grocery-specific locale environment variable,
- use `IMPORT_TARGET_LANGUAGE` to decide grocery display locale,
- change `GroceryLineItemDto` or `weekly_plans.grocery_items` shape without a separate contract task.

**Definition of done:** Locale config tests pass. Grocery recompute tests pass for English/French locale reconciliation, fallback behavior, unit compatibility, section conflicts, and grocery state preservation. Existing grocery reclassification and grocery state tests still pass. `task review` passes.

- [ ] Task 6 complete

---

## Task 7 — Health nudge explainability contract

**What:** Make the source/confidence/reason rules concrete for any health-facing search/planner nudge touched by this spec, without redefining family health profile allergy/preference semantics.

**Dependency:** Task 5 complete.

**Read before starting:**
- design.md § Health nudge explainability
- `.kiro/specs/family-health-profiles/requirements.md`
- future `.kiro/specs/dietitian-agent-phase2`
- any DTOs or UI surfaces touched by nutrition-aware filters or health reasons

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Services/HealthNudgeExplainabilityTests.cs`:

1. Source nutrition nudge emits source `source-nutrition` and confidence `high`.
2. CNF/provider estimate with complete nutrient coverage emits source `estimated-from-ingredients` and confidence `high`.
3. CNF/provider estimate with partial ingredient coverage emits confidence `medium`.
4. CNF/provider estimate with unknown units/default quantities emits confidence `low`.
5. Food-guide group nudge emits source `food-guide-group`.
6. New health copy does not contain standalone moralizing labels: `"bad"`, `"guilty"`, `"junk"`, `"unhealthy"`.
7. `IsHealthyChoice` is never surfaced without at least one deterministic reason/source/confidence.
8. Allergy-safe claims are not emitted by this spec.
9. When health guidance is disabled, no health nudge metadata is surfaced or used for ranking.
10. Health nudge detail metadata is accessible behind an information icon/sheet/popover without cluttering the default result/card.

**Step 2 — Implementation:**

Create small shared types/helpers if needed:

```csharp
public enum HealthNudgeSource
{
    SourceNutrition,
    EstimatedFromIngredients,
    ProfileRule,
    FoodGuideGroup,
    Unknown
}

public enum HealthNudgeConfidence
{
    High,
    Medium,
    Low
}
```

Apply these only to surfaces touched by this spec. Do not change `family-health-profiles` warning semantics unless that spec is being implemented in the same slice with contract-first updates.

**Definition of done:** Explainability tests pass. Any new health-facing copy is deterministic, non-moralizing, and source/confidence-backed. Allergy/preference ownership remains in `family-health-profiles`. `task review` passes.

- [ ] Task 7 complete

---

## Notes / Decisions

- **2026-05-11**: Split from `cnf-data-ingestion` to keep CNF seed/FOP/bilingual foundation separate from broader search behavior and OpenAPI changes.
- **2026-05-11**: Use `inventory-fit` for pantry/photo inventory search reasons rather than introducing a second pantry-specific reason source.
- **2026-05-11**: Search augmentation must consume the food data provider strategy and respect `health_guidance_enabled`.
- **2026-05-11**: Grocery reconciliation may merge bilingual ingredient rows for display by shared provider food identity, but recipe content remains language-locked and no LLM translation is used.
- **2026-05-11**: Grocery cleanup display language follows the existing default UI language configuration. `NONE` follows the current unset convention; recipe import language remains controlled separately by `IMPORT_TARGET_LANGUAGE`.
- **2026-05-11**: Health nudges need reason/source/confidence. Allergy, intolerance, and preference semantics remain owned by `family-health-profiles` and future dietitian work.
