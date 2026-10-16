# Tasks

## 1. Baseline Evidence Discovery and Reconciliation

- [x] 1.1 Trace capture entry, prefill parameters, and link input review in `pwa/src/components/capture/MinimalCapture.tsx`, route `pwa/src/app/(app)/capture/page.tsx`, and tests `MinimalCapture.test.tsx` and `capture-flow.spec.ts`.
- [x] 1.2 Trace submission validation, API client `captureUrl`, and endpoint `POST /api/recipes/capture-url` in `specs/openapi.yaml`, `RecipeController.cs`, and `RecipeService.cs`.
- [x] 1.3 Trace workflow dispatch, `url-import.yaml`, `WebAcquisitionAgent.cs`, `RecipeAgent.cs`, and `RecipeReadyProcessor.cs` background execution and readiness status finalization.
- [x] 1.4 Trace client background task tracking, queued state countdown, and inline ready status transition with SSE events in `MinimalCapture.tsx`.

## 2. OpenSpec Baseline Specification Drafting and Validation

- [x] 2.1 Author proposal, design, and delta specification for `recipe-capture` covering 9 requirements and 20 scenarios under `openspec/changes/baseline-recipe-capture-url-entry/`.
- [x] 2.2 Verify delta specification syntax, formatting, and strict validation using `openspec validate --strict --change baseline-recipe-capture-url-entry`.
- [x] 2.3 Record baseline evidence IDs (BSL-recipe-capture-001–004), uncertainty entries (U58–U61), and checkpoint updates in `docs/openspec-baseline-plan.md`.
- [x] 2.4 Run strict full-item repository validation (`openspec validate --strict --all`) and verify preservation of existing main specs and unrelated changes.

## Workflow follow-up

- Promoted delta specification to main `openspec/specs/recipe-capture/spec.md` under user authorization (A65).
- Stop after promotion; all twelve changes remain active.
- Archival and application modifications remain unauthorized.
