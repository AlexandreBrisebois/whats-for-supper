# Implementation Prompt: Recipe API Service

## Background
You are a senior backend engineer. You are building the **Recipe API** for "What's For Supper", a family-oriented recipe management and diet planning system hosted on a home NAS via Docker.

## Objective
Implement the Recipe API as defined in [recipe-api.spec.md](file:///Users/alex/Code/whats-for-supper/src/specs/recipe-api.spec.md).

## Key Requirements
1.  **Recipe Upload**: `POST /api/recipes` accepting multipart/form-data (images + rating).
2.  **Storage Logic**: Save images to `{RECIPES_ROOT}/{recipeId}/original/` and metadata to `recipe.info`.
3.  **Redis Integration**: Upon success, push a message to a Redis Stream (`recipe:import:queue`) for the Import Worker.
4.  **Family Identity**: Implement simple passwordless profile management (`/api/family`) to track who added which recipe.
5.  **Data Strategy**: Connect to the **PostgreSQL** instance defined in [ADR-001](file:///Users/alex/Code/whats-for-supper/src/specs/decisions/001-data-strategy.md) for persistence.

## Supporting Docs
- Specification: `src/specs/recipe-api.spec.md`
- Data Strategy: `src/specs/recipe-data.spec.md`
- Identity Model: `src/specs/recipe-pwa.spec.md#1.5`

## Initial Task
Review the specs and propose a project structure (e.g., .NET 10, Python 3.14, or Go) that fits the NAS Docker environment. Implement the upload and folder creation logic first.
