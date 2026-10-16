# Documentation extraction tasks

Checked tasks mean source-supported extraction only. Runtime/browser clipboard qualification is not-run under A34. Application TDD, client generation, migrations and application tests for these documentation edits are not-applicable.

## 1. Trace failure references

- [x] 1.1 Inspect guarded failure persistence/public DTO, generated mapping, detail/cooking props and clipboard handler; inspect exact test assertions. Acceptance: BSL-recipe-quality-018 records nested visibility, identifier source, conditional acknowledgement and absent clipboard assertions/recovery.
- [x] 1.2 Draft two requirements/five scenarios and reconcile each with promoted failure/indicator requirements. Acceptance: proposal/design/delta, evidence mappings and source identities preserve A34/U01/U75–U88 without adding a server operation or unsupported clipboard guarantee.

## 2. Validate documentation integration

- [x] 2.1 Review complete task-owned content, verify scenario mappings/source identities/preservation, run selected and all strict OpenSpec validation and `task verify -- <every changed/new documentation path>`. Acceptance: final selected/all/documentation checks pass with failed/blocked/not-run/not-applicable separately reported.

## Workflow follow-up

- Human review precedes separately authorized promotion. No application implementation or archive is part of these tasks.

Final documentation commands (checked extraction status is conditional on their final successful execution; outcomes/content identity are in the final response/current harness):

```sh
openspec validate baseline-recipe-quality-failure-references --strict --no-interactive
openspec validate --all --strict --no-interactive
task verify -- docs/openspec-baseline/recipe-quality.md docs/openspec-baseline-plan.md openspec/changes/baseline-recipe-quality-failure-references/.openspec.yaml openspec/changes/baseline-recipe-quality-failure-references/design.md openspec/changes/baseline-recipe-quality-failure-references/proposal.md openspec/changes/baseline-recipe-quality-failure-references/specs/recipe-quality/spec.md openspec/changes/baseline-recipe-quality-failure-references/tasks.md
```

Promotion follow-up (RQ-P01, 2026-10-16): User “promote” after the validated generation report accepts this reviewed delta for documentation-only main-spec sync. Exact requirement/scenario blocks copied into main recipe-quality as part of 7/19 additions (main now 44/111). Delta, proposal, design and metadata remain unchanged. The capability plan records preservation, qualification and validation evidence. No archive, application work or runtime qualification; A34/U01/U75–U88/RQ-Q01–RQ-Q04 retained. Final explicit six-path verification covers this follow-up.
