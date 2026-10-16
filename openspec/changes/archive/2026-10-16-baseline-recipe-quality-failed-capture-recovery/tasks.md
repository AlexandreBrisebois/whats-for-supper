# Documentation-extraction tasks

These tasks describe baseline documentation work only. Checked boxes certify extraction or documentation checks, not implementation, runtime qualification, human acceptance, promotion or archival. Application test-first cycles, generation and migrations are not applicable. API/browser/database/model executions are not run under A34 and this request.

## 1. Trace the existing journey

- [x] 1.1 Verify root/inventory through `openspec list --json`, `openspec context --json`, `openspec list --specs --json` and actual main-spec headers; preserve Git/index and plan before-images. Acceptance: five unchanged main-spec counts and 178 matched prior source identities recorded in BSL-recipe-quality-015.
- [x] 1.2 Trace Profile/Settings → captures.ts/generated GET/POST/DELETE → OpenAPI/controller/service → workflow/task/recipe/maintenance persistence → worker and cleanup consumer → new reads and mounted feedback. Acceptance: BSL-recipe-quality-012/013 documents all 13 requirements' boundaries; promoted PDF/reporting/manual-resolution requirements remain unchanged.

## 2. Reconcile evidence and draft

- [x] 2.1 Inspect component/Settings/generated contract tests, CaptureFailureIntegrationTests and factory substitutions, WorkflowWorkerTests, settings.spec.ts/common handlers and search-hardening.spec.ts retry scenario. Acceptance: BSL-recipe-quality-014 identifies actual assertions versus missing negative, worker, real-store and authenticated evidence; no inspected assertion is labeled executed.
- [x] 2.2 Draft proposal, design and recipe-quality additions; map every requirement/scenario to evidence and U84–U88 in the durable plan. Acceptance: exact header mapping, bounded cleanup dependency, no duplicated PDF-specific requirement and no application/contract/client/SQL/config writes.

## 3. Validate the complete documentation slice

- [x] 3.1 Run `openspec validate baseline-recipe-quality-failed-capture-recovery --strict` and `openspec validate --all --strict`; review all new files plus the complete plan delta against the private before-image. Acceptance: strict results reported and all prior source/main/change/index content preserved apart from the two intentional current-stage/next-action plan replacements and additive records.
- [x] 3.2 Run `task verify` with all six explicit changed paths listed below; reconcile final content identity, preservation and check statuses in the final response/current harness. Acceptance: documentation checks pass or failures/blockers are named; stop at a validated draft for human review without lifecycle/application/successor work.

```sh
task verify -- docs/openspec-baseline-plan.md openspec/changes/baseline-recipe-quality-failed-capture-recovery/.openspec.yaml openspec/changes/baseline-recipe-quality-failed-capture-recovery/proposal.md openspec/changes/baseline-recipe-quality-failed-capture-recovery/design.md openspec/changes/baseline-recipe-quality-failed-capture-recovery/specs/recipe-quality/spec.md openspec/changes/baseline-recipe-quality-failed-capture-recovery/tasks.md
```

## Workflow follow-up

- Human review is the next bounded action. Promotion, archival and implementation are not authorized by this draft or by completed extraction checkboxes.

Observed documentation results: selected strict passed; all strict 23/23 passed; explicit six-path verification passed documentation/spec:check/content. Final verification repeats after these evidence/status edits. Full preservation and 198 source-identity checks passed; final outcomes and tested identity are reported in the response/current harness. No runtime result is implied.

## Promotion follow-up — A78, 2026-10-15

User “promote” separately authorizes the exact reviewed 13 requirements/29 scenarios to main recipe-quality, now 37/92. Original Purpose/prior 24/63, delta/proposal/design/metadata and all 198 source identities retained; BSL-recipe-quality-016 records promotion. Earlier draft stopping-point text is historical and does not supersede A78. All six extraction tasks remain complete; this is documentation promotion, not runtime implementation or archival. Require main/specs/all strict validation, exact equality/preservation, complete three-path diff review and `task verify -- docs/openspec-baseline-plan.md openspec/specs/recipe-quality/spec.md openspec/changes/baseline-recipe-quality-failed-capture-recovery/tasks.md`. Final results/content identity in response/current harness. Runtime/DB/model qualification not-run, A34 deferred; implementation TDD/generation/migrations not-applicable. Stop after promotion; no archive/application/successor work.
