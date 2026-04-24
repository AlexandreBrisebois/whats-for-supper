# Build Prompt: Diet Agent Inference & Metadata Enrichment

## Objective
Implement a specialized "Diet Agent" to analyze recipe ingredients and populate the new `IsVegetarian` and `IsHealthyChoice` fields in the database. Integrate this into the background import pipeline.

## Context
- **Backend Model**: `Recipe.cs` now has `IsVegetarian` and `IsHealthyChoice` boolean fields.
- **Data Source**: Ingredients are stored as `jsonb` in the `ingredients` column of the `recipes` table.
- **Workflow**: 
  1. The AI Worker currently processes images and extracts ingredients.
  2. The Diet Agent should run after ingredient extraction to classify the meal.

## Requirements

### 1. DietAgent Implementation
- Create a new agent service (or extend the existing AI Worker) that uses Gemma/Gemini to analyze a list of ingredients.
- **Prompt Logic**: 
  - "Given these ingredients, is this recipe strictly vegetarian? (No meat, poultry, or fish. Dairy/eggs are okay)."
  - "Given these ingredients and cooking method, is this a 'Healthy Choice'? (Low processed sugar, high whole foods, balanced nutrients)."
- Update the `Recipe` entity with the results.

### 2. Import Pipeline Integration
- Update the DB-polling loop in the AI Worker to check for recipes where `ingredients` is populated but `is_vegetarian` is still the default (false) or needs a first-time audit.
- Ensure the inference happens automatically upon every new successful import.

### 3. PWA Validation
- Verify that the "Plant-Powered! 🌿" badge in `CooksMode.tsx` correctly displays based on the real backend data.

## Definition of Done
- [ ] A script or worker task exists to audit the existing library for dietary flags.
- [ ] New recipes imported via the capture flow automatically get their dietary flags set.
- [ ] The "Plant-Powered" badge appears in Cook's Mode for a known vegetarian recipe.
