# AI Worker & Agent Pipeline

**Status**: AUTHORITATIVE  
**Lane**: 03_AI_WORKER  
**Source of Truth for**: Recipe Extraction, AI Agents, and Background Workers.

---

## 1. Recipe Processing Pipeline (Phase 1)

The `RecipeImportWorker` coordinates a multi-stage pipeline using the **Microsoft Agent Framework** (`Microsoft.Agents.AI` v1.0).

### 1.1 Pipeline Lifecycle
1. **Trigger**: Manual `POST /api/recipes/{id}/import` or 30-second database poll for `Pending` imports.
2. **Stage 1: Extraction (RecipeExtractionAgent)**:
   - **Model**: Local Gemma4.
   - **Action**: Parse image → extract ingredients and instructions → write `recipe.json` (Schema.org format) to disk.
3. **Stage 2: Hero Generation (RecipeHeroAgent)**:
   - **Model**: Cloud Gemini Image Pro 3.1.
   - **Action**: Generate high-fidelity `hero.jpg` → save to disk.
4. **Stage 3: Database Sync (SyncDiskToDb)**:
   - **Precedence**: `recipe.info` (manual overrides) > `recipe.json` (AI extraction).
   - **Action**: Update `recipes` table, infer difficulty, and delete the transient `recipe_imports` record.

---

## 2. Extraction Heuristics & Logic

### 2.1 Difficulty Inference Algorithm
Classified into 3 tiers based on ingredient count and prep time:
- **Easy**: < 5 ingredients AND < 20 minutes.
- **Hard**: > 12 ingredients OR > 45 minutes.
- **Medium**: Everything else.

### 2.2 Duration Parsing
ISO 8601 durations (e.g., `PT30M`) are parsed using `System.Xml.XmlConvert.ToTimeSpan()`. Fallback to 0 if parsing fails.

### 2.3 Ingredients Schema (JSONB)
Stored using the **Schema.org Ontology**:
```json
[{
  "@type": "HowToSupply",
  "name": "Buttermilk",
  "amount": {
    "@type": "QuantitativeValue",
    "value": 1.5,
    "unitText": "cups"
  },
  "text": "1 1/2 cups cold buttermilk"
}]
```

---

## 3. Specialized AI Agents

### 3.1 SearchRecipesAgent (Phase 3)
- **Logic**: Hybrid pgvector + SQL search.
- **Flow**: Embed query → SQL filter (allergies/prefs) → pgvector rank → re-rank with local Ollama.

### 3.2 SuggestMealsAgent (Phase 5)
- **Logic**: Weekly planning based on "Family Vibe."
- **Flow**: Fetch family preferences → identify calendar slots → query pgvector for matches → return ranked list with reasoning.

### 3.3 CoordinateFamilyAgent (Phase 5)
- **Action**: Parses ingredients across the weekly plan to generate a consolidated, deduplicated shopping list.

---

## 4. Operational Configuration

| Variable | Description |
|---|---|
| `OLLAMA_BASE_URL` | Local Ollama endpoint (e.g., `http://ollama:11434`) |
| `GEMINI_API_KEY` | For high-fidelity image generation and re-ranking |
| `POLLING_INTERVAL` | 30 seconds for `RecipeImportWorker` |

### 4.1 Error Handling
Per-import try/catch. Failed imports are marked `Failed` with an `ErrorMessage` in `recipe_imports`. They are never automatically retried to prevent infinite loops on corrupt data.
