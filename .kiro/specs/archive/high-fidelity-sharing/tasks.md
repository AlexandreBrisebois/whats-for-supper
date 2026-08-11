# High Fidelity Recipe Sharing & Portable Format - Tasks

## Implementation Plan
This feature is executed in four waves to establish the "High Fidelity" contract before building the UI logic.

### Wave 1: The Schema & Seams (Contract First)
Establish the structured DTOs and ensure zero-drift between Backend and PWA models.

- [x] 1. **Backend - Define HowTo DTOs**
  - Create `HowToSectionDto.cs` and `HowToStepDto.cs` in `api/src/RecipeApi/Dto/`.
  - Update `ImportedRecipeDto.cs` to use `List<HowToSectionDto>` and add optional `Notes`, `Rating` fields.
  - _Requirements: AC 1.1, AC 1.2_
- [x] 2. **Spec - Update OpenAPI**
  - Update `specs/openapi.yaml` to reflect the structured `Instructions` and new optional fields.
  - Run Kiota generation to update PWA models.
  - _Requirements: AC 1.2_
- [x] 3. **PWA - Resilience Test**
  - Add unit tests to `pwa/src/lib/api/recipes.test.ts` for `parseRecipeBundleFile` that mock the new structured JSON.
  - Update `pwa/src/components/capture/MinimalCapture.recipe-import.test.tsx` to handle structured instruction rendering.
  - _Requirements: AC 3.3_

### Wave 2: High-Fidelity Export (Backend)
Refine the export logic to preserve structure and enforce hero presence.

- [x] 4. **Backend - Update Export Logic**
  - Update `RecipeService.ExportRecipeShareBundle` to map raw metadata to `HowToSectionDto`.
  - Ensure `Notes`, `Rating`, and `DietaryProfile` are scrubbed for the share context.
  - _Requirements: AC 2.1, AC 2.2, AC 2.3_
- [x] 5. **Backend - Hero Guard**
  - Update `RecipeController.Share` to verify hero existence before calling export.
  - _Requirements: AC 2.4_
- [x] 6. **Backend - Export Integration Test**
  - Update `api/src/RecipeApi.Tests/Integration/RecipeShareIntegrationTests.cs` to assert structured JSON output and Hero presence rules.
  - _Requirements: AC 2.1_

### Wave 3: Structured Preview (PWA)
Update the UI to handle and display structured sections.

- [x] 7. **PWA - Parsing Logic**
  - Update `parseRecipeBundleFile` in `pwa/src/lib/api/recipes.ts` to handle the structured DTOs and optional fields.
  - _Requirements: AC 3.1, AC 3.3_
- [x] 8. **PWA - Preview UI**
  - Update `MinimalCapture.tsx` (Bundle Preview) to render `HowToSection` headings and steps with correct `data-testid`.
  - _Requirements: AC 4.2_
- [x] 9. **PWA - Share Visibility**
  - Update `RecipeDetail` (or wherever the share button lives) to hide the `recipe-share-btn` if `recipe.imageUrl` is placeholder or hero missing.
  - Update `pwa/e2e/recipe-share.spec.ts` to verify share button visibility rules.
  - _Requirements: AC 4.1_
- [x] 10. **E2E - Mock API Fidelity**
  - Update `pwa/e2e/mock-api.ts` to reflect the new structured `Instructions` and optional fields in all relevant mocks.
  - _Requirements: AC 1.2_

### Wave 4: Portable Import (Closing the Loop)
Ensure the full round-trip preserves all supported data.

- [x] 11. **Backend - Import Restoration**
  - Update `RecipeService.ImportRecipeShareBundle` to restore `Notes` and `Rating` from the DTO.
  - _Requirements: AC 3.2_
- [x] 12. **E2E - Round-trip Validation**
  - Create `pwa/e2e/sharing-fidelity.spec.ts` to test Export -> Upload -> Import flow.
  - _Requirements: All ACs_

## Wave Dependencies
```json
{
  "waves": [
    { "id": 1, "name": "The Schema & Seams", "requires": [] },
    { "id": 2, "name": "High-Fidelity Export", "requires": [1, 2, 3] },
    { "id": 3, "name": "Structured Preview", "requires": [1, 2, 3] },
    { "id": 4, "name": "Portable Import", "requires": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }
  ]
}
```
