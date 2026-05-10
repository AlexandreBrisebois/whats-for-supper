# Implementation Plan: Demo Mode

## Overview
This plan implements Demo Mode, a controlled environment for showing the app. It includes automated database/filesystem resets, AI soft-disables to prevent costs, and UI adjustments for trial users.

## Tasks

- [x] 1. Contract Gate - Update OpenAPI and Management Controller
  - [x] Add `POST /api/management/demo-capture` to `specs/openapi.yaml`.
  - [x] Add `POST /api/management/demo-restore` to `specs/openapi.yaml`.
  - [x] Add `demoMode` boolean to `HealthCheckResponseDto`.
  - [x] Ensure management status includes demo workflows.
  - [x] Run `task api:generate` to update clients and DTOs.
  - _Requirements: [AC-1], [AC-2], [AC-7]_

- [x] 2. Backend - Core Management Logic
  - [x] 2.1 Implement `CaptureDemoStateAsync` in `ManagementService.cs`.
    - [x] Backup `FamilyMembers`, `Recipes`, `RecipeSearchDocuments` to `DATAROOT/demo/`.
    - [x] Clone `recipes/` folder to `DATAROOT/demo/recipes/`.
    - [x] Write a manifest with capture timestamp, schema/version metadata, counts, and file checks.
  - [x] 2.2 Implement `RestoreDemoStateAsync` in `ManagementService.cs`.
    - [x] Validate the manifest and required files before mutating active data.
    - [x] Truncate `RecipeVotes`, `WeeklyPlans`, `CalendarEvents`.
    - [x] Clear stale workflow history without deleting the active restore execution.
    - [x] Restore family members, recipes, recipe search documents, and `recipes/` from `DATAROOT/demo/`.
  - [x] 2.3 Expose endpoints in `ManagementController.cs`.
  - _Requirements: [AC-1], [AC-3], [AC-8], [AC-9]_

- [x] 3. Backend - Demo Mode Restrictions
  - [x] 3.1 Update `Program.cs` to detect `DEMO_MODE=true` and expose via `HealthController`.
  - [x] 3.2 Implement "Soft Disable" for AI workflow processors.
    - [x] Return a completed "Demo Mode Bypass" result for `ExtractRecipe`, `GenerateDescription`, `SynthesizeRecipe`, `WebAcquisition`, `CategorizeIngredients`, and `ClassifyDietaryProfile`.
    - [x] Keep non-AI processors and workflow scheduling untouched.
  - [x] 3.3 Add an optional `IChatClient` circuit breaker in Demo Mode to prevent accidental external AI calls.
  - [x] 3.4 Update `FamilyController.cs` to return 403 for `Create` if `DEMO_MODE=true`.
  - _Requirements: [AC-4], [AC-6]_

- [x] 4. Backend - Demo Restore Workflow
  - [x] 4.1 Create `api/src/RecipeApi/Workflows/demo-restore.yaml`.
    - [x] Use `RestoreDemoState`, then `StartWorkflow` with `${DEMO_RESTORE_CRON_UTC:-0 3 * * *}` and `depends_on`.
  - [x] 4.2 Create `api/src/RecipeApi/Workflows/demo-capture.yaml`.
  - [x] 4.3 Update `WorkflowSeeder.cs` to include the new workflow files.
  - [x] 4.4 Add a Demo restore seeder modeled on `DreamingWorkflowSeeder`, gated by `DEMO_MODE=true`.
  - _Requirements: [AC-1], [AC-2], [AC-3]_

- [x] 5. Frontend - Demo Mode UI Adjustments
  - [x] 5.1 Implement Login Pre-population.
    - [x] Check `demoMode` from health/config.
    - [x] If true, set default value of passphrase field to `"Swipe-Match-Cook"`.
  - [x] 5.2 Implement AI Search Notice.
    - [x] In `SearchPage`, disable Agent/translation toggle and show `demo-ai-notice` toast/pop-out.
    - [x] Keep normal lexical search and precomputed embedding browse/search available.
  - _Requirements: [AC-5], [AC-7]_

- [x] 6. Documentation & Knowledge Transfer
  - [x] 6.1 Update `README.md` with Demo Mode setup and environment variables.
  - [x] 6.2 Update deployment documentation (Docker/Env vars).
  - [x] 6.3 Update User Guide/Developer Guide with Capture/Restore workflows.
  - [x] 6.4 Update mermaid flows in `design.md` if any runtime changes occurred.
  - _Requirements: All_

- [x] 7. E2E & Verification
  - [x] 7.1 Add backend integration tests for capture, restore, missing snapshot, demo-mode family restriction, health `demoMode`, and AI bypass.
  - [x] 7.2 Write `pwa/e2e/demo-mode.spec.ts`.
    - [x] Test login pre-population.
    - [x] Test AI search notice.
  - [x] 7.3 Verify capture/restore cycle via manual trigger.
  - [x] 7.4 Run `task agent:drift`, `task agent:test:impact`, and `task review`.
  - _Requirements: [AC-1] through [AC-9]_

## Task Dependency Graph
```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1"] },
    { "id": 2, "tasks": ["2.3", "3.2", "3.3", "3.4", "4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "5.1", "5.2"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3", "6.4"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3", "7.4"] }
  ]
}
```
