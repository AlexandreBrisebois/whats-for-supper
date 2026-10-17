# Proposal

## Why

WFS-BL-003 identifies contextual URL repair failing before launch: the report service omits `url`, which the packaged workflow requires. Existing mock-orchestrator tests do not exercise that parameter contract.

## Outcome and Scope

Eligible URL feedback starts the packaged workflow with the saved source URL and normalized feedback. Preserve manual-only reports, active reuse, terminal suppression, launch-failure persistence and retry. No provider execution, repair quality, multi-replica locking or new user input is promised.

## What Changes

- Supply server-owned URL provenance to contextual launch.
- Verify real workflow definition/orchestrator persistence and browser failure/retry handling.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-quality`: explicitly require contextual URL launch to carry saved provenance while retaining repeated-feedback and failure semantics.

## Impact

`RecipeImportReportService`, focused real-orchestrator tests, existing import-report browser fixture and the POST import-report OpenAPI description. No response shape or generated SDK shape changes are intended. Repository harness and scoped OpenSpec sync/archive follow acceptance.
