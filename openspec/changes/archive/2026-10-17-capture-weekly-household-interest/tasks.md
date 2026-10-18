# Tasks

## 1. Qualify the implementation base

- [x] 1.1 Re-read current main and workspace guidance, resolve the approved planning home, and reconcile these draft contracts against the settled contracts in these changes. No new product approval is required for resolved choices.
- [x] 1.2 Run `openspec validate capture-weekly-household-interest --strict` and `task spec:check -- capture-weekly-household-interest --type change`; resolve actual schema/contract failures before implementation.

## 2. Atomic close and early votes

- [x] 2.1 Add failing contract/integration tests at the seams below before runtime edits; verify the intended failure.
- [x] 2.2 Implement the bounded slice, synchronize affected API/client/mock contracts, and pass its focused tests.

ScheduleController /api/schedule/voting/open and /api/schedule/lock; DiscoveryService vote POST; PostgreSQL history/round/vote transaction. Extend ScheduleServiceTests and a real-database close fixture for failure before commit, lost response plus early vote, same-member races, empty revote and stale prior close. Run `task test:api -- --filter FullyQualifiedName~ScheduleServiceTests` for focused behavior, plus the named real-database fixture; observe red then green. Synchronize specs/openapi.yaml, DTOs, generated client and pwa/e2e/mock-api.ts for round/conflict semantics; preserve Planner current-request recovery. Update Family Guide in this slice.


## 3. History lifecycle portability

- [x] 3.1 Add failing contract/integration tests at the seams below before runtime edits; verify the intended failure.
- [x] 3.2 Implement the bounded slice, synchronize affected API/client/mock contracts, and pass its focused tests.

ManagementService backup/restore/demo and permanent purge. Extend ManagementBackupIntegrationTests with explicit empty/absent history, corrupt/version mismatch, missing recipe, duplicate restore, old close token after restore and touched-zero non-resurrection. Run `task test:api -- --filter FullyQualifiedName~ManagementBackupIntegrationTests` against real persistence. Include demo capture/reset and recipe-purge acceptance; update backup/privacy docs with this slice.


## Final verification

- [x] 9.1 Review the complete changed runtime and contract paths; run `task verify -- <complete-reviewed-changed-paths>` and record the actual record_path. Validate live API/database behavior and changed UI interactions, not mocks alone.
- [x] 9.2 Update Family Guide and rollout/reversal documentation with tested behavior and known limitations. Record actual qualification separately from planning checks.

## Execution checkpoint

Implemented and independently reviewed in PR 281, implementation commit `ca7d7886d6ab27e1e0338ea3faef7938c4d533a2`, based on main after PR 270. Full implementation CI run 39079367014 passed, including production browser E2E, API/PostgreSQL, Docker Compose smoke and both CodeQL analyses. Local harness and focused live evidence, prerequisite skips and browser intermittency are recorded in the archived capture change's `evidence.md`. Canonical specs are synchronized at archive; no merge or deployment is authorized.
