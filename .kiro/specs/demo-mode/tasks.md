# Implementation Plan: Demo Mode

## Overview
This plan implements Demo Mode, a controlled environment for showing the app. It includes automated database/filesystem resets, AI soft-disables to prevent costs, and UI adjustments for trial users.

## Tasks

- [ ] 1. Contract Gate - Update OpenAPI and Management Controller
  - Add `POST /api/management/demo-capture` to `specs/openapi.yaml`.
  - Add `POST /api/management/demo-restore` to `specs/openapi.yaml`.
  - Add `demoMode` boolean to `HealthCheckResponseDto`.
  - Run `task api:generate` to update clients and DTOs.
  - _Requirements: [AC-1], [AC-2]_

- [ ] 2. Backend - Core Management Logic
  - [ ] 2.1 Implement `CaptureDemoStateAsync` in `ManagementService.cs`.
    - Backup `FamilyMembers`, `Recipes`, `RecipeSearchDocuments` to `DATAROOT/demo/`.
    - Clone `recipes/` folder to `DATAROOT/demo/recipes/`.
  - [ ] 2.2 Implement `RestoreDemoStateAsync` in `ManagementService.cs`.
    - Truncate `RecipeVotes`, `WeeklyPlans`, `CalendarEvents`.
    - Restore from `DATAROOT/demo/`.
  - [ ] 2.3 Expose endpoints in `ManagementController.cs`.
  - _Requirements: [AC-1], [AC-3]_

- [ ] 3. Backend - Demo Mode Restrictions
  - [ ] 3.1 Update `Program.cs` to detect `DEMO_MODE=true` and expose via `HealthController`.
  - [ ] 3.2 Implement "Soft Disable" in `WorkflowOrchestrator.cs`.
    - Skip `RecipeAgent`, `WebAcquisitionAgent` etc. if `DEMO_MODE` is active.
  - [ ] 3.3 Update `FamilyController.cs` to return 403 for `Create` if `DEMO_MODE=true`.
  - _Requirements: [AC-4], [AC-6]_

- [ ] 4. Backend - Demo Restore Workflow
  - [ ] 4.1 Create `api/src/RecipeApi/Workflows/demo-restore.yaml`.
  - [ ] 4.2 Update `WorkflowSeeder.cs` to include the new workflow.
  - [ ] 4.3 Update `WorkflowWorker` or a startup task to seed the first `demo-restore` if needed.
  - _Requirements: [AC-2], [AC-3]_

- [ ] 5. Frontend - Demo Mode UI Adjustments
  - [ ] 5.1 Implement Login Pre-population.
    - Check `demoMode` from health/config.
    - If true, set default value of passphrase field to `"Swipe-Match-Cook"`.
  - [ ] 5.2 Implement AI Search Notice.
    - In `SearchPage`, disable Agent toggle and show `demo-ai-notice` toast/pop-out.
  - _Requirements: [AC-5], [AC-7]_

- [ ] 6. Documentation & Knowledge Transfer
  - [ ] 6.1 Update `README.md` with Demo Mode setup and environment variables.
  - [ ] 6.2 Update deployment documentation (Docker/Env vars).
  - [ ] 6.3 Update User Guide/Developer Guide with Capture/Restore workflows.
  - [ ] 6.4 Update mermaid flows in `design.md` if any runtime changes occurred.
  - _Requirements: All_

- [ ] 7. E2E & Verification
  - [ ] 7.1 Write `pwa/e2e/demo-mode.spec.ts`.
    - Test login pre-population.
    - Test user creation 403.
    - Test AI search notice.
  - [ ] 7.2 Verify capture/restore cycle via manual trigger.
  - _Requirements: [AC-8]_

## Task Dependency Graph
```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1"] },
    { "id": 2, "tasks": ["2.3", "3.2", "3.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.1", "5.2"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3", "6.4"] },
    { "id": 6, "tasks": ["7.1", "7.2"] }
  ]
}
```
