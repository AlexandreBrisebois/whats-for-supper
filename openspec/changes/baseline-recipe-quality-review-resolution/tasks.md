# Documentation extraction tasks

This change documents current behavior only. Checked items mean source/assertion extraction, not runtime acceptance. All application/unit/API/browser/PostgreSQL/model checks are not-run by instruction (A34). Behavior red/green/refactor, API/client changes, migrations and service startup are not-applicable. No consequential unresolved decision blocks these documentation tasks.

## 1. Establish review entry and saved membership

- [x] 1.1 Confirm Git before-images, CLI root/inventory, actual five main-spec header counts and unchanged prior source identities. Acceptance: A75 and BSL-recipe-quality-010 record 172 matching prior identities, preserved main specs/prior work, and current 9/34 sharing count without rewriting historical counts.
- [x] 1.2 Trace RecipesPage/RecipeFiltersSheet through search wrapper/native fetch/generated DTOs/OpenAPI to RecipeSearchPredicate and public status mapping; inspect filter/page/search integration/browser assertions and fixtures. Acceptance: BSL-recipe-quality-007/009/010 maps requirements 1–3 and all scenarios, records U80 and uncreated recipe-search ownership; no general search/ranking/continuation extraction.

## 2. Establish manual resolution and subsequent reads

- [x] 2.1 Trace issue sheet/detail/gear/badge → resolveRecipeImportIssue → generated DELETE /api/recipes/{id}/import-report → controller/member binder/service → report persistence → unwrapped updatedAt/recipe/importIssue-null response. Acceptance: BSL-recipe-quality-008/009/010 maps requirements 4–9, records member/linked-workflow rejection and U81 contract gap without asserting universal access or correction.
- [x] 2.2 Trace mounted rejection/retry, local success acknowledgement, detail/search subsequent reads and parent refresh callers; inspect exact resolution/component/API/Postgres/browser assertions and mock substitutions. Acceptance: BSL-recipe-quality-008–010 maps requirements 10–11 and U82/U83; no immediate parent refresh, executed retry, real database DELETE or guaranteed recovery claim. Cooking callers remain entry dependencies only.

## 3. Draft and validate documentation integration

- [x] 3.1 Write proposal, design and recipe-quality ADDED delta; update durable authorization/evidence/source identities/all scenario mappings/uncertainties/checkpoint. Acceptance: four artifacts exist, 11 requirements/28 actual scenarios map to inspected evidence, promoted blocks remain unchanged and tasks require documentation only.
- [x] 3.2 Review complete six-path documentation diff against before-images; strictly validate selected change and all OpenSpec items, and run explicit-path repository verification. Acceptance: `openspec validate baseline-recipe-quality-review-resolution --strict`; `openspec validate --all --strict`; `task verify -- docs/openspec-baseline-plan.md openspec/changes/baseline-recipe-quality-review-resolution/.openspec.yaml openspec/changes/baseline-recipe-quality-review-resolution/proposal.md openspec/changes/baseline-recipe-quality-review-resolution/design.md openspec/changes/baseline-recipe-quality-review-resolution/specs/recipe-quality/spec.md openspec/changes/baseline-recipe-quality-review-resolution/tasks.md`. Record passed/failed/blocked/not-run/not-applicable with final content identity and preserved prior work; stop for human review.

## Workflow follow-up

- Human review only. Do not promote, archive, apply implementation or start another slice. Each requires separately authorized work.
- Final validation/verification outcomes belong to the response and `.task/agent-finish/last-run.json`; no runtime acceptance follows from documentation task completion.

Verification record: selected strict validation passed; all-item strict validation passed 22/22; explicit six-path task verification passed documentation, spec:check and content. Before-image checks preserved all 110 prior OpenSpec files, 1470 other existing tracked files and index bytes; plan changes retain prior content except two intentional current-status replacements. All 178 current source identities match (172 prior plus six additional inputs). Final task verify is repeated after recording these outcomes so its identity covers these final bytes; authoritative result is in the response/current harness. Failed: none. Blocked: none. Runtime/API/browser/database/model behavior not-run by instruction; implementation TDD/client generation/migrations not-applicable. Draft validated for human review only.

Promotion follow-up (A76, 2026-10-15): User “promote” after the validated draft authorizes selected main-spec sync and bounded documentation records. Exact 11 requirements/28 scenarios appended to main recipe-quality, now 24/63, preserving original Purpose/prior 13/35 blocks. Delta/proposal/design/metadata and all 178 source identities unchanged. BSL-recipe-quality-011 records promotion and unresolved qualification limits. Main/specs strict validation passed; require final all strict, exact equality/preservation/diff review and explicit three-path task verify. Final outcomes are in response/current harness. No archive, application implementation, runtime qualification or successor work authorized.
