# Tasks: Recipe Share and Capture

## Implementation Plan

This feature is intentionally scoped to one dependable export/import loop:
- export `.recipe` from recipe detail,
- manually import `.recipe` from `/capture`,
- review before add,
- return to the main app flow on success.

Every task follows contract -> tests -> implementation.
No task in this spec should introduce `file_handlers`, `launchQueue`, or an
inbound share target.

## Wave 1: Contract And Backend Bundle Seams

- [x] 1. Contract - Define bundle DTOs and routes
  - Update `specs/openapi.yaml` with:
    - `GET /api/recipes/{id}/share`
    - `POST /api/recipes/import-bundle`
    - `RecipeShareBundleDto`
    - `ImportedRecipeDto`
    - `RecipeShareInfoDto`
    - `SharedImageDto`
  - Ensure export and import contracts match `design.md` exactly.
  - Regenerate clients using the repo’s contract workflow after the spec change.
  - Synchronize any contract-derived shared types used by the PWA in the same slice.
  - _Requirements: Requirement 1, Requirement 4, Requirement 7_

- [x] 2. API Tests - Lock privacy scrubbing and import validation before logic
  - Create or update backend tests first:
    - `api/src/RecipeApi.Tests/Services/RecipeShareServiceTests.cs`
    - import endpoint/service test file as appropriate for the existing test layout
  - Add red tests for:
    - forbidden fields omitted from exported bundle,
    - max 5 original images exported,
    - unsupported bundle version returns HTTP 400,
    - malformed payload returns HTTP 400,
    - valid bundle creates a ready recipe.
  - _Requirements: Requirement 1, Requirement 4_

- [x] 3. API - Implement export bundle generation
  - Implement `GET /api/recipes/{id}/share`.
  - Build the bundle from existing recipe/domain data.
  - Strip all sender-private fields listed in requirements.
  - Produce deterministic image payload ordering.
  - _Requirements: Requirement 1_

- [x] 4. API - Implement bundle import endpoint
  - Implement `POST /api/recipes/import-bundle`.
  - Validate bundle version and required fields.
  - Map `RecipeShareBundleDto` into the existing recipe creation/import path.
  - Persist imported recipes as ready when bundle content is already complete.
  - Preserve `isSynthesized`.
  - _Requirements: Requirement 4_

- [x] 5. Checkpoint - Reconcile and verify backend seam
  - Run:
    - `task agent:reconcile`
    - `task agent:drift`
    - targeted backend tests or `task agent:test:impact`
  - Resolve any contract drift, stale generated client output, or unsynchronized types before touching the PWA.
  - _Requirements: Requirement 1, Requirement 4, Requirement 6, Requirement 7_

## Wave 2: PWA Export Flow

- [x] 6. PWA Tests - Lock share/export trigger behavior first
  - Create or update the relevant recipe detail component test file(s).
  - Add red tests for:
    - `recipe-share-btn` renders in the intended detail surfaces,
    - Share occupies the current visible Edit action slot on mobile,
    - Edit is moved under the gear/settings overflow,
    - `View original` remains a separate provenance action,
    - tapping it requests the export endpoint,
    - export failure renders `recipe-share-error`.
  - _Requirements: Requirement 1_

- [x] 7. PWA - Implement recipe export trigger
  - Add `recipe-share-btn` to `StackActionBar` and `RecipeDetailSheet`.
  - Replace the current visible Edit action placement with Share on mobile recipe detail.
  - Move Edit under the gear/settings overflow.
  - Leave `View original` separate from Share.
  - Fetch the export bundle from the synchronized generated API client/types.
  - Convert the payload into a `.recipe` file for native save/share behavior.
  - Keep failure local to the detail surface with `recipe-share-error`.
  - _Requirements: Requirement 1, Requirement 7_

- [x] 8. Checkpoint - Verify outbound flow
  - Run impacted frontend tests.
  - Confirm the PWA is using synchronized generated client/types rather than local DTO copies.
  - Confirm no new unsupported platform claims or manifest changes were introduced.
  - _Requirements: Requirement 1, Requirement 7_

## Wave 3: Manual Import Entry And Review State

- [x] 9. PWA Tests - Lock manual import entry before implementation
  - Create or update `MinimalCapture` tests first.
  - Add red tests for:
    - `import-recipe-file-btn` renders on `/capture`,
    - valid file selection enters review state,
    - invalid file selection shows `bundle-import-error`,
    - canceling/rejecting returns to default capture state,
    - accept disables while submit is pending.
  - _Requirements: Requirement 2, Requirement 3_

- [x] 10. PWA - Add manual `.recipe` import entry to capture
  - Add `import-recipe-file-btn` to the secondary actions section on the capture screen.
  - Preserve the existing top `Camera` / `Gallery` block unchanged.
  - Ensure the secondary action order is:
    - `Paste recipe link`
    - `Describe a recipe`
    - `Import recipe file`
  - Wire a local file input limited to `.recipe`.
  - Parse the selected file client-side.
  - Reject malformed JSON or wrong-shape payloads with `bundle-import-error`.
  - _Requirements: Requirement 2_

- [x] 11. PWA - Implement bundle review state
  - Extend `MinimalCapture` or a tightly scoped child component to support:
    - `bundle-preview-card`
    - preview metadata fields
    - `accept-bundle-btn`
    - `reject-bundle-btn`
  - Keep bundle review state local and resettable.
  - _Requirements: Requirement 3_

- [x] 12. PWA - Implement import submit and success transition
  - POST the accepted bundle to `/api/recipes/import-bundle` via the synchronized generated client/types.
  - Keep the preview visible on failure.
  - Render `bundle-import-success` on success.
  - Provide `bundle-import-done-btn` that returns the user to `/home`.
  - _Requirements: Requirement 3, Requirement 5, Requirement 7_

- [x] 13. Checkpoint - Verify no-dead-end capture flow
  - Run impacted frontend tests.
  - Manually confirm the user can:
    - enter capture,
    - pick a file,
    - reject and recover,
    - accept and exit.
  - _Requirements: Requirement 2, Requirement 3, Requirement 5_

## Wave 4: E2E And Mock Hardening

- [x] 14. E2E Tests - Add deterministic bundle fixtures and route mocks first
  - Add a valid `.recipe` fixture with a fixed timestamp.
  - Add an invalid `.recipe` fixture.
  - Extend `pwa/e2e/mock-api.ts` builders/routes for:
    - `GET /api/recipes/{id}/share`
    - `POST /api/recipes/import-bundle`
  - _Requirements: Requirement 1, Requirement 3, Requirement 4, Requirement 6_

- [x] 15. E2E - Implement the export/import journey spec
  - Create `pwa/e2e/recipe-share.spec.ts`.
  - Cover:
    - export trigger visibility,
    - manual import from `/capture`,
    - preview rendering,
    - successful accept path,
    - invalid bundle error path.
  - Use only `page.getByTestId(...)` for interactions and assertions.
  - _Requirements: Requirement 1, Requirement 2, Requirement 3, Requirement 5, Requirement 6_

- [x] 16. Docs - Update supporting documentation in the same slice
  - Update documentation that describes:
    - capture acquisition methods,
    - recipe sharing/export,
    - manual `.recipe` import behavior,
    - any route or flow references changed by this feature.
  - Ensure docs describe the final simplified model:
    - primary `Camera` / `Gallery` block,
    - secondary actions with `Import recipe file` last,
    - no inbound share target or OS file-handler promise.
  - _Requirements: Requirement 6_

- [x] 17. Checkpoint - Final verification
  - Run:
    - `task agent:drift`
    - `task agent:test:impact`
    - `task review`
  - Work is not complete until contract, generated clients/types, mocks, tests, and docs agree.
  - _Requirements: Requirement 1, Requirement 2, Requirement 3, Requirement 4, Requirement 5, Requirement 6, Requirement 7_

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 1,
      "label": "Contract And Backend Bundle Seams",
      "tasks": [1, 2, 3, 4, 5]
    },
    {
      "id": 2,
      "label": "PWA Export Flow",
      "tasks": [6, 7, 8],
      "dependsOn": [1]
    },
    {
      "id": 3,
      "label": "Manual Import Entry And Review State",
      "tasks": [9, 10, 11, 12, 13],
      "dependsOn": [1]
    },
    {
      "id": 4,
      "label": "E2E And Mock Hardening",
      "tasks": [14, 15, 16, 17],
      "dependsOn": [2, 3]
    }
  ]
}
```

## Definition Of Done For This Spec

1. The contract names and DTO fields match `requirements.md` and `design.md`.
2. No task introduces unsupported inbound platform behavior.
3. The import path is fully manual and testable from `/capture`.
4. Every new interactive/state-bearing UI element has a `data-testid`.
5. The user always has a clear next action in review and success states.
6. `specs/openapi.yaml`, `pwa/e2e/mock-api.ts`, relevant tests, and supporting docs are all updated in the same slice.
7. Generated API clients and any contract-derived shared types are regenerated/synchronized in the same slice as the OpenAPI change.
