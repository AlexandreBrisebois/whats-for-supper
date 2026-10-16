# Tasks

Documentation extraction only. The seven added requirements and 21 scenarios describe existing behavior; these tasks introduce no application implementation. Behavior TDD, application test execution and client generation are not-applicable to these edits. Runtime API/browser/PostgreSQL/device checks remain not-run. Source and inspected assertions are mapped in BSL-household-identity-003/004/005 in the [durable plan](../../../../docs/openspec-baseline-plan.md).

## 1. Reconcile the selected evidence

- [x] 1.1 Confirm branch/commit, dirty inputs and resolved local root with Git status/identity, `openspec list --json` and `openspec context --json`; verify the existing member-selection main spec and archive remain intact and record A18 bounded drafting authorization in the plan.
- [x] 1.2 Recheck Welcome → passphrase action → token/cookie → PWA gates and API global policy/handler against BSL-003/004/005; inspect auth-flow, Welcome unit and AuthEnforcementTests assertions/substitutions; verify A17 and U13/U14/U15 exclusions against the source and contract without changing them.

## 2. Extract the bounded baseline

- [x] 2.1 Draft proposal and the `household-identity` ADDED delta; verify all seven requirements/21 scenarios against the plan's evidence mapping and preserve the accepted five requirements/ten scenarios byte-for-byte in main specs.
- [x] 2.2 Record the cross-boundary extraction design and limits; verify it explains the Next action versus OpenAPI boundary, separate page/API gates, cookie settings versus token age, and withheld cookie-contract/universal-recovery claims without proposing application changes.

## 3. Validate the documentation handoff

- [x] 3.1 Run `openspec validate baseline-household-identity-shared-access --strict --no-interactive` and the bounded documentation command below; inspect their outcomes, final content identity and preservation comparison, then present the draft for human review with runtime checks not-run.

Bounded documentation command:

```sh
task verify -- docs/openspec-baseline-plan.md openspec/changes/baseline-household-identity-shared-access/.openspec.yaml openspec/changes/baseline-household-identity-shared-access/proposal.md openspec/changes/baseline-household-identity-shared-access/specs/household-identity/spec.md openspec/changes/baseline-household-identity-shared-access/design.md openspec/changes/baseline-household-identity-shared-access/tasks.md
```

The final response and `.task/agent-finish/last-run.json` record final check results/content identity; later documentation edits require fresh applicable verification.

## Workflow follow-up

- The user accepted the shared-access spec on 2026-10-15 (A19): seven added requirements/21 scenarios, unchanged. Acceptance does not qualify runtime behavior; A17 and the recorded evidence limits remain.
- The user authorized main-spec promotion on 2026-10-15 (A20). The seven accepted additions are promoted; main household identity now has 12 requirements/31 scenarios, with its original five requirements/ten scenarios preserved. The accepted delta is unchanged and this change remains active. Archival requires separate authorization. The prior archive remains untouched.
- No application apply or defect repair follows from this documentation-only task list.

## Archive record — 2026-10-15

The user authorized archiving both promoted household-identity changes (A25). This completed documentation extraction is archived with all four artifacts and all five tasks complete. Its delta already matches the promoted main requirements exactly; main remains unchanged at 18 requirements/49 scenarios. Earlier drafting/promotion follow-up and verification commands above record their original lifecycle checkpoints and paths; this record supersedes pending-archive statements.

Metadata and the delta are preserved. External relative links were adjusted for the archive directory. Runtime qualification remains not-run; A17/A22 and all recorded evidence limits remain. Final archival documentation checks are recorded in the session response and harness last-run record. No application work or successor slice is authorized by archival.
