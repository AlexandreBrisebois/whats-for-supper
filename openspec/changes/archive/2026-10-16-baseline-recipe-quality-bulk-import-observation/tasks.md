# Documentation extraction tasks

Checked tasks establish extraction, not runtime acceptance. API/browser/worker/PostgreSQL/model checks remain not-run under A34. Application red/green/refactor, client generation and migrations are not-applicable to documentation-only edits.

## 1. Trace recovery and observation

- [x] 1.1 Inspect bulk POST through contract/generated builder/controller/service/filtered recipe selection/orchestrator/persistence/accepted DTO. Inspect the three exact bulk controller assertions and factory substitutions. Acceptance: BSL-recipe-quality-019 records eligibility, repeat/partial failure boundaries and maps bulk requirements/scenarios without conflating contextual repair or failed-task retry.
- [x] 1.2 Inspect summary GET counters and attributed import-ID GET through binder/service/persisted DTO, generated client and callers. Acceptance: BSL-recipe-quality-019 records excluded workflow states/types, member-attribution assertions, missing counter/error assertions and missing-context contract gap; shared identity/workflow ownership is referenced.

## 2. Draft and validate documentation integration

- [x] 2.1 Produce proposal/design/delta with four requirements/eleven scenarios, complete evidence mappings, source identities and uncertainty records. Acceptance: existing main and active change content remains preserved and disconnected service helpers are excluded from normative endpoint coverage.
- [x] 2.2 Review task-owned diff, source/mapping/overlap/index preservation and strictly validate selected plus all OpenSpec items; run `task verify -- <every changed/new documentation path>`. Acceptance: final selected/all/documentation checks pass with passed/failed/blocked/not-run/not-applicable separately recorded.

## Workflow follow-up

- Human review of the completed drafts is next. Promotion, archival, runtime qualification and application work require separate authorization.

Final documentation commands (checked extraction status is conditional on their final successful execution; outcomes/content identity are in the final response/current harness):

```sh
openspec validate baseline-recipe-quality-bulk-import-observation --strict --no-interactive
openspec validate --all --strict --no-interactive
task verify -- docs/openspec-baseline/recipe-quality.md docs/openspec-baseline-plan.md openspec/changes/baseline-recipe-quality-bulk-import-observation/.openspec.yaml openspec/changes/baseline-recipe-quality-bulk-import-observation/design.md openspec/changes/baseline-recipe-quality-bulk-import-observation/proposal.md openspec/changes/baseline-recipe-quality-bulk-import-observation/specs/recipe-quality/spec.md openspec/changes/baseline-recipe-quality-bulk-import-observation/tasks.md
```

Promotion follow-up (RQ-P01, 2026-10-16): User “promote” after the validated generation report accepts this reviewed delta for documentation-only main-spec sync. Exact requirement/scenario blocks copied into main recipe-quality as part of 7/19 additions (main now 44/111). Delta, proposal, design and metadata remain unchanged. The capability plan records preservation, qualification and validation evidence. No archive, application work or runtime qualification; A34/U01/U75–U88/RQ-Q01–RQ-Q04 retained. Final explicit six-path verification covers this follow-up.
