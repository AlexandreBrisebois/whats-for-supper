# Implementation Plan: Demo Mode AWS Deploy Hardening

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "name": "Contracts and Diagnostics",
      "dependsOn": [],
      "tasks": [1, 2]
    },
    {
      "wave": 2,
      "name": "AWS Credential Parity",
      "dependsOn": [1],
      "tasks": [3]
    },
    {
      "wave": 3,
      "name": "Demo Runtime Hardening",
      "dependsOn": [1, 2],
      "tasks": [4, 5]
    },
    {
      "wave": 4,
      "name": "PWA Demo UX Coherence",
      "dependsOn": [1, 4],
      "tasks": [6, 7]
    },
    {
      "wave": 5,
      "name": "E2E and Deployment Gate",
      "dependsOn": [2, 3, 5, 7],
      "tasks": [8, 9]
    }
  ]
}
```

## Tasks

- [x] 1. Contract - Extend management and health demo diagnostics payload
  - Red: Add/adjust contract tests and schema checks proving new fields are required and typed.
  - Green: Update `specs/openapi.yaml` and generated client models.
  - Verify no drift with `task agent:drift`.
  - _Requirements: AC-2, AC-4, AC-5_

- [x] 2. API Tests - Add deterministic coverage for demo parsing, cron validity, snapshot readiness
  - Red: Add failing unit/integration tests for:
  - invalid `DEMO_MODE` values warning behavior,
  - invalid cron seeder status,
  - missing snapshot reporting.
  - Green: minimal runtime behavior updates to pass.
  - _Requirements: AC-2, AC-4, AC-5, AC-6_

- [x] 3. Infrastructure Tests - Enforce AWS DB credential parity
  - Red: Add infra-level tests/assertions that fail on username/password source mismatch between RDS, migrator, and API env wiring.
  - Green: consolidate credential source and references.
  - _Requirements: AC-1, AC-6_

- [x] 4. API Runtime - Expose demo seeder health and diagnostics in management status
  - Red: Integration test that management status surfaces seeder health and error code when cron invalid.
  - Green: Add minimal status plumbing only.
  - _Requirements: AC-2, AC-4_

- [x] 5. API Runtime - Define and expose demo capabilities for AI-dependent surfaces
  - Red: Tests covering deterministic capability flags in demo and non-demo modes.
  - Green: Add response fields and mapping logic.
  - _Requirements: AC-3, AC-6_

- [x] 6. PWA Unit - Gate agent and photo search controls from API capability flags
  - Red: Add failing tests in recipes page unit tests for disabled/gated controls and notices.
  - Green: implement minimal UI gating.
  - Ensure all interactive elements have `data-testid` from design index.
  - _Requirements: AC-3, AC-6_

- [x] 7. PWA Mock Contract - Update `pwa/e2e/mock-api.ts` for deterministic demo variants
  - Red: Add failing E2E setup expectations for new fields and fixed timestamps.
  - Green: implement mocks and fixture wiring.
  - _Requirements: AC-2, AC-3, AC-6_

- [x] 8. E2E - Demo-mode coherence and no-dead-end flows
  - Red: Add failing E2E scenarios:
  - demo mode blocks/guides agent feature,
  - photo feature behavior matches chosen policy,
  - notices appear via test IDs only.
  - Green: minimal UI/API adjustments to pass.
  - Use fixed date clock and `page.getByTestId(...)` only.
  - _Requirements: AC-3, AC-6_

- [x] 9. Deployment Verification Checklist - Codify release gate for demo deploy
  - Add checklist to deployment docs:
  - verify `/api/health.demoMode` is true,
  - verify management snapshot readiness,
  - verify next demo restore scheduled,
  - verify blocked AI controls behavior in PWA.
  - _Requirements: AC-1, AC-2, AC-3, AC-4_
