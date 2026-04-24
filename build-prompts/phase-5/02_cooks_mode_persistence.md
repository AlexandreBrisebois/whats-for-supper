# Build Prompt: Cook's Mode Persistence & Instruction Extraction

## Objective
Migrate the step-by-step cooking instructions from mocked frontend state to the backend database.

## Context
- **Current State**: `CooksMode.tsx` has a hardcoded array of steps.
- **Target State**: Instructions should be extracted by the AI Worker and stored in the `Recipe` entity.

## Requirements

### 1. Database Update
- Update the `recipes` table to include a `instructions` column (Type: `jsonb` or `text[]`).
- Update `Recipe.cs` and `RecipeDto.cs` accordingly.

### 2. AI Extraction
- Update the AI Worker's prompt to Gemini/Gemma to specifically extract step-by-step cooking instructions from the recipe images.
- Store these as a structured list in the new `instructions` column.

### 3. Frontend Integration
- Refactor `CooksMode.tsx` to use `recipe.instructions` from the API instead of the mock steps.
- Add a loading state/skeleton while the instructions are being fetched or if they are still being processed by the AI.

## Definition of Done
- [ ] Database schema updated with `instructions`.
- [ ] AI Worker successfully populates the `instructions` field.
- [ ] Cook's Mode displays real instructions from the database.
