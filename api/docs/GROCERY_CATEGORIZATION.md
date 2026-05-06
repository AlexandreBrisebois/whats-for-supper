# Grocery Section Categorization

## Overview

This document describes the server-authoritative grocery categorization system introduced to replace the brittle client-side keyword mapper. Grocery items are now categorized server-side, pre-aggregated, and stored on the `weekly_plans` row — the client receives a ready-to-render list with zero processing required.

**Date**: 2026-05-03  
**Status**: Implemented

---

## Data Flow

The system has two independent pipelines that work together:

1. **Categorization pipeline** — runs at recipe import time, populates the `ingredient_categories` cache via LLM.
2. **Recompute pipeline** — runs whenever the week's recipe set changes, reads the cache and writes pre-aggregated `grocery_items` to `weekly_plans`.

```mermaid
flowchart TD
    subgraph Import["Recipe Import Workflow"]
        A[ExtractRecipe] --> B[GenerateHero]
        B --> C[SyncRecipe]
        C --> D[CategorizeIngredients]
        D --> E[RecipeReady]
    end

    subgraph Categorize["CategorizeIngredientsProcessor"]
        D --> F{Check ingredient_categories}
        F -->|Cache hit| G[Use cached section]
        F -->|Cache miss| H[Batch LLM call]
        H --> I[Validate sections]
        I --> J[Upsert ingredient_categories]
    end

    subgraph Recompute["GroceryRecomputeService"]
        K[AssignRecipeAsync] --> R
        L[RemoveRecipeAsync] --> R
        M[SyncRecipeProcessor] --> R
        R[RecomputeGroceryItemsAsync]
        R --> N[Load supply[] from raw_metadata]
        N --> O[Normalize names → normalized_key]
        O --> P{Lookup ingredient_categories}
        P -->|Found| Q1[Use DB section]
        P -->|Not found| Q2[AisleMapper fallback]
        Q1 --> S[Group by key+unit, sum quantities]
        Q2 --> S
        S --> T[Write grocery_items to weekly_plans]
    end

    subgraph API["GET /api/schedule"]
        T --> U[Read grocery_items from weekly_plans]
        U --> V[Return ScheduleDays with groceryItems]
    end

    subgraph Client["GroceryList.tsx"]
        V --> W[Render groceryItems directly]
        W --> X[Group by section for display]
    end
```

### Pipeline summary

| Trigger | Service | Reads | Writes |
|---|---|---|---|
| Recipe import | `CategorizeIngredientsProcessor` | `recipe.raw_metadata`, `ingredient_categories` | `ingredient_categories` |
| Assign / remove / re-import | `GroceryRecomputeService` | `ingredient_categories`, `AisleMapper` | `weekly_plans.grocery_items` |
| `GET /api/schedule` | `ScheduleService` | `weekly_plans.grocery_items` | — |

The client receives `groceryItems` as a pre-computed array and groups it by `section` for display only — no normalization, no keyword matching, no index lookups at load time.

---

## Components

### `CategorizeIngredientsProcessor`

Runs as the fourth step in the `recipe-import` workflow (after `SyncRecipe`, before `RecipeReady`). Responsible for populating the `ingredient_categories` cache.

**Steps:**
1. Parse `recipeId` from the workflow payload.
2. Read `supply[]` from `recipe.raw_metadata`.
3. Normalize each ingredient name via `IngredientNormalizer.Normalize`.
4. Query `ingredient_categories` for existing entries — cache hits are skipped.
5. Send uncached names to the LLM in a single batch call.
6. Validate each returned section against the `GrocerySection` enum; discard invalid entries with a warning log.
7. Upsert valid results into `ingredient_categories` with `source='llm'`.

### `GroceryRecomputeService`

Triggered by `AssignRecipeAsync`, `RemoveRecipeAsync`, and `SyncRecipeProcessor`. Responsible for writing the pre-aggregated grocery list to `weekly_plans`.

**Steps:**
1. Load all `CalendarEvents` for the week with their `Recipe.RawMetadata`.
2. Extract `supply[]` from each recipe's `raw_metadata` jsonb.
3. Normalize each supply name via `IngredientNormalizer.Normalize`.
4. Look up `normalized_key` in `ingredient_categories`; fall back to `AisleMapper.MapToSection` if not found.
5. Group by `(normalizedKey, unitText)`: sum quantities for same-unit pairs, keep separate entries for different units.
6. Write the result as `grocery_items` jsonb on `weekly_plans`.

### `AisleMapper`

A fast, deterministic, server-side keyword matcher covering 10 grocery sections with longest-match precedence. Used as a fallback when an ingredient is not yet in `ingredient_categories`. Runs synchronously — no I/O, no LLM call.

---

## LLM Cost

### When a call is made

`CategorizeIngredientsProcessor` makes at most one LLM call per recipe import, and only when at least one ingredient name is not already present in `ingredient_categories`. If all ingredient names for a recipe are already cached, no LLM call is made.

### Batch strategy

All uncached ingredient names for a recipe are collected and sent in a **single LLM call** — not one call per ingredient. The batch contains only the names that are missing from the cache (the delta).

### Cache effect

The `ingredient_categories` table is a persistent, growing index. As more recipes are imported, new recipes increasingly share ingredients with previously imported ones. Over time, the fraction of uncached names per import shrinks toward zero.

- A recipe whose ingredients are fully cached → **0 LLM calls**
- A brand-new recipe with 15 unique ingredients → **1 LLM call** with 15 names in the batch

### Re-import behaviour

Re-importing a recipe does not trigger a new LLM call if all its ingredients are already in `ingredient_categories`. The processor checks the cache first; only the delta is sent.

### Manual overrides

Entries with `source='manual'` are never overwritten by the LLM. The upsert logic skips any `ingredient_categories` row whose `source` is `'manual'`, preserving operator-curated categorizations.

---

## LLM Integration

### Which service calls the LLM

`CategorizeIngredientsProcessor` is the only service in the `recipe-import` workflow that calls the LLM for categorization. It uses the injected `IChatClient` — the same interface used by the existing recipe extraction and description generation steps.

This is the **only place in the API** that calls the LLM outside of recipe extraction and description generation. Operators monitoring LLM spend should account for one additional call per newly imported recipe (when uncached ingredients are present).

### Workflow position

```
ExtractRecipe → GenerateHero → SyncRecipe → CategorizeIngredients → RecipeReady
```

`CategorizeIngredients` depends on `SyncRecipe` (so `raw_metadata` is populated) and must complete before `RecipeReady`.

### Prompt structure

The processor sends a single batch request containing all uncached ingredient names for the recipe:

```json
{
  "ingredients": ["tomato sauce", "chicken breast", "heavy cream"],
  "task": "Assign each ingredient to exactly one grocery store section.",
  "sections": ["Produce","Meat","Seafood","Dairy & Eggs","Frozen","Bakery","Pantry","Beverages","Deli","Grocery"]
}
```

**Valid section values** (exactly as sent to the LLM):

```
Produce, Meat, Seafood, Dairy & Eggs, Frozen, Bakery, Pantry, Beverages, Deli, Grocery
```

Note: `Meat` and `Seafood` are **separate sections**. The value `"Meat & Seafood"` is not valid and will be discarded if returned by the LLM. The fallback section is `"Grocery"` — `"Uncategorized"` is accepted as a legacy alias but `"Grocery"` is the canonical value.

### Expected response shape

```json
[
  { "normalizedKey": "tomato sauce", "section": "Pantry", "confidence": 0.95 },
  { "normalizedKey": "chicken breast", "section": "Meat", "confidence": 0.99 },
  { "normalizedKey": "heavy cream", "section": "Dairy & Eggs", "confidence": 0.98 }
]
```

Each item in the response array contains:

| Field | Type | Description |
|---|---|---|
| `normalizedKey` | string | The normalized ingredient name (matches what was sent) |
| `section` | string | One of the 10 valid section values |
| `confidence` | number | LLM confidence score (0–1); stored in `ingredient_categories` |

### Invalid response handling

- **Unrecognized section string**: the entry is discarded and a warning is logged. The ingredient remains uncached and falls back to `AisleMapper` at recompute time.
- **LLM call fails entirely**: the processor logs the error and completes without upserting. The workflow continues to `RecipeReady`. All ingredients fall back to `AisleMapper`.

### Cache-first strategy

Before making any LLM call, the processor queries `ingredient_categories` for all normalized keys in the recipe. Only the names that are **not** present in the cache are included in the LLM batch. A recipe whose ingredients are fully cached makes zero LLM calls.

---

## Related Code

- `CategorizeIngredientsProcessor` — `api/src/RecipeApi/Services/Processors/CategorizeIngredientsProcessor.cs`
- `GroceryRecomputeService` — `api/src/RecipeApi/Services/GroceryRecomputeService.cs`
- `AisleMapper` — `api/src/RecipeApi/Services/AisleMapper.cs`
- `IngredientNormalizer` — `api/src/RecipeApi/Utils/IngredientNormalizer.cs`
- `IngredientCategory` model — `api/src/RecipeApi/Models/IngredientCategory.cs`
- `WeeklyPlan` model — `api/src/RecipeApi/Models/WeeklyPlan.cs`
- Workflow definition — `api/src/RecipeApi/Workflows/recipe-import.yaml`
- Database schema — `api/database/schema.sql`
