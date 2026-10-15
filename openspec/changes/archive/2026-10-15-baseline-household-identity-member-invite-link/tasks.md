# Tasks

Documentation extraction only: six ADDED requirements/18 scenarios describe existing repository behavior. No application implementation tasks follow. Behavior TDD, new/changed tests, client generation and application verification are not-applicable to these edits. Browser/API/PostgreSQL/device runtime checks remain not-run. Evidence and assertion limits are in BSL-household-identity-006/007/008 in the [durable plan](../../../../docs/openspec-baseline-plan.md).

## 1. Reconcile selected evidence and authority

- [x] 1.1 Confirm branch/commit, dirty inputs and local root through Git status/identity, OpenSpec list/context and config; record A23 authorization and verify the existing main identity spec remains 12 requirements/31 scenarios with prior shared-access change/archive untouched.
- [x] 1.2 Recheck Settings → InviteLinkDialog → getInviteLink/token → InvitePage → cookie/family/onboarding state against BSL-006/007/008; verify the auth-flow URL assertion, Settings fake clipboard assertions and source-supported limits before drafting. Retain A17/A22 and U08/U13/U14/U15/U16/U17/U18; no API/client/mock changes are called for.

## 2. Extract the bounded documentation

- [x] 2.1 Write proposal and only the household-identity ADDED delta; verify all six requirements/18 scenarios against the plan mapping, with generation/copy/share tied to BSL-006, validation/default handoff/absent context to BSL-007 and rejection/Welcome recovery to BSL-008. Reuse existing rules, exclude arbitrary redirect/eligibility/atomicity guarantees and preserve main spec content exactly.
- [x] 2.2 Write the extraction design and plan/checkpoint updates; review that they describe Next action versus API lookup boundaries, unsigned query fields, repeated unawaited write, existing state, copy-expiry mismatch, fixture substitutions and non-normative limitations without proposing repairs or later lifecycle actions.

## 3. Validate the integrated draft

- [x] 3.1 Run `openspec validate baseline-household-identity-member-invite-link --strict --no-interactive`; inspect all requirement/scenario mappings and the task-owned file set against the before-image, verifying the 12-requirement/31-scenario main spec, earlier active change, archive, unrelated edits/deletions and application sources are unchanged.

After the final documentation edits, run and inspect this complete bounded verification before presenting the draft:

```sh
task verify -- docs/openspec-baseline-plan.md openspec/changes/baseline-household-identity-member-invite-link/.openspec.yaml openspec/changes/baseline-household-identity-member-invite-link/proposal.md openspec/changes/baseline-household-identity-member-invite-link/specs/household-identity/spec.md openspec/changes/baseline-household-identity-member-invite-link/design.md openspec/changes/baseline-household-identity-member-invite-link/tasks.md
```

The final response and `.task/agent-finish/last-run.json` record actual final results/content identity. Later edits require fresh applicable checks. Static success does not establish runtime behavior or human acceptance.

## Workflow follow-up

- A23 drafting stopped at a validated draft. The user subsequently instructed “promote it” on 2026-10-15 (A24), directly authorizing the reviewed six additions/18 scenarios for main promotion. They are now promoted verbatim; main identity totals 18 requirements/49 scenarios. The invite delta is unchanged and this change remains active; archival requires separate authorization.
- Existing shared-access change stays active and promoted; prior existing-member-selection archive and the main spec's preceding 12 requirements/31 scenarios are preserved.
- Any future defect fix or runtime qualification requires separately selected scope; these extraction tasks do not authorize it.

Promotion verification for A24 uses the current three-path set:

```sh
task verify -- docs/openspec-baseline-plan.md openspec/specs/household-identity/spec.md openspec/changes/baseline-household-identity-member-invite-link/tasks.md
```

## Archive record — 2026-10-15

The user authorized archiving both promoted household-identity changes (A25). This completed documentation extraction is archived with all four artifacts and all five tasks complete. Its delta already matches the promoted main requirements exactly; main remains unchanged at 18 requirements/49 scenarios. Earlier drafting/promotion follow-up and verification commands above record their original lifecycle checkpoints and paths; this record supersedes pending-archive statements.

Metadata and the delta are preserved. External relative links were adjusted for the archive directory. Runtime qualification remains not-run; A17/A22 and all recorded evidence limits remain. Final archival documentation checks are recorded in the session response and harness last-run record. No application work or successor slice is authorized by archival.
