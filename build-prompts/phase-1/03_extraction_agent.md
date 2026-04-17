# Task 3: Microsoft Agent Framework & Extraction Agent (Gemma4)

**Context**: We are using the Microsoft Agent Framework (GA 1.0) to coordinate our AI pipeline. Phase 1 is disk-based extraction.

**Requirements**:
1. Add the `Microsoft.Agents.AI` NuGet package to the `RecipeApi` project.
2. Set up the basic Agent Framework orchestration infrastructure.
3. Implement `RecipeExtractionAgent`:
   - Logic: Call a local Gemma4 endpoint (configurable via `AppSettings`).
   - Task: Read images from the NAS `originals/` folder for the given `recipeId`.
   - Output: Extract structured `Schema.org/Recipe` data using the `HowToSupply` / `QuantitativeValue` ontology.
   - Action: Save the resulting `recipe.json` directly to the `NAS/recipes/{id}/` folder.

**Acceptance Criteria**:
- `Microsoft.Agents.AI` is successfully integrated.
- `ExtractionAgent` can process images and write `recipe.json` to the NAS.
