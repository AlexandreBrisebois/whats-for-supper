# Agent Handover Journal (Active)

This file tracks the real-time execution state for **Active Tasks only**. Refer to [JOURNAL.md](JOURNAL.md) for historical archives.

## Next Session Entry Points

1. **Duplicate Recipe Capture Prevention — Task 9: Describe Capture Duplicate Detection (Ready to Start)**
   - Task 8 (URL Capture Duplicate Detection) is now complete and verified.
   - **Action Item**: Implement Task 9 — Add a 500ms debounced check on `describeName` in `MinimalCapture.tsx`, calling `GET /api/recipes?name={describeName}` and updating `describeDuplicate`.
   - **Action Item**: Render the duplicate banner below the recipe name input field in the Describe form.

2. **Duplicate Recipe Capture Prevention — Task 10: Photo/Gallery Capture Duplicate Detection & Success Screen Recovery**
   - **Action Item**: Check for duplicate names on photo capture success, filter out the pending recipe ID, and display the duplicate warning banner on the final success screen.
   - **Action Item**: Implement the "Discard duplicate" button click handler to delete the newly synthesized duplicate recipe and redirect home.

3. **High-Fidelity Sharing — Share Visibility (Ready to Start)**
   - The Bundle Preview UI now supports structured instructions and optional notes (Task 8).
   - **Action Item**: Implement Task 9 — Update `RecipeDetail` to hide the "Share" button (`recipe-share-btn`) if the hero image is missing or is a placeholder (AC 4.1).
   - **Action Item**: Update `pwa/e2e/recipe-share.spec.ts` to verify share button visibility rules.

4. **Recipe Management — Reimport Logic (Ready to Start)**
   - Three E2E tests are skipped with `// TODO: revisit when SSE ...` comments that mark the integration points:
     - `capture-flow.spec.ts` → "failed URL capture shows error message".
     - `home-goto.spec.ts` → "Page reload after Make This Tonight".
     - `planner-social.spec.ts` → "Verify Nudge Family button triggers Web Share".
   - ADR 035 defines the canonical E2E route-handler pattern to follow when writing SSE mock handlers.

## Recently Completed

- **Duplicate Recipe Capture Prevention — URL Capture Duplicate Detection (2026-05-24):** Implemented debounced duplicate detection by URL (Task 8).
  - **Debounced check**: Added a 500ms debounced effect on `urlInput` that queries `apiClient.api.recipes.get` by URL.
  - **Duplicate UI**: Rendered the warning banner when a matching URL is found, including a "View existing recipe" button to open the details drawer.
  - **Cancel/Reset**: Reset `urlInput` and cleared duplicate states when the user cancels URL capture.
  - **Verification**: Verified the implementation via PWA unit tests (`task test:unit`) and verified zero schema drift (`task agent:drift`).

- **Duplicate Recipe Capture Prevention — API Contract Update (2026-05-24):** Updated the OpenAPI specification to support checking for duplicate recipes.
  - **Contract Update**: Added `id`, `name`, and `url` query parameters to `GET /api/recipes`. Added `recipeId` to `RecipeShareInfoDto`.
  - **Drift Prevention**: Added `RecipeId` to `RecipeShareInfoDto.cs` to prevent schema drift.
  - **Client Regeneration**: Regenerated the TypeScript client (`task gen:client`).
  - **Verification**: Confirmed `task agent:drift` and `task review` pass cleanly.

- **Core Harness — Test Audit Integration (2026-05-16):** Integrated the `test-audit` skill into the core execution harness.
  - **Unified Tooling**: Migrated audit logic to `scripts/agent/test_audit.py` and registered `task test:audit` and `task agent:audit`.
  - **Harness Enforcement**: Updated `execution-harness.md` to establish a mandatory pre-implementation audit workflow for identifying test surface and brittle selectors.
  - **Impact Preservation**: Cleaned up `test_ops.py` while preserving the impact-aware test runner logic.

- **High-Fidelity Recipe Sharing — Preview UI (2026-05-16):** Updated the PWA bundle preview to render structured instructions and optional notes.
  - **Structured Preview**: Updated `MinimalCapture.tsx` to use generic `data-testid` (`bundle-preview-section-title`, `bundle-preview-step-text`) and render `HowToSection` headings and `HowToStep` lists (AC 4.2).
  - **Optional Notes**: Added rendering for `bundle.recipe.notes` with `bundle-preview-notes` test-id.
  - **Unit Tests**: Updated `MinimalCapture.recipe-import.test.tsx` to verify new structured rendering and optional notes.
  - **Zero Drift**: Confirmed schema integrity with `task agent:drift`.

- **High-Fidelity Recipe Sharing — Export Logic (2026-05-16):** Refactored the export pipeline to support structured instructions and enforce privacy scrubbing.
  - **Structured Instructions**: Updated `MapInstructionsToHowToSections` to preserve `HowToSection` objects while maintaining backward compatibility for flat lists (AC 2.1, 2.2).
  - **Privacy Scrubbing**: Explicitly set `Notes` and `Rating` to null in the share bundle to prevent leakage of personal metadata (AC 2.3).
  - **Integration Tests**: Added `GetShareBundle_PreservesStructuredInstructions_WhenPresentInRawMetadata` and `GetShareBundle_WrapsFlatInstructions_InDefaultSection` to verify correctness.

## Standing Notes

- **Global Toast Pattern (ADR 042).** Use `addToast` from `useUiStore` for user action feedback.
- **Playwright Mock Layering (ADR 040).** Use `route.fallback()` instead of `route.continue()` for test-specific overrides.
- **E2E Route Handler Pattern (ADR 035).** Use `new URL(route.request().url())` inside handler bodies.
- **Zero Drift Doctrine.** `task gate` must pass before ending any session.
