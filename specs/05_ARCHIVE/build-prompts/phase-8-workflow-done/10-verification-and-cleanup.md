# Build Prompt 10: E2E Verification & Legacy Cleanup

**Persona**: QA & Systems Engineer
**Goal**: Finalize the migration by verifying the complete "Recipe Import" workflow end-to-end and removing the deprecated code.

## Strict Scope
- **DELETE**: `api/src/RecipeApi/Services/RecipeImportWorker.cs`, `api/src/RecipeApi/Services/RecipeImportService.cs`.
- **MODIFY**: `pwa/playwright/` (to verify the import flow if applicable).

## Contract & Decisions
- **Decision: Zero-Loss**: Ensure that after deleting the legacy worker, the new system correctly handles all `recipe-import` triggers from the UI.

## Requirements
1.  **Workflow Definition File**:
    - Create `/data/workflows/recipe-import.yaml` with the full 3-step chain (Extract -> Hero -> Sync).
2.  **End-to-End Test Run**:
    - Trigger an import via the PWA (or `.http` file).
    - Watch the logs as the `WorkflowWorker` picks up each task.
    - Verify the recipe is visible in the PWA Discovery stack after completion.
3.  **Cleanup**:
    - Remove all references to the old `RecipeImports` table and the `RecipeImportWorker`.
    - Ensure `Program.cs` is clean and only registers the new `WorkflowWorker`.

## TDD Protocol
1.  Run the full E2E CI script: `scripts/run-e2e-ci.sh`.
2.  Verify that no `RecipeImportStatus` enums or related logic remain in the codebase (Grep for "RecipeImport").

## Mandatory Handover
- Summary of the final verification run.
- Confirmation that legacy code has been successfully purged.
