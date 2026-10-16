# Design

## Context

See `proposal.md` for background and baseline motivation. This design artifact establishes the technical architecture, component boundaries, and observable data flows for extracting baseline specifications of ordinary-household recipe capture via photos and OCR vision entry.

The photo capture pipeline spans:
1. PWA UI & Hooks (`pwa/src/components/capture/MinimalCapture.tsx`, `pwa/src/hooks/useCapture.ts`, `pwa/src/lib/imageUtils.ts`, route `pwa/src/app/(app)/capture/page.tsx`)
2. API Client & Contracts (`pwa/src/lib/api/recipes.ts` via `createRecipe`, `specs/openapi.yaml` endpoint `POST /api/recipes`)
3. API Controller & Service (`api/src/RecipeApi/Controllers/RecipeController.cs`, `api/src/RecipeApi/Services/RecipeService.cs`, `api/src/RecipeApi/Services/ValidationService.cs`)
4. Image Storage (`api/src/RecipeApi/Infrastructure/ImageService.cs`, `api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs`)
5. Workflow Orchestration (`api/src/RecipeApi/Services/WorkflowOrchestrator.cs`, `api/src/RecipeApi/Workflows/recipe-import.yaml`)
6. Workflow Processors & Agents (`PdfConversionProcessor.cs` pass-through, `RecipeAgent.cs` / `ExtractRecipe`, `RecipeReadyProcessor.cs`, `WorkflowWorker.cs`)
7. Real-time Notifications & Error Tracking (`RecipeReadyProcessor.cs` -> SSE `recipe_ready`, `WorkflowWorker.cs` -> SSE `recipe_failed`, `captureStore.ts`, `useScheduleStream.ts`, `RecipeFailureBanner.tsx`)

## Goals / Non-Goals

**Goals:**
- Faithfully document implemented and observable behavior across all tiers of photo capture and OCR extraction.
- Ground all requirements in verified executable code, contract declarations, and automated test assertions.
- Distinguish implementation-supported claims from verified runtime behavior.
- Support strict OpenSpec baseline extraction without altering project code.

**Non-Goals:**
- Exclude PDF recipe import (preview feature under feature flag).
- Exclude freeform text/description prompt capture and manual recipe authoring.
- Exclude hero image generation/regeneration, meal planning, and demo/preview variants.
- No code refactoring, schema alterations, or bug fixes during extraction.

## Decisions

### 1. Architectural Boundary and Specification Structure
- **Decision**: Extend existing `recipe-capture` specification with 10 ADDED requirements covering the photo capture slice.
- **Rationale**: `recipe-capture` owns all recipe intake methods into the library. Reusing the capability keeps all entry modes (URL, photos) cohesive while referencing the shared library for reading/storage.
- **Alternatives Considered**: Creating a separate capability like `recipe-photo-capture` would fragment the capture screen and lifecycle tracking across multiple specifications.

### 2. Dish Photo Selection and Index Management
- **Decision**: Model client-side dish photo index selection with automated initial assignment (index 0) and bounded re-indexing upon photo removal.
- **Rationale**: Supported by `useCapture.ts` (`addImage`, `removeImage`, `setSelectedDishPhotoIndex`) and `ValidationService.cs` (`ValidateFinishedDishImageIndex`).

### 3. Submission Lock and Upload Feedback
- **Decision**: Document the client submission lock (`photoSubmitLockRef`, `isPhotoSubmitPending`) and delayed upload overlay (appearing after 800ms) as observable requirements.
- **Rationale**: Supported by `MinimalCapture.tsx` and tested in `MinimalCapture.submit-lock.test.tsx` and `e2e/capture-flow.spec.ts`.

### 4. Background OCR Vision Extraction and Refinement
- **Decision**: Document multimodal AI vision processing in `RecipeAgent.cs` (`DoExtractRecipeAsync`), including image binary passing, semantic completion validation (`RecipeExtractionParser`), and conditional refinement prompt.
- **Rationale**: Reflects exact implementation in `RecipeAgent.cs` and workflow execution in `recipe-import.yaml`.

### 5. Failure Handling and Recovery Banner
- **Decision**: Document the terminal failure notification flow: `WorkflowWorker` publishes `recipe_failed` SSE event, `useScheduleStream` matches against `captureStore`, and `RecipeFailureBanner` displays persistent banner with retry action.
- **Rationale**: Grounded in `WorkflowWorker.cs`, `useScheduleStream.ts`, `captureStore.ts`, and `RecipeFailureBanner.tsx`.

## Risks / Trade-offs

- [Risk] U12 / U61: DB commit occurs before workflow triggering, leaving pending entity if queueing throws.
  → Mitigation: Documented as non-normative limitation in baseline plan; requirements assert observable intake behavior without assuming transactional atomicity.
- [Risk] Large image upload delays on constrained networks.
  → Mitigation: Client implements 800ms delayed overlay requesting user keep screen open; documented in requirements.
- [Risk] Vision extraction OCR ambiguities from low-quality photos.
  → Mitigation: Extractor runs semantic validation and refinement step; unparseable recipes emit `recipe_failed` with retry capability.
