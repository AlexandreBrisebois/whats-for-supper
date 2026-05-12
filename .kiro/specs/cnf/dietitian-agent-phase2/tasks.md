# Tasks: Dietitian Agent — Phase 2

Each task is a vertical slice. Do not start this spec until the orchestration Wave 7 gate is reached.

**Hard dependencies before starting any implementation task:**
- `cnf-data-ingestion` complete.
- `cnf-search-augmentation` Task 7 complete.
- `family-health-profiles` complete, including provider-backed ingredient-level allergy/intolerance reminders.
- `recipe-categorization` complete.

**Before marking any task done:**
- `task agent:drift` — zero drift confirmed
- `task agent:test:impact` — targeted tests pass
- `task review` — full suite passes

---

## Task 1 — Contract and schema for HEFI/recommendations

**What:** Add only dietitian-owned weekly plan fields and schedule DTOs. No CNF schema or lookup changes.

**Step 1 — Write tests first:**

Create or update contract tests:
1. `ScheduleDays` OpenAPI schema includes nullable `hefiScore`.
2. `ScheduleDays` OpenAPI schema includes nullable `recommendations`.
3. Generated TypeScript client includes both fields.
4. C# `ScheduleDays` serializes/deserializes both fields when present and null.

**Step 2 — Schema:**

Add to `api/database/schema.sql`:

```sql
ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS
    hefi_score jsonb DEFAULT NULL;

ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS
    recommendations jsonb DEFAULT NULL;
```

**Step 3 — DTO/model changes:**

Add `HEFIScore`, `FopWeekSummary`, and `WeeklyRecommendation` records.

Append nullable `HefiScore` and `Recommendations` to `ScheduleDays`. Check all call sites before editing:

```bash
rg "new ScheduleDays\\(" api/src
```

Update OpenAPI first, then regenerate clients.

**Do NOT:** add `cnf_foods`, `pg_trgm`, `NutrientLookup`, or `ingredient_categories.cnf_food_id` here.

**Definition of done:** Contract drift passes and schedule serialization tests pass.

- [ ] Task 1 complete

---

## Task 2 — HEFI scorer

**What:** Implement deterministic week-level HEFI scoring using existing dietary profiles and provider-backed nutrition summaries.

**Dependency:** Task 1 complete.

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Services/HEFIScorerTests.cs`:
1. Null profiles -> total score 0 and FOP counts 0.
2. Vegetable/fruit-heavy week increases vegetable/fruit component.
3. Balanced protein/vegetable/grain week scores higher than all-null week.
4. Plant-protein ratio handles divide-by-zero.
5. High sodium days increment `FopWeekSummary.HighInSodiumDays`.
6. High saturated fat days increment `FopWeekSummary.HighInSaturatedFatDays`.
7. High sugar days increment `FopWeekSummary.HighInSugarsDays`.
8. Source/confidence fields are present.
9. Week-level source/confidence reuses shared `NutritionEstimateMetadata` from `cnf-data-ingestion`; HEFI does not invent a second approximation heuristic.
10. Any materially contributing meal with low-confidence provider estimates degrades week-level HEFI confidence conservatively.
11. Approximation vs exact HEFI mode is documented in output or docs.
12. Until exact HEFI parity is validated, user-facing copy requirements use a softer label such as `Week balance` or `Estimated week balance` instead of a bare HEFI label.

**Step 2 — Implementation:**

Create `api/src/RecipeApi/Services/HEFIScorer.cs`.

Use provider/nutrition summaries from `cnf-data-ingestion`; do not call raw SQL or implement CNF matching here.

**Step 3 — Validation note:**

If exact HEFI-2019 parity is claimed, validate against a published reference dataset and record the result in Notes/Decisions. Otherwise label the score as an approximation and keep the user-facing label softer than bare HEFI.

**Definition of done:** Scorer tests pass and validation/approximation decision is documented.

- [ ] Task 2 complete

---

## Task 3 — Wire HEFI into weekly recompute and schedule

**What:** Compute and persist `weekly_plans.hefi_score`, then return it from `GET /api/schedule`.

**Dependency:** Tasks 1-2 complete.

**Step 1 — Write tests first:**

Add to `GroceryRecomputeServiceTests.cs` and schedule tests:
1. Recompute writes non-null `hefi_score` when recipe profiles exist.
2. All null profiles write a valid zero/empty HEFI score.
3. HEFI write does not change `grocery_state`.
4. `GET /api/schedule` returns `hefiScore` when stored.
5. Health guidance disabled hides/suppresses user-facing HEFI nudges while preserving stored data if implementation stores it.

**Step 2 — Implementation:**

Extend `GroceryRecomputeService` to call `HEFIScorer`.

Extend `ScheduleService.GetScheduleAsync` to deserialize and return `hefiScore`.

**Definition of done:** Recompute and schedule tests pass.

- [ ] Task 3 complete

---

## Task 4 — Reuse family-health ingredient matching in dietitian flows

**What:** Reuse the family-health provider-backed ingredient matching seam in dietitian candidate filtering and recommendation context. Do not re-own or fork the matcher.

**Dependency:** `family-health-profiles` ingredient matching complete and provider lookup available.

**Step 1 — Write tests first:**

Add dietitian-flow tests:
1. Candidate recipe with family-health possible shellfish reminder is annotated or deprioritized according to recommendation rules.
2. Candidate recipe with no family-health reminder remains eligible.
3. Dietitian flow reuses the family-health matcher service; it does not instantiate a separate allergen synonym table.
4. Reminder copy remains `"Check ingredients for {allergy}: possible match in {ingredient}"` or equivalent approved copy.
5. Presence of a reminder does not block planning or auto-remove an already planned meal.
6. Absence of reminder is not represented as allergy-safe.

**Step 2 — Implementation:**

Inject/reuse the family-health ingredient matcher in the recommendation processor or candidate-preparation service. Upstream any needed synonym or confidence changes to `family-health-profiles` first.

**Definition of done:** Dietitian flows reuse family-health matching, recommendation tests pass, and no duplicate allergen matcher exists.

- [ ] Task 4 complete

---

## Task 5 — Recommendation processor

**What:** Generate 1-3 non-blocking weekly recipe recommendations from validated candidate recipes.

**Dependency:** Tasks 1-3 complete. Task 4 should be complete if family-health reminder-aware candidate filtering is required.

**Step 1 — Write tests first:**

Create `GenerateWeeklyRecommendationsProcessorTests.cs`:
1. Health guidance disabled -> workflow task is not enqueued or processor returns before payload build; LLM not called and recommendations cleared/skipped.
2. Balanced week -> LLM not called.
3. No open slots -> LLM not called.
4. Input hash unchanged -> LLM not called.
5. Valid LLM response -> recommendations written.
6. Unknown recipe IDs are discarded.
7. LLM throws -> prior recommendations preserved.
8. Candidate payload excludes full allergy lists unless deterministic allergy filtering has already handled them.
9. Recommendation reasons include source/confidence when health-related.
10. Recommendation justification details are exposed to the UI as metadata but not required inline in the card body.

**Step 2 — Implementation:**

Create `GenerateWeeklyRecommendationsProcessor` using existing workflow processor patterns.

Add workflow YAML if needed.

Trigger after weekly recompute only when eligible and health guidance is enabled. Do not enqueue the health agent when health guidance is disabled. Do not block recompute on the LLM call.

**Definition of done:** Processor tests pass and schedule integration returns recommendations.

- [ ] Task 5 complete

---

## Task 6 — PWA week-balance and recommendation display

**What:** Display the dietitian score and recommendation cards without blocking planner actions.

**Dependency:** Tasks 1, 3, and 5 complete.

**Step 1 — Write tests first:**

1. `hefiScore.totalScore` renders when present.
2. Null `hefiScore` renders no score and no error.
3. Recommendations render in open slots.
4. Empty/null recommendations render nothing.
5. Dismissing a recommendation hides it locally.
6. Health guidance disabled hides health/dietitian surfaces.
7. Recommendation card shows a compact information icon when source/confidence details exist.
8. Tapping the information icon opens a tooltip/sheet/popover with reason, source, confidence, and limitations.
9. Planner card body does not render full justification metadata inline.
10. Until exact HEFI parity is validated, the planner uses softer user-facing copy such as `Week balance`, `Canada's Food Guide alignment`, or `Estimated week balance` rather than a bare HEFI label.

**Step 2 — Implementation:**

Wire generated client fields into planner components.

Use calm, non-moralizing copy.

**Definition of done:** PWA tests pass and planner actions still work.

- [ ] Task 6 complete

---

## Task 7 — Documentation

**File to create:** `api/docs/DIETITIAN_AGENT_PHASE2.md`

Required content:
1. What the score measures, whether the implementation is exact or approximate, and why the user-facing label may say `Week balance` or `Estimated week balance` instead of `HEFI`.
2. What provider/CNF data contributes and what happens when it is unavailable.
3. How ingredient-level allergy/intolerance matching works and its limitations.
4. How weekly recommendations work, what the LLM sees, and what it does not see.
5. Token/cost behavior for recommendations.
6. Health guidance opt-out behavior.
7. Mermaid data-flow diagram.
8. Explicit statement: suggestions are not medical advice and do not replace a dietitian.

**Definition of done:** Documentation exists and `task review` passes.

- [ ] Task 7 complete

---

## Notes / Decisions

- **2026-05-11**: Replaced stale CNF ingestion and `NutrientLookup` tasks with dependencies on `cnf-data-ingestion`.
- **HEFI validation result**: *(fill in during Task 2)*
