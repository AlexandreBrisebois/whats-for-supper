# Tasks

## 1. Qualify the implementation base

- [x] 1.1 Re-read current main and workspace guidance, resolve the approved planning home, and reconcile these draft contracts against the settled contracts in these changes. No new product approval is required for resolved choices.
- [x] 1.2 Run `openspec validate reconcile-dreaming-recipe-rotation --strict` and `task spec:check -- reconcile-dreaming-recipe-rotation --type change`; resolve actual schema/contract failures before implementation.

## 2. Dreaming convergence and current-fact writes

- [x] 2.1 Add failing contract/integration tests at the seams below before runtime edits; verify the intended failure.
- [x] 2.2 Implement the bounded slice, synchronize affected API/client/mock contracts, and pass its focused tests.

Existing Dreaming workflow/processor → recipe persistence → Discovery and FillTheGap. Add real-database cases for stale manual writes, duplicate run, partial batch, changed cooked date and failed publication. Extend Dreaming workflow service tests and run `task test:api -- --filter FullyQualifiedName~Dreaming`; verify actual processor persistence separately from seed/dispatch tests. Update deployment env/cutoff and delayed-run explanation with this slice.


## 3. Explicit rotation controls and legacy migration

- [x] 3.1 Add failing contract/integration tests at the seams below before runtime edits; verify the intended failure.
- [x] 3.2 Implement the bounded slice, synchronize affected API/client/mock contracts, and pass its focused tests.

Recipe PATCH DTO/OpenAPI, generated client, detail and stack controls, pwa/e2e/mock-api.ts. Red/green tests cover temporary return then next pass, explicit persistent exclusion surviving expiry, unsuitable recipe bridge, conflicting payload and error rollback/focus. Use focused API/unit tests plus Playwright existing detail/Discovery paths. Validate live endpoint parity and migration/backup/demo roundtrip; update Family Guide and rollout/reversal instructions in this slice.


## 4. Current-plan Discovery eligibility

- [x] 4.1 Add failing contract/integration tests at the seams below before runtime edits; verify the intended failure.
- [x] 4.2 Implement the bounded slice, synchronize affected API/client/mock contracts, and pass its focused tests.

Exercise manual Quick Find and Search assignment before close → assignment commit → Discovery invalidation/read/category counts. Verify pending suggestions do not exclude, future-week-only assignments remain under the defined current-week scope, removed/replaced selection returns only if other guards allow, and stale queue responses do not restore selected cards. Preserve Search/Browse access and live votes. Use real assignment/Discovery API seams plus focused queue UI recovery tests; do not tie selection removal to the cooked timer. Use the settled immediate post-commit timing and deployment-calendar current week.


## Final verification

- [x] 9.1 Review the complete changed runtime and contract paths; run `task verify -- <complete-reviewed-changed-paths>` and record the actual record_path. Validate live API/database behavior and changed UI interactions, not mocks alone.
- [x] 9.2 Update Family Guide and rollout/reversal documentation with tested behavior and known limitations. Record actual qualification separately from planning checks.

## Execution checkpoint

Implemented and independently reviewed in PR 281, implementation commit `ca7d7886d6ab27e1e0338ea3faef7938c4d533a2`, based on main after PR 270. Full implementation CI run 39079367014 passed, including production browser E2E, API/PostgreSQL, Docker Compose smoke and both CodeQL analyses. Local harness and focused live evidence, prerequisite skips and browser intermittency are recorded in the archived capture change's `evidence.md`. Canonical specs are synchronized at archive; no merge or deployment is authorized.
