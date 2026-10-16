# Tasks

Documentation extraction only under A81. Checked tasks record delivered documentation and inspected source, not application implementation or passing behavioral tests. Requirement numbering below follows the complete durable-plan mapping; all scenario headers are mapped there.

## 1. Establish connection evidence

- [x] 1.1 Confirm root, capability absence and six main-spec header counts with `openspec context --json`, `openspec list --json`, `openspec list --specs --json` and header inspection; preserve the existing index/worktree and plan before-image. Acceptance: recorded A81 inventory and 216 prior source identities reconciled unchanged.
- [x] 1.2 Trace mount, URL/cookies, authentication, member check, registration, snapshot, framing and cleanup against source and actual assertions. Acceptance: BSL-household-live-updates-001/002 and U95–U97/U101 cover requirements 1–6,14–15; distinguish attempted/registered/emitted/received/applied.

## 2. Extract reconciliation and bounded specification

- [x] 2.1 Trace raw connected JSON through week/Today/planner stores and the immediate exclusion header/publisher boundary. Acceptance: BSL-household-live-updates-003/004, U98–U100 and requirements 7–14 map guards, offsets, deferral, missing date, grocery representation and stale identity without complete convergence claims.
- [x] 2.2 Produce proposal, extraction design and the household-live-updates ADDED delta; reconcile every requirement/scenario with implementation and inspected assertions. Acceptance: BSL-household-live-updates-005 contains 15 rows/38 scenarios and source digests; promoted owner specs and qualifications unchanged. Test-first implementation cycle, OpenAPI/client generation and new tests are not-applicable.

## 3. Validate integrated documentation and stop

- [x] 3.1 Run `openspec validate baseline-household-live-updates-connection-reconciliation --strict` and `openspec validate --all --strict`; reconcile counts, mapping, source identities, complete documentation diff and before-image preservation. Acceptance: selected/all strict pass and no unexplained nonselected/index changes.
- [x] 3.2 Run explicit-path `task verify` below after final documentation updates. Acceptance: applicable documentation/spec/content checks pass, final results reported separately as passed/failed/blocked/not-run/not-applicable; leave a validated draft for human review without promotion/archive/apply.

```sh
task verify -- docs/openspec-baseline-plan.md openspec/changes/baseline-household-live-updates-connection-reconciliation/.openspec.yaml openspec/changes/baseline-household-live-updates-connection-reconciliation/proposal.md openspec/changes/baseline-household-live-updates-connection-reconciliation/design.md openspec/changes/baseline-household-live-updates-connection-reconciliation/specs/household-live-updates/spec.md openspec/changes/baseline-household-live-updates-connection-reconciliation/tasks.md
```

Inspected, not executed: StreamControllerIntegrationTests (GET `/api/stream`, default auth-disabled InMemory factory), SseConnectionManagerTests/SseEventPublisherTests (MemoryStream/throwing stream), useScheduleStream.test.ts (substituted EventSource/store methods), weekStore.test.ts/todayStore.test.ts (fabricated store inputs), and home-recipe.spec.ts (finite intercepted stream and cookedReconnects route counter/DOM). Browser fixtures/mock owners: `pwa/e2e/fixtures.ts`, `pwa/e2e/mock-api.ts`, `pwa/e2e/home-recipe.spec.ts`. Operation/schema owner: `specs/openapi.yaml` `/api/stream`, ConnectedEvent/ScheduleDays. No application or API change is authorized; runtime/unit/API/browser/network/database/model checks are not-run, and contract/client synchronization, deployment and migrations are not-applicable. A34 stays deferred.

Verification record: selected strict and all-item strict validation passed (26/26); full documentation review, complete 15/38 mapping and before-image/index/source preservation passed. The first six-path documentation/spec/content verification passed. This checkbox update changes content identity; the final repeat and exact final identity belong to the response/current `.task/agent-finish/last-run.json`. No runtime evidence is claimed.

## Workflow follow-up

- Human review is next; draft validation is not acceptance. Promotion, archival, implementation and successor extraction are outside this authorization.

## Promotion follow-up — A82, 2026-10-15

The user subsequently instructed “promote”. The reviewed Purpose and exact 15 requirements/38 scenarios now form main household-live-updates (BSL-household-live-updates-006). The earlier A81 stopping boundary above is historical; A82 authorizes this documentation promotion only. Delta/proposal/design/metadata and all prior main specs remain unchanged; the source change remains active. Strict main/specs/all, exact equality, source/index/plan preservation and final three-path documentation verification outcomes belong to the response/current harness. Runtime qualification remains not-run under A34; no archive, application implementation or successor extraction.

```sh
task verify -- openspec/specs/household-live-updates/spec.md docs/openspec-baseline-plan.md openspec/changes/baseline-household-live-updates-connection-reconciliation/tasks.md
```
