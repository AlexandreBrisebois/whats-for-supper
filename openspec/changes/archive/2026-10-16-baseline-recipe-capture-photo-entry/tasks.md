# Tasks

## 1. Baseline Evidence Discovery and Reconciliation

- [x] 1.1 Trace photo capture entry, camera/gallery input triggers, and staging validation in `MinimalCapture.tsx`, `useCapture.ts`, `imageUtils.ts`, and test `capture-flow.spec.ts`.
- [x] 1.2 Trace multipart submission, API endpoint `POST /api/recipes`, controller validation, and service intake in `openapi.yaml`, `RecipeController.cs`, `RecipeService.cs`, and `ValidationService.cs`.
- [x] 1.3 Trace background workflow dispatch, `recipe-import.yaml`, `PdfConversionProcessor.cs` photo pass-through, `RecipeAgent.cs` vision extraction/refinement, and `RecipeReadyProcessor.cs` completion.
- [x] 1.4 Trace upload progress overlay, submission lock, and background failure tracking via `WorkflowWorker.cs`, `useScheduleStream.ts`, `captureStore.ts`, and `RecipeFailureBanner.tsx`.

## 2. OpenSpec Baseline Specification Drafting and Validation

- [x] 2.1 Author proposal, design, and delta specification for `recipe-capture` adding 10 requirements and 24 scenarios under `openspec/changes/baseline-recipe-capture-photo-entry/`.
- [x] 2.2 Verify delta specification syntax, formatting, and strict validation using `openspec validate --strict baseline-recipe-capture-photo-entry`.
- [x] 2.3 Record baseline evidence IDs (BSL-recipe-capture-005–008), uncertainties, and checkpoint updates in `docs/openspec-baseline-plan.md`.
- [x] 2.4 Run strict full-item repository validation (`openspec validate --strict --all`) and verify preservation of existing main specs and active changes.

## Workflow follow-up

- A67, 2026-10-15: user “promote baseline-recipe-capture-photo-entry” authorized promotion. Exact 10 requirements/24 scenarios appended to main recipe-capture, now 19/44; original Purpose and prior content preserved. See BSL-recipe-capture-009.
- Corrected the task scenario count from 23 to 24 after counting actual delta headers; delta unchanged. Historical drafting records retain their original reported count.
- All thirteen changes remain active. No archival, application changes, successor extraction or runtime/database qualification authorized.
- Acceptance checks: main/all strict validation, exact delta equality and preservation review, final three-path documentation verification. Results in final response/current harness record.
