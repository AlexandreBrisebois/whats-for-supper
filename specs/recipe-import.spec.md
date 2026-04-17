# Recipe Import Pipeline Specification (CQRS & Hybrid)

The Recipe Import Pipeline is a robust, agentic workflow designed for "What's For Supper". It uses a CQRS-inspired command table to manage work and follows a local-first, two-phase process using the **Microsoft Agent Framework v1 (GA)**.

## 1. System Overview

- **Trigger**: Manual API call (`POST /api/recipes/{id}/import`).
- **Framework**: **Microsoft Agent Framework** (`Microsoft.Agents.AI` v1.0+).
- **Execution Mode**: Hybrid (Local Gemma4 for text, Cloud Gemini Image Pro 3.1 for visuals).
- **Lifecycle**: Commands are transient; records in `recipe_imports` are **deleted** immediately upon successful synchronization to the main `recipes` table.

## 2. Data Architecture

### 2.1 Command Table: `recipe_imports`
Tracks transient import attempts:
- `id`: UUID.
- `recipe_id`: UUID.
- `status`: `Pending` | `Processing` | `Failed`.
- `error_message`: Text (populated if `Failed`).

### 2.2 Ingredients Schema (JSONB)
Stored in `recipes.ingredients` as a normalized array inspired by the **Schema.org Ontology**:
```json
[{
  "@type": "HowToSupply",
  "name": "Buttermilk",
  "amount": {
    "@type": "QuantitativeValue",
    "value": 1.5,
    "unitText": "cups",
    "unitCode": "CUP"
  },
  "text": "1 1/2 cups cold buttermilk",
  "notes": "cold"
}]
```

## 3. Worker Workflow (The "Brain")

The `RecipeImportWorker` coordinates specialized agents via the **Microsoft Agent Framework**.

### 3.1 Phase 1: Local Extraction & Assets (Disk-Focused)
1. **Agent 1 (Extraction - Gemma4)**: Performs local OCR and saves `recipe.json` to the NAS.
2. **Agent 2 (Visual - Gemini Image Pro 3.1)**: Generates high-fidelity `hero.jpg` and saves it to the NAS.

### 3.2 Phase 2: Database Synchronization & Cleanup
1. The worker syncs `recipe.json` data to `recipes.raw_metadata` and `recipes.ingredients`.
2. The transient `recipe_imports` record is **deleted** on success.

## 4. API Surface

| Endpoint | Method | Description |
|---|---|---|
| `/api/recipes/{id}/import` | `POST` | Queue a recipe for import. |
| `/api/recipes/{id}/import/status` | `GET` | Get status: "Completed" (if in DB), "Pending", "Processing", or "Failed". |
| `/api/recipes/import-status` | `GET` | Summary of imported counts and queue length. |

## 5. Error Handling
- **Failures**: Detailed error messages are kept in the `recipe_imports` table until the user either retries or clears the error.
- **Manual Retry**: Re-triggering the import API will reset a `Failed` command to `Pending`.
