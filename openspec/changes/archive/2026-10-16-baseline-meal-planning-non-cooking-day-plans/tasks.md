# Tasks

Documentation extraction only under NC-A01 in the [capability plan](../../../../docs/openspec-baseline/meal-planning.md). R1–R19 denote that plan's exact 19-requirement/44-scenario mapping. Checkboxes concern this draft, not implementation, human acceptance, promotion, runtime qualification or archival.

## 1. Trace the recipe-free lifecycle and record evidence

- [x] 1.1 Establish root/schema/current inventories, dirty work and before-images; verify `openspec list --json`, `openspec context --json`, `openspec list --specs`, actual main headers and initial staged/unstaged whitespace evidence in NC-A01. Preserve unrelated/concurrent paths and staged bytes; record the absent historical EOF blocker.
- [x] 1.2 Trace dated entry/sheet/validation/client/OpenAPI/access/service/calendar/week/relational/publication/response/reread/Home boundaries for R1–R19; verify BSL-meal-planning-014–020 source anchors and SHA-256 identities, inspected assertion substitutions and U116–U122 while retaining U95–U115. Unit/API/browser/PostgreSQL/network/model execution is not-run by authorization, not a passing or skipped runtime result.

## 2. Extract and reconcile the bounded documentation draft

- [x] 2.1 Produce proposal/design and an ADDED-only meal-planning delta; verify all R1–R19/44 exact scenario headers map to BSL-014–020, no promoted header is duplicated, Purpose/30 prior requirements/70 prior scenarios are unchanged, and access/recipe facts/live reconciliation reference their existing owners. Record source-supported partial success, local pending limits and EF/SQL mismatch without asserting disputed guarantees.
- [x] 2.2 Finalize capability/index checkpoint and review every selected documentation path, then validate selected/all OpenSpec items strictly and verify preservation/content identity. Record actual passed/failed/blocked evidence separately, including any unrelated concurrent all-item failure. Run the explicit seven-path task verify below; completion requires its applicable documentation checks or an accurately recorded blocker. Stop at the human-review draft.

## Acceptance commands and evidence boundary

```sh
openspec validate baseline-meal-planning-non-cooking-day-plans --strict --no-interactive
openspec validate --all --strict --no-interactive
task verify -- docs/openspec-baseline/meal-planning.md docs/openspec-baseline-plan.md openspec/changes/baseline-meal-planning-non-cooking-day-plans/.openspec.yaml openspec/changes/baseline-meal-planning-non-cooking-day-plans/proposal.md openspec/changes/baseline-meal-planning-non-cooking-day-plans/design.md openspec/changes/baseline-meal-planning-non-cooking-day-plans/specs/meal-planning/spec.md openspec/changes/baseline-meal-planning-non-cooking-day-plans/tasks.md
```

The first selected strict validation passed; the first all-item run passed this change but failed a concurrently scaffolded unrelated claim-corrections change with no delta (32 passed/1 failed). The first seven-path task verify passed documentation/content but failed spec:check on that unrelated missing delta; the next stopped on content mutation during concurrent work (spec:check not-run). After the concurrent artifacts appeared, strict all-item validation passed 33/33 and a complete seven-path verify passed documentation/spec:check/content. Task 2.2 acceptance is satisfied; final evidence-record edits require another final verification. Final post-record outcomes/content identity belong to the handoff and `.task/agent-finish/last-run.json`. Documentation needs no preparation. Behavior TDD/new tests, API/client/mock synchronization, schema/migrations and deployment are not-applicable; runtime/unit/API/browser/network/database/model checks remain not-run. No services are started. Source/test presence does not qualify transactional enforcement, delivery, safe retry, exact rollback or convergence.

## Workflow follow-up

- NC-A02: user “promote” accepted the validated 19/44 draft on 2026-10-16. The exact reviewed delta is synced to main meal-planning (49/114); BSL-meal-planning-021 records promotion and preservation. Prior draft commands/results above remain historical. The source change stays active. Await a separately selected action; archival, implementation, runtime qualification and another slice remain outside scope.

## Promotion verification — NC-A02

Promotion is documentation only. Verify unchanged original Purpose/prior 30/70 blocks and exact reviewed 19/44 append, retained U95–U122, unchanged source identities/other main specs/unrelated and staged bytes, complete mappings and the full four-path promotion diff. Strict selected-change, main, all-spec and all-item validation plus the explicit verification below establish this promotion's check outcome, not runtime behavior. Actual final outcomes/content identity belong to the final handoff and `.task/agent-finish/last-run.json`.

```sh
openspec validate baseline-meal-planning-non-cooking-day-plans --strict --no-interactive
openspec validate meal-planning --type spec --strict --no-interactive
openspec validate --specs --strict --no-interactive
openspec validate --all --strict --no-interactive
task verify -- openspec/specs/meal-planning/spec.md docs/openspec-baseline/meal-planning.md docs/openspec-baseline-plan.md openspec/changes/baseline-meal-planning-non-cooking-day-plans/tasks.md
```

Runtime/unit/API/browser/network/database/model qualification remains not-run. Application TDD/tests, generated-client/contract/mock synchronization, migrations and deployment remain not-applicable. No archive or implementation is authorized.
