# Documentation-only tasks

These tasks extract existing behavior; they authorize no application implementation. Checked discovery/drafting tasks describe completed documentation work, not runtime acceptance. Human review remains the stopping point.

## 1. Discovery and evidence

- [x] 1.1 Resolve root, main inventory and active changes with OpenSpec CLI; verify no existing summary-reading slice and capture Git status, staged diff and capability-plan before-image. Evidence: BSL-recipe-library-029 and private before-images.
- [x] 1.2 Trace summary eligibility/counts/envelope/access and initial Browse count consumption through actual predicates and generated mappings. Inspect API/UI assertion bodies, fixtures and factory substitutions; verify every delta header has an exact evidence mapping in BSL-recipe-library-030/031 and preserve contract disagreements and source-only cases.

## 2. Bounded draft and review

- [x] 2.1 Draft proposal, extraction design and six ADDED recipe-library requirements with fifteen scenarios; compare main library requirements to avoid duplicating list eligibility, page responses, loading, initial failure or Retry. Verify scope and mappings in BSL-recipe-library-031; keep defects and exclusions non-normative.
- [x] 2.2 Review the complete task-owned diff against before-images, preserve staged/concurrent work, run `openspec validate baseline-recipe-library-summary-reading --strict --no-interactive`, `openspec validate --all --strict --no-interactive`, and `task verify -- docs/openspec-baseline/recipe-library.md docs/openspec-baseline-plan.md openspec/changes/baseline-recipe-library-summary-reading/.openspec.yaml openspec/changes/baseline-recipe-library-summary-reading/proposal.md openspec/changes/baseline-recipe-library-summary-reading/design.md openspec/changes/baseline-recipe-library-summary-reading/specs/recipe-library/spec.md openspec/changes/baseline-recipe-library-summary-reading/tasks.md`. Report final outcomes separately from inspected assertions and stop for human review. Selected strict validation passed; the first all-item check failed only on a concurrent unrelated non-cooking-day-plans scaffold with no delta (31 passed/1 failed), retained untouched. Final documentation checks are reported in the handoff; task completion records the requested checks and reporting, not an all-item pass.

## Verification boundaries

API tests `RecipeLibrarySummaryTests`, Browse `page.test.tsx` and `pwa/e2e/browse-all-stack.spec.ts` are assertion evidence only, not executed checks. Their GET summary `{data: counts}` and GET list `{recipes, pagination, updatedAt}` mocks/generated mappings are inspected, not synchronized or regenerated. No API or browser behavior changes: test-first cycles, client generation, live endpoint parity and application finish gates are not applicable to this documentation change. Services/browser/network/database/device/model checks are not-run under the user's explicit prohibition; A34 remains deferred.

## Workflow follow-up

- Human review of this validated draft and its source-only/contract qualifications is the next bounded action. Acceptance, promotion, archival, fixes and successor extraction require separate authorization.

## 3. Authorized documentation promotion — 2026-10-16

- [x] 3.1 Under user “promote it”, sync only this delta's six ADDED requirements and fifteen scenarios into main recipe-library; preserve existing Purpose/55 requirements/122 scenarios. Verify exact appended block equality, unique headers and resulting 61/137 counts; preserve source-only and non-normative limitations in BSL-recipe-library-032.
- [x] 3.2 Update checkpoint/index/promotion evidence, review complete task-owned diff against before-images, and run strict specs, selected-change and all-item validation plus `task verify` with all eight selected documentation paths (the seven paths in 2.2 plus `openspec/specs/recipe-library/spec.md`). Report actual final outcomes separately; preserve unrelated concurrent work and staged audit. Completion records scoped promotion/check execution, not an all-item pass. Change remains active; no archive, implementation or successor work.

This promotion record supersedes the original draft-review next action above. User acceptance is documentation acceptance; runtime qualification remains deferred A34. Final check results belong to the handoff and harness record for final content.
