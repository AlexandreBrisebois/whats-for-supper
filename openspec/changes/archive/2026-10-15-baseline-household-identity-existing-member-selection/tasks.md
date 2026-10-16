# Tasks

Documentation extraction only. No application implementation or behavior TDD cycle is applicable. Runtime API, PostgreSQL, browser and device checks are not-run; contract/client regeneration and application-change checks are not-applicable. Evidence and requirement/scenario mapping live in `docs/openspec-baseline-plan.md`.

The user accepted the bounded spec and explicitly requested `design.md` on 2026-10-15. This supersedes its initial conditional omission. The design records existing seams and extraction decisions; no new application architecture or implementation tasks are introduced.

## 1. Reconcile the selected evidence

- [x] 1.1 Confirm the recorded commit, dirty inputs and local OpenSpec root before scaffolding; verify `git status --short`, `git rev-parse HEAD`, `openspec list --json`, `openspec list --specs --json` and `openspec context --json` identify the unchanged application snapshot and absent main specs; record A06 authorization in the plan.
- [x] 1.2 Reconcile BSL-household-identity-001 and the protected-entry boundary BSL-household-identity-002 from onboarding/UI through generated family client/OpenAPI, controller/service and persisted members; inspect assertion/substitution limits and verify that U13/contract gaps and non-awaited writes remain qualified in the plan.

## 2. Extract the bounded baseline

- [x] 2.1 Draft the proposal and `specs/household-identity/spec.md` with listing, selection, current-member API, client recovery and Profile display requirements; verify every scenario against the plan's mapping table and withhold unsupported persistence/stale-identity guarantees and uncontracted 404 behavior.
- [x] 2.2 Review normative language against source, failure paths, shared ownership and the ordinary-household scope; verify no source/test/contract/generated/SQL/configuration edits and no navigation-spec restoration occurred; record artifact and human-review status separately in the plan.

## 3. Validate the documentation handoff

- [x] 3.1 Run `openspec validate baseline-household-identity-existing-member-selection --strict --no-interactive` and `task verify -- docs/openspec-baseline-plan.md openspec/changes/baseline-household-identity-existing-member-selection/.openspec.yaml openspec/changes/baseline-household-identity-existing-member-selection/proposal.md openspec/changes/baseline-household-identity-existing-member-selection/specs/household-identity/spec.md openspec/changes/baseline-household-identity-existing-member-selection/tasks.md`; verify results and final content identity in the plan/harness record, then present the validated draft with human acceptance pending.

## 4. Accepted-spec design documentation

- [x] 4.1 Record explicit acceptance of the existing five requirements/ten scenarios and create `design.md` from installed instructions; verify the accepted spec is unchanged, design decisions reference BSL-household-identity-001/002 and U13, and the plan distinguishes accepted spec from the newly authored design.
- [x] 4.2 Validate the design and reconciled artifacts with strict OpenSpec validation and `task verify` over the plan plus all five change files, including design; record final evidence and stop without promotion, archival or application implementation.

## Workflow follow-up

- Human acceptance of the existing bounded spec was recorded on 2026-10-15. The newly requested design is prepared for review; the user separately authorized main-spec promotion on 2026-10-15, and it has been performed for the accepted delta only. The user subsequently authorized archival on 2026-10-15; all seven extraction tasks were complete and the delta already matched main specs before the archive move. Historical commands above refer to the original active-change paths. Final archive validation uses the current paths recorded in the durable plan. None is an application implementation task.
