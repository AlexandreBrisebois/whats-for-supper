# Design Document: Dietitian Agent — Phase 2

## Overview

This feature upgrades week-level diet quality and family-health warnings after the CNF/provider foundation is already available. It does not seed CNF data and does not implement `NutrientLookup`; it consumes those services from `cnf-data-ingestion`.

The design has three runtime seams:

1. Deterministic HEFI-style scoring.
2. Reuse of deterministic family-health ingredient-level allergy/intolerance matching.
3. Bounded LLM weekly recommendations.

No LLM is used for scoring or allergy matching. The LLM is used only for selecting and explaining weekly recommendations from a validated candidate list.

**Hard dependencies:**
- `cnf-data-ingestion` complete.
- `cnf-search-augmentation` health nudge explainability complete.
- `family-health-profiles` complete.
- `recipe-categorization` complete.

---

## Architecture

```mermaid
flowchart TD
    subgraph Provider["Food data provider foundation"]
        A[cnf-data-ingestion] --> B[Provider-backed NutrientLookup]
        A --> C[ingredient_categories.cnf_food_id]
        A --> D[cnf_foods food_name_en + food_name_fr]
    end

    subgraph HEFI["HEFIScorer"]
        E[Weekly recipe dietary profiles] --> F[Provider nutrient summaries]
        B --> F
        F --> G[Compute HEFI components]
        G --> H[weekly_plans.hefi_score]
    end

    subgraph Allergy["Family-health ingredient reminders"]
        I[Family HealthProfile] --> J[ConditionRuleEngine extension]
        K[Recipe supply[]] --> B
        B --> J
        D --> J
        J --> L[RecipeWarning hard/soft/info]
    end

    subgraph Recommend["GenerateWeeklyRecommendationsProcessor"]
        HG[health_guidance_enabled] --> M{Enabled + needs suggestions?}
        H --> M
        M -->|Yes| N[Build bounded candidate payload]
        N --> O[LLM call]
        O --> P[Validate recipe IDs]
        P --> Q[weekly_plans.recommendations]
        M -->|No| R[Clear/skip recommendations, no LLM]
    end

    subgraph API["GET /api/schedule"]
        H --> S[ScheduleDays.hefiScore]
        Q --> T[ScheduleDays.recommendations]
        L --> U[Schedule warnings from family-health path]
    end
```

---

## Seam Inventory

| Seam | Existing shape | What we add | Risk |
|---|---|---|---|
| `weekly_plans` | `grocery_items`, `balance_summary`, `grocery_state` | `hefi_score jsonb`, `recommendations jsonb` | Additive |
| `ScheduleDays` | Existing schedule response | Nullable `hefiScore`, nullable `recommendations` | Positional record: append only |
| `GroceryRecomputeService` | Computes grocery items and balance summary | Computes HEFI and optionally triggers recommendations | Avoid disrupting grocery state/recompute |
| `ConditionRuleEngine` | Family-health deterministic warning engine | Ingredient-level provider matches | Must preserve existing overloads |
| Provider lookup | Owned by `cnf-data-ingestion` | Consume only | Do not reimplement raw SQL lookup here |
| Health nudge explainability | Owned by `cnf-search-augmentation` | Use reason/source/confidence for health-facing output | Avoid black-box advice |

---

## Database Changes

Only dietitian-owned weekly plan columns are added here:

```sql
ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS
    hefi_score jsonb DEFAULT NULL;

ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS
    recommendations jsonb DEFAULT NULL;
```

Do not add CNF schema, `pg_trgm`, or `ingredient_categories.cnf_food_id` here. Those belong to `cnf-data-ingestion`.

---

## Models

### `HEFIScore`

```csharp
public record FopWeekSummary(
    int HighInSaturatedFatDays,
    int HighInSugarsDays,
    int HighInSodiumDays);

public record HEFIScore(
    double TotalScore,
    double VegetableFruitScore,
    double WholeGrainScore,
    double ProteinFoodScore,
    double PlantProteinRatio,
    double SodiumScore,
    double SaturatedFatScore,
    FopWeekSummary FopWeekSummary,
    string Source,
    string Confidence);
```

`Source` and `Confidence` follow the health nudge explainability categories from `cnf-search-augmentation`.

### `WeeklyRecommendation`

```csharp
public record WeeklyRecommendation(
    Guid RecipeId,
    string RecipeName,
    string Reason,
    string Source,
    string Confidence);
```

These records describe the dietitian-owned domain payload. R10 resolves public contract exposure separately: the system keeps shared explainability metadata internally by default and only exposes structured `source` / `confidence` detail through dietitian-owned surface-specific DTOs when the planner information affordance actually needs it.

`HEFIScore` remains the internal technical/domain name for the scoring payload and storage shape. Until validation proves exact HEFI-2019 parity, user-facing planner copy should instead use softer labels such as `Week balance`, `Canada's Food Guide alignment`, or `Estimated week balance`.

---

## HEFI Scoring

`HEFIScorer` is a deterministic service.

Inputs:
- recipe dietary profiles,
- provider-backed nutrient summaries,
- provider food-guide group coverage.

Outputs:
- `HEFIScore`,
- `FopWeekSummary`,
- source/confidence labels.

Implementation note: if exact HEFI-2019 SAS parity is not implemented, label the result as an approximation in documentation and UI copy. Exact parity requires validation against a published reference dataset. Until that validation exists, keep `HEFI` as the technical implementation term and use softer user-facing copy on planner surfaces.

For provider-backed week scoring, derive source/confidence from the shared internal `NutritionEstimateMetadata` produced upstream by `cnf-data-ingestion`. HEFI must not invent a separate approximation heuristic. If any materially contributing meal falls to `low` confidence because of sparse provider coverage, 100g fallback, or default yield assumptions, the week-level HEFI confidence should also degrade conservatively.

---

## Ingredient-Level Allergy And Intolerance Matching Reuse

The first provider-backed ingredient-level allergy/intolerance matching seam belongs to `family-health-profiles`. Dietitian Phase 2 reuses it for candidate filtering, explanation context, and recommendation safety reminders. It must not fork the synonym table or redefine warning semantics.

```csharp
public interface IIngredientHealthMatchService
{
    Task<IReadOnlyList<RecipeWarning>> EvaluateRecipeAsync(
        FamilyMember member,
        Recipe recipe,
        CancellationToken ct);
}
```

The match object should expose:
- provider food ID,
- English name,
- localized/French name where available,
- food-guide group,
- match confidence if available.

Warnings keep `family-health-profiles` levels:
- possible allergy match -> `hard` reminder,
- intolerance match -> `soft`,
- preference mismatch -> `info`.

Reminder copy must stay conservative: "check ingredients" / "possible match". Presence of a warning does not block planning; absence of a warning is not allergy-safe proof.

---

## Weekly Recommendations

`GenerateWeeklyRecommendationsProcessor` follows existing workflow processor patterns.

Steps:

1. Recommendation orchestration checks `health_guidance_enabled` before enqueue. If disabled, it does not enqueue `GenerateWeeklyRecommendationsProcessor`.
2. Load week plan and schedule.
3. If health guidance disabled, clear/skip recommendations and return before building an LLM payload.
4. If no open dinner slots, clear recommendations.
5. If week is balanced and no HEFI improvement target exists, clear recommendations.
6. If recommendation hash matches current inputs, skip LLM.
7. Load candidate recipes from the user's library, excluding current week recipes.
8. Build a compact payload with balance/HEFI state, conditions/preferences, and candidate recipe IDs.
9. Call LLM once.
10. Validate returned recipe IDs against candidates.
11. Store recommendations.

All allergy/intolerance reminder context should be handled deterministically before candidates are sent to the LLM. The LLM must not invent allergy conclusions or turn reminders into planning blocks.

### Recommendation UI disclosure

Planner recommendation cards show only the primary recommendation reason by default. Source/confidence/limitation details live behind a compact information icon.

Default card content:
- recipe name,
- one short reason,
- primary action to view/open recipe,
- optional dismiss action.

Information detail content:
- reason,
- source,
- confidence,
- whether nutrition was estimated,
- allergy-safety limitation text when relevant.

Do not render the full justification inline on planner cards. The parent utility goal is quick decision-making, not a nutrition audit.

---

## OpenAPI Contract Delta

Add:
- `HEFIScoreDto`
- `FopWeekSummaryDto`
- `WeeklyRecommendationDto`
- nullable `hefiScore` on `ScheduleDays`
- nullable `recommendations` on `ScheduleDays`

Keep the over-the-wire DTO/property name `hefiScore` for this feature slice to avoid unnecessary contract churn, but do not require the planner UI to render that exact label to the user.

R10 decision:
- Do not add broad generic explainability fields to unrelated search or schedule DTOs in this branch.
- If planner recommendation or HEFI detail surfaces need structured over-the-wire explainability, add dietitian-owned DTOs or nested detail objects contract-first and regenerate clients in that feature slice.

---

## Testing Strategy

| Seam | Test |
|---|---|
| HEFI scorer | deterministic component scores; null nutrition graceful; source/confidence present |
| HEFI validation | documented comparison to reference dataset or explicit approximation label and softer user-facing label until validated |
| Ingredient-level allergy | shellfish/shrimp hard warning; gluten/wheat soft warning; no duplicate warnings |
| Provider fallback | missing provider match falls back to existing family-health behavior |
| Recommendations | idempotence; no open slots skip; invalid recipe IDs discarded; LLM errors preserve prior state |
| Health guidance disabled | HEFI nudges/recommendations hidden or skipped |
| Health agent disabled | health guidance disabled prevents workflow enqueue and LLM call |
| Recommendation information affordance | planner card exposes an information icon/sheet for source/confidence details without inline clutter |
| OpenAPI drift | schedule DTO includes `hefiScore` and `recommendations` consistently |

---

## Notes / Decisions

- **2026-05-11**: Updated to consume `cnf-data-ingestion` provider foundation instead of duplicating CNF ingestion and lookup.
