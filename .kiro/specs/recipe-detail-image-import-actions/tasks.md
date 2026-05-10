# Tasks: Recipe Detail Image And Import Actions

## Implementation Plan

This spec adds secondary recipe actions (Delete, Reimport) into a gear menu and overlays media controls (Camera, Regenerate) on the hero image in Edit Mode.

### Wave 1: Contract & Mock (The Seam)

- [x] 1. **OpenAPI - Add Source Metadata & New Endpoints**
    - Modify `specs/openapi.yaml`:
        - Update `RecipeDto` schema with `sourceType`, `canReimport`, and `imageCount`.
        - Add `POST /api/recipes/{id}/import` (if missing or update to reflect reimport).
        - Add `POST /api/recipes/{id}/originals` (Multipart upload).
        - Add `POST /api/recipes/{id}/hero/regenerate`.
    - _Requirements: AC 2, AC 4, AC 5_

- [x] 2. **Reconcile - Sync Contract**
    - Run `task agent:reconcile` to update generated C# DTOs and PWA clients.
    - _Requirements: AC 2, AC 4, AC 5_

- [x] 3. **Mock API - Implement Endpoints**
    - Update `pwa/e2e/mock-api.ts`:
        - Add handlers defined in `design.md` for `import`, `originals`, and `hero/regenerate`.
    - _Requirements: AC 2, AC 4, AC 5_

### Wave 2: Backend Implementation (The Logic)

- [x] 4. **API - Update RecipeDto & Mapping**
    - Modify `api/src/RecipeApi/Dto/RecipeDto.cs` (if not auto-updated) to include new fields.
    - Update the mapping logic (likely in `RecipeService` or a dedicated mapper) to populate `sourceType`, `canReimport`, and `imageCount`.
    - _Requirements: AC 2_

- [x] 5. **API - Implement Reimport Logic**
    - Update `RecipeController.cs` to handle `POST /api/recipes/{id}/import`.
    - Logic in `RecipeService`:
        - If `SourceUrl` is present -> queue `url-import`.
        - Else if `Images.Count > 0` -> queue `recipe-import`.
        - Else -> 409 Conflict.
    - _Requirements: AC 2_

- [x] 6. **API - Implement Originals Upload & Forced Hero**
    - Add `POST /api/recipes/{id}/originals` endpoint in `RecipeController.cs`.
    - Implementation:
        - Save uploaded file to `originals/` storage.
        - Append to recipe `Images` list.
        - Set as `finished-dish` source if applicable.
        - Trigger `hero-regeneration` with `force: true`.
    - Add `POST /api/recipes/{id}/hero/regenerate` endpoint.
    - _Requirements: AC 4, AC 5_

- [x] 7. **Workflow - Forced Hero Regeneration**
    - Modify `HeroWorkflow.cs` (or relevant service):
        - Allow `force` parameter to bypass "hero exists" check.
        - Generate to temp file first, then replace `hero.jpg`.
    - _Requirements: AC 5_

### Wave 3: PWA UI - Gear Menu (The Shell)

- [x] 8. **PWA - Implement ActionGearMenu**
    - Create a small component (or inline in `RecipeDetailSheet`) using a dropdown pattern.
    - Items: "Move to Bin" and "Reimport Recipe".
    - _Requirements: AC 1, AC 2_

- [x] 9. **PWA - Refactor RecipeDetailSheet Header**
    - Modify `pwa/src/components/recipes/RecipeDetailSheet.tsx`:
        - Remove "Move to Bin" from the bottom action row.
        - Add `ActionGearMenu` to the header (next to Close button).
        - Ensure "Reimport Recipe" is hidden if `recipe.canReimport` is false.
    - _Requirements: AC 1, AC 2_

### Wave 4: PWA UI - Hero Actions (The Polish)

- [ ] 10. **PWA - Hero Action Overlays**
    - Add `hero-action-camera` and `hero-action-regenerate` buttons to the hero image container in `RecipeDetailSheet.tsx`.
    - Only show when `isEditing` is true.
    - Use glassmorphism styles from `design.md`.
    - _Requirements: AC 3_

- [ ] 11. **PWA - Integrate MinimalCapture & Trigger**
    - Wiring for Camera: Open `MinimalCapture` sheet -> on upload success, show toast.
    - Wiring for Regenerate: Call API -> show toast.
    - _Requirements: AC 4, AC 5_

## Verification Plan

### Automated Tests
- [ ] Run `task test:api` to verify new endpoints and DTO mapping.
- [ ] Run `task test:pwa` (Vitest) to verify conditional rendering of menu and hero controls.
- [ ] Run `npx playwright test e2e/recipe-actions.spec.ts` (Create this file) to verify end-to-end flows.

### Manual Verification
- [ ] Open a URL-imported recipe -> verify Reimport works.
- [ ] Open a synthesized recipe -> verify Reimport is missing.
- [ ] Enter Edit Mode -> Upload a photo via Camera -> verify regeneration toast.
- [ ] Enter Edit Mode -> Click Regenerate -> verify regeneration toast.
- [ ] Verify "Move to Bin" successfully deletes the recipe from the gear menu.

## Task Dependency Graph
```json
{
  "waves": [
    { "id": 1, "tasks": [1, 2, 3] },
    { "id": 2, "tasks": [4, 5, 6, 7], "dependsOn": [1] },
    { "id": 3, "tasks": [8, 9], "dependsOn": [2, 3] },
    { "id": 4, "tasks": [10, 11], "dependsOn": [2, 3] }
  ]
}
```
