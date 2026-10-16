# Proposal

## Why

Recipe quality recovery has connected API-only import controls and observation not fully covered by the promoted household journeys. Extract their actual eligibility and counting rules without presenting an accepted workflow as a repaired recipe.

## What Changes

- Add bulk import selection, accepted instance identities and empty response behavior.
- Add the import summary's narrow workflow/state counts.
- Add attributed import-ID reads, reusing shared workflow detail representation and existing identity transport.
- Record missing assertions, partial-batch/repeat behavior and unconnected retired helpers in BSL-recipe-quality-019 in `docs/openspec-baseline/recipe-quality.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-quality`: Add API-only import recovery requests and observation. Existing contextual report policy and Settings failed-task retry remain separate operations.

## Impact

Documentation only. Evidence: RecipeController, RecipeImportController, RecipeImportBulkService, RecipeImportService, report lifecycle, workflow orchestration/persistence, DTOs/OpenAPI/generated builders and inspected tests/mocks. No application edits or runtime/DB/model qualification. Quality owns these recovery/observation entry points; recipe-capture owns acquisition/extraction/readiness, background-processing owns workflow representation/scheduling and household-identity owns shared access/transport. No new capability structure, operator role or household-wide polling promise. Preserve A34/U01/U75–U88. No promotion or archive.
