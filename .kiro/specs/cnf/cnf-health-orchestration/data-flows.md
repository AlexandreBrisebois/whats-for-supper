# Data Flows Reference: CNF Health Orchestration

This document captures the data flows that connect CNF/provider data, recipe categorization, search, grocery lists, family health profiles, and dietitian recommendations.

---

## 1. CNF Provider Seed Flow

```mermaid
flowchart TD
    A[Operator runs task data:cnf:seed] --> B[Download CNF ZIP]
    B --> C[Parse FOOD_NM.csv]
    B --> D[Parse NUTRIENT_NAME.csv]
    B --> E[Parse NUTRIENT_AMOUNT.csv]
    C --> F[Build English/French food names]
    D --> G[Map nutrient ids]
    E --> H[Extract sodium/sugar/saturated fat/carbs]
    F --> I[Upsert cnf_foods]
    H --> I
    I --> J[Provider strategy exposes lookup + aliases]
```

Owned by: `cnf-data-ingestion`

Key decisions:
- `food_name_en` is required.
- `food_name_fr` is optional.
- CNF is the first provider strategy, not the app's permanent only provider.
- No runtime external calls.

---

## 2. Recipe Categorization And Nutrition Flow

```mermaid
flowchart TD
    A[Recipe raw_metadata.supply] --> B[IngredientNormalizer]
    B --> C[NutrientLookup]
    C --> D{cnf_food_id cached?}
    D -->|Yes| E[Load cnf_foods row]
    D -->|No| F[pg_trgm provider search]
    F --> G{similarity >= threshold?}
    G -->|Yes| H[Cache cnf_food_id]
    G -->|No| I[Return null]
    E --> J[Aggregate nutrients per recipe portion]
    H --> J
    I --> K[Fallback raw_metadata.nutrition]
    J --> L[Compute FopFlags]
    K --> L
    L --> M[Update dietary_profile + IsHealthyChoice signals]
```

Owned by: `cnf-data-ingestion`

Key decisions:
- EF InMemory tests fake the provider/search seam.
- Production uses parameterized raw SQL for Postgres-specific trigram features.
- Nutrition estimates must be labelled when shown to users.

---

## 3. Search Alias And Pantry Flow

```mermaid
flowchart TD
    A[User search query] --> B[Alias expander]
    B --> C[Provider localized names]
    B --> D[Static synonym groups]
    C --> E[Expanded lexical query]
    D --> E
    E --> F[RecipeSearchService ranking]
    F --> G[Reasons: ingredient-alias-match]

    H[Pantry snapshot ingredients] --> I[Resolve pantry cnf_food_id]
    J[Recipe ingredients] --> K[Resolve recipe cnf_food_id]
    I --> L{shared provider identity?}
    K --> L
    L -->|Yes| M[Inventory boost]
    L -->|No| N[Exact normalized fallback]
```

Owned by: `cnf-search-augmentation`

Key decisions:
- Query expansion is bounded and deterministic.
- No OpenAPI shape change for basic bilingual expansion.
- Search reasons must stay contract-aligned.

---

## 4. Grocery Reconciliation Flow

```mermaid
flowchart TD
    A[Weekly plan recipes] --> B[Extract raw supply entries]
    B --> C[Normalize ingredient names]
    C --> D[Load ingredient_categories]
    D --> E{shared cnf_food_id?}
    E -->|Yes| F[Group by provider identity + compatible unit bucket]
    E -->|No| G[Existing normalizedKey grouping]
    F --> H[Choose displayName from default UI language]
    G --> I[Use existing displayName behavior]
    H --> J[Preserve grocery_state checked values]
    I --> J
    J --> K[Persist same GroceryLineItemDto shape]
```

Owned by: `cnf-search-augmentation`

Key decisions:
- Recipe language is not changed.
- Grocery display language follows the existing default UI language configuration.
- `IMPORT_TARGET_LANGUAGE=NONE` does not affect grocery display.
- Existing grocery DTO shape is preserved unless a separate contract task changes it.

---

## 5. Family Health Warning Flow

```mermaid
flowchart TD
    A[FamilyMember.health_profile] --> B[ConditionRuleEngine]
    C[Recipe dietary_profile] --> B
    D[Optional nutrition/FopFlags] --> B
    P[Provider ingredient matches] --> B
    B --> E[RecipeWarning array]
    E --> F[Discovery recipe cards]
    E --> G[Planner slots]
```

Owned by: `family-health-profiles`

Key decisions:
- Allergy/intolerance reminders are provider-backed when possible.
- Allergy copy is member-specific and non-blocking: "check ingredients" / "possible match".
- A planned meal is still allowed when a warning exists.
- Absence of a warning is not an allergy-safe claim.

Key decisions:
- No LLM.
- Warnings are informational and non-blocking.
- Allergies, intolerances, preferences, and warning levels are owned here.

---

## 6. Dietitian Phase 2 Flow

```mermaid
flowchart TD
    A[Weekly plan] --> B[GroceryRecomputeService]
    B --> C[HEFIScorer]
    C --> D[weekly_plans.hefi_score]
    B --> E{health guidance enabled + isBalanced false + open slots?}
    E -->|Yes| F[GenerateWeeklyRecommendations]
    F --> G[LLM receives compact plan context]
    G --> H[weekly_plans.recommendations]
    D --> I[GET /api/schedule]
    H --> I
```

Owned by: `dietitian-agent-phase2`

Key decisions:
- HEFI scoring is deterministic.
- Ingredient-level allergy/intolerance matching is deterministic.
- LLM is used only for weekly recommendation text/selection.
- Recommendations are suggestions, not automatic assignments.
- Health guidance disabled stops recommendation generation before the LLM call.
- Recommendation justification details flow to the UI as detail metadata behind an information affordance.
