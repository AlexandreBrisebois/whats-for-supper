# Implementation Prompt: Recipe Import Worker

## Background
You are an AI and Systems Engineer. You are building the **Recipe Import Worker** for "What's For Supper". This worker is the "engine" that transforms raw photos into structured recipe data.

## Objective
Implement the Recipe Import Worker as defined in [recipe-import.spec.md](file:///Users/alex/Code/whats-for-supper/src/specs/recipe-import.spec.md).

## Key Requirements
1.  **Queue Processing**: Listen to the Redis Stream (`recipe:import:queue`) for new uploads.
2.  **Two-Pass AI Pipeline**:
    -   **Pass 1 (Local)**: Use **Gemma** (via Ollama or local endpoint) to extract OCR and Schema.org JSON.
    -   **Pass 2 (Cloud)**: Use **Gemini Image Pro 3.1** to generate a high-quality "What's For Supper" aesthetic hero thumbnail (`hero.jpg`).
3.  **Data Persistence**: Save `recipe.json` to the NAS filesystem and update the metadata in the **PostgreSQL** database (see [ADR-001](file:///Users/alex/Code/whats-for-supper/src/specs/decisions/001-data-strategy.md)).
4.  **Nutritional Enrichment**: Begin the logic for mapping ingredients to the **Canadian Nutrient File (CNF)** as specified in [recipe-data.spec.md](file:///Users/alex/Code/whats-for-supper/src/specs/recipe-data.spec.md#3.2).

## Supporting Docs
- Specification: `src/specs/recipe-import.spec.md`
- Data Strategy: `src/specs/recipe-data.spec.md`
- API Context: `src/specs/recipe-api.spec.md`

## Initial Task
Define the Docker environment for the worker. Propose a C# -based implementation for the stream processing. Start by implementing the Redis listener and the local Gemma OCR pass.
