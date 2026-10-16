# Tasks

Documentation extraction only. Checkboxes record this draft's extraction and verification; they authorize no application implementation. Test-first behavior cycles, API/client/mock synchronization and new regression tests are not applicable because no behavior or contract is changed. Inspected tests are evidence inputs, not executed results.

## 1. Establish acceptance and persisted state

- [x] 1.1 Trace definition lookup, parameters, callers, initial save/commit and returned identity; verify BSL-background-processing-001 source anchors and assertions map every scenario in requirements 1–4, including absent/invalid inputs and scheduled roots.
- [x] 1.2 Trace due selection, local throttles, dispatch, dependency promotion, completion and partial work; verify BSL-background-processing-002 against requirements 5–8 and record concurrency/assertion limits U90/U91.

## 2. Extract retries, terminal outcomes and observations

- [x] 2.1 Trace caught-exception predicates, retry counts/limits, delay/window schedule, sibling staggering, diagnostics and isolated pause saves; verify BSL-background-processing-003 and inspected worker/scheduler/AI assertions map requirements 9–13, retaining U92/U93.
- [x] 2.2 Reconcile successful detail reads, DTO/contract representation, factory substitutions and promoted capture/quality owners; verify BSL-background-processing-004 and requirement 14 mapping, preserving U01/U75–U88, PDF boundaries, A69, A34 and every historical qualification.

## 3. Verify the bounded documentation draft

- [x] 3.1 Review proposal/design/delta/tasks and complete requirement/scenario mapping in BSL-background-processing-005; run `openspec validate baseline-background-processing-workflow-lifecycle --strict` and `openspec validate --all --strict`; record exact outcomes and actual header counts without treating CLI artifact existence as human acceptance.
- [x] 3.2 Review the complete six-path documentation diff, compare the plan with its private before-image and preserve all other source/index/artifact bytes; run `task verify --` with the six explicit changed file paths listed in BSL-background-processing-005 and record passed/failed/blocked/not-run/not-applicable separately. No services or runtime tests.

## Workflow follow-up

- Stop at a validated draft for human review. Acceptance, promotion, archival and any later slice require separate authorization.

Evidence: selected strict and all-item strict passed (24/24); six-path documentation verification passed documentation/spec:check/content. Before-image and mapping checks passed. Final verification after these evidence updates is required; final outcome/content identity is in the response and current `.task/agent-finish/last-run.json`. No runtime tests executed; no failed or blocked required check recorded.

## Promotion record — 2026-10-15

A80 user “promote” accepts the reviewed draft for main-spec sync. Installed openspec-sync-specs creates main background-processing with exact reviewed Purpose and 14 requirements/42 scenarios; BSL-background-processing-006 records this authorized follow-up. Prior drafting tasks/evidence remain historical. Strict main/specs/all validation, exact equality/preservation and three-path documentation verification are required; final outcomes/content identity are in the response/current harness. The change remains active. No application implementation, archival, runtime qualification or successor slice is authorized.
