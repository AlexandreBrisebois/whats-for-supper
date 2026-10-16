# Proposal

## Why

Document baseline requirements for ordinary-household recipe capture via photo capture and image OCR vision parsing in What's for Supper. While URL link entry has been baseline-specified and promoted to `recipe-capture`, photo-based acquisition (camera and gallery image picking, client-side image staging and validation, dish photo index selection, appreciation ratings and notes, multipart submission via `POST /api/recipes`, `recipe-import.yaml` workflow execution with `RecipeAgent` vision extraction, background progress and failure tracking, and initial recipe persistence with readiness finalization) lacks baseline specification. This brownfield extraction documents implemented, observable photo capture behavior directly from source and verified tests.

## What Changes

- Update capability specification `recipe-capture` by adding requirements and scenarios covering photo capture and OCR vision entry.
- Specify capture entry at `/capture` via camera photo capture (`capture="environment"`) and gallery photo selection (`multiple`).
- Specify client-side image staging, validation (1–20 images, max 20 MB per file, JPEG/PNG/WebP), dish photo designation with automatic initial index selection and reindexing on image removal, appreciation rating (0–3), and optional notes.
- Specify multipart submission via `POST /api/recipes` requiring `X-Family-Member-Id` header, returning 202 Accepted with the queued recipe ID.
- Specify backend intake validation (`ValidationService`), disk staging of image files (`ImageService`), initial recipe persistence (`Recipe`, `RecipeInfo`, `RecipeSearchDocument`) with `IsReady = false`, and asynchronous dispatch of the `recipe-import` workflow.
- Specify workflow execution (`recipe-import.yaml`), including `ConvertPdf` pass-through for photo sources, and `RecipeAgent` (`ExtractRecipe`) vision extraction using multimodal chat client, semantic completion verification, and refinement.
- Specify workflow completion (`RecipeReadyProcessor`), updating recipe state to `IsReady = true` and `IsDiscoverable = true`, and broadcasting the real-time SSE `recipe_ready` event.
- Specify client-side progress tracking during photo upload (delayed upload overlay for submissions exceeding 800ms, button lock) and post-submission queued state with 10-second countdown auto-redirect to `/home` or inline transition upon `recipe_ready`.
- Specify background failure tracking: `PublishRecipeFailedAsync` emitting SSE `recipe_failed`, handling by `useScheduleStream` and `captureStore`, and persistent display of `RecipeFailureBanner` with retry CTA.

## Capabilities

### New Capabilities
<!-- None: Reuses existing recipe-capture specification without creating a new capability root. -->

### Modified Capabilities
- `recipe-capture`: Baseline capability covering ordinary-household recipe capture. Extends the approved specification with requirements for photo capture, client image staging, multipart upload, OCR vision workflow dispatch, background progress/failure tracking, and initial entity creation.

## Impact

- Specifications: Creates delta specification `specs/recipe-capture/spec.md` under `openspec/changes/baseline-recipe-capture-photo-entry/`.
- Codebase affected: Documentation and baseline extraction only. No runtime modifications to `pwa/src/components/capture/MinimalCapture.tsx`, `pwa/src/hooks/useCapture.ts`, `api/src/RecipeApi/Controllers/RecipeController.cs`, `api/src/RecipeApi/Services/RecipeService.cs`, `api/src/RecipeApi/Services/Agents/RecipeAgent.cs`, or `api/src/RecipeApi/Workflows/recipe-import.yaml`.
- Scope boundaries: Excludes PDF recipe import, freeform text/description prompt capture, manual recipe authoring, hero image generation/regeneration, meal planning, and demo/preview variants.
