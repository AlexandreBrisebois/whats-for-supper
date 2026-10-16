# Proposal

## Why

Document the baseline requirements for ordinary-household recipe capture from external URLs in What's for Supper. While recipe library browsing and export/import sharing have established baseline specifications, web URL ingestion (via `/capture` URL review, backend workflow dispatch, background acquisition and parsing, and initial recipe persistence with readiness tracking) lacks an approved OpenSpec baseline. This brownfield extraction captures implemented, observable web capture behavior from the current source.

## What Changes

- Propose new capability specification `recipe-capture` covering ordinary-household recipe capture via web URL.
- Specify capture entry at `/capture` via direct URL review or text/query extraction, client input validation, appreciation rating, and notes.
- Specify backend submission via POST `/api/recipes/capture-url` returning 202 Accepted with a queued recipe ID, initial recipe persistence with `IsReady = false`, and trigger of the background `url-import` workflow.
- Specify web acquisition processing (`WebAcquisitionAgent` / `FetchUrlContent`), fallback naming, hero image download, and structured extraction (`RecipeAgent` / `ExtractRecipe`) with semantic completion validation and normalization.
- Specify asynchronous workflow completion (`RecipeReadyProcessor`), stored readiness status transition (`IsReady = true`, `IsDiscoverable = true`), and real-time SSE `recipe_ready` notification.
- Specify client background status tracking and navigation outcomes: queued state with polling and countdown auto-redirect to `/home`, and inline transition to ready state upon receiving `recipe_ready`.
- Specify client-side pre-submission duplicate advisory banner against existing library recipes with matching source URLs, and error feedback for network or extraction failures.

## Capabilities

### New Capabilities
- `recipe-capture`: Baseline capability covering ordinary-household recipe capture from external web URLs, encompassing entry, validation, workflow dispatch, background processing, progress/notification tracking, error feedback, and initial recipe creation into the library.

### Modified Capabilities
<!-- None: Reuses existing recipe-library and household-identity specifications without altering their approved requirements. -->

## Impact

- Specifications: Creates initial delta specification `specs/recipe-capture/spec.md`.
- Codebase affected: Documentation and baseline extraction only. No runtime modifications to `pwa/src/components/capture/MinimalCapture.tsx`, `api/src/RecipeApi/Controllers/RecipeController.cs`, `api/src/RecipeApi/Services/RecipeService.cs`, `api/src/RecipeApi/Services/Agents/WebAcquisitionAgent.cs`, or `api/src/RecipeApi/Workflows/url-import.yaml`.
- Scope boundaries: Excludes PDF recipe import, photo capture/OCR, manual recipe authoring, hero image generation/regeneration, meal planning, and demo/preview variants.
