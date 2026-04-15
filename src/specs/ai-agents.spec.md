# AI Agents Specification

This document defines the AI agent architecture for "What's For Supper". Agents power Phase 5 of the roadmap, enabling intelligent meal suggestions, natural language recipe search, and family coordination.

## 1. Overview

Three core agents are implemented as background services within the .NET 10 ecosystem, communicating with the PostgreSQL database (pgvector) and local Ollama models.

| Agent | Purpose |
|---|---|
| `SuggestMealsAgent` | Weekly meal planning based on family preferences and constraints |
| `SearchRecipesAgent` | Natural language recipe search using pgvector + re-ranking |
| `CoordinateFamilyAgent` | Shopping list generation, task assignment, notifications |

## 2. Framework & Models

- **Framework**: LangChain.js abstraction layer (swappable to Semantic Kernel later)
- **Local Model**: Mistral or Neural Chat via Ollama (`http://ollama:11434`)
- **Embedding Model**: Lightweight local model via Ollama or Gemini Embedding API
- **Vector Store**: PostgreSQL + pgvector (see [recipe-data.spec.md §3.1](recipe-data.spec.md))

## 3. SuggestMealsAgent

### 3.1 Trigger
- Manual request from PWA ("Suggest meals for this week")
- Scheduled (optional, Phase 5+)

### 3.2 Logic
1. Fetch active `FamilyMembers` and their `Preferences` (Love/Like/Dislike/Veto) from PostgreSQL.
2. Fetch current `CalendarEvents` to identify already-planned slots.
3. Embed the family's "vibe" (e.g., "quick weeknight dinners") using the embedding model.
4. Query pgvector for semantically similar recipes, filtered by allergies.
5. Return a ranked list of `recipeId` suggestions with reasoning.

### 3.3 Performance Target
- < 5 seconds end-to-end.

## 4. SearchRecipesAgent

### 4.1 Trigger
- Natural language search input from the PWA Discovery or Planner screen.

### 4.2 Logic
1. Embed the user's query string.
2. Run a hybrid pgvector + SQL query:
   - Vector similarity on `recipes.embedding`
   - SQL filter on `Allergies` and `Preferences` tables
3. Re-rank results using the local Ollama model for relevance scoring.
4. Return ordered list of recipe cards.

### 4.3 Performance Target
- < 3 seconds end-to-end.

## 5. CoordinateFamilyAgent

### 5.1 Trigger
- Recipe added to the weekly planner.

### 5.2 Logic
1. Parse `recipe.json` ingredients (from `raw_metadata` JSONB).
2. Aggregate ingredients across the week's planned meals.
3. Deduplicate and normalize quantities.
4. Generate a consolidated shopping list.
5. (Phase 5+) Push tasks to family members via notification channel.

## 6. Data Dependencies

All agents read from and write to the PostgreSQL instance defined in [recipe-data.spec.md](recipe-data.spec.md):
- `recipes` — source of recipe data and embeddings
- `FamilyMembers`, `Preferences`, `Allergies` — constraint data
- `CalendarEvents` — current meal plan state
- `DietaryGoals` — best-effort nutritional targeting

## 7. API Surface

Agents are exposed via internal API routes (Next.js API routes or a dedicated .NET agent service):

| Endpoint | Method | Description |
|---|---|---|
| `/api/agents/suggest` | `POST` | Trigger meal suggestion |
| `/api/agents/search` | `POST` | Natural language recipe search |
| `/api/agents/shopping-list` | `GET` | Generate weekly shopping list |

## 8. Configuration

| Variable | Description |
|---|---|
| `OLLAMA_BASE_URL` | Local Ollama endpoint (e.g., `http://ollama:11434`) |
| `OLLAMA_MODEL` | Model name (e.g., `mistral`, `neural-chat`) |
| `GEMINI_API_KEY` | For embedding fallback or Gemini-based re-ranking |
