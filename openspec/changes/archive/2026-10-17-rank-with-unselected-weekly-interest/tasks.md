# Tasks

## 1. Qualify the implementation base

- [x] 1.1 Re-read current main and workspace guidance, resolve the approved planning home, and reconcile these draft contracts against the settled contracts in these changes. No new product approval is required for resolved choices.
- [x] 1.2 Run `openspec validate rank-with-unselected-weekly-interest --strict` and `task spec:check -- rank-with-unselected-weekly-interest --type change`; resolve actual schema/contract failures before implementation.

## 2. Preferred Quick Find and safe escape

- [x] 2.1 Add failing contract/integration tests at the seams below before runtime edits; verify the intended failure.
- [x] 2.2 Implement the bounded slice, synchronize affected API/client/mock contracts, and pass its focused tests.

ScheduleService.FillTheGapAsync → GET /api/schedule/fill-the-gap → generated planner wrapper → QuickFindModal. Extend ScheduleServiceTests and QuickFindModal.test.tsx for 0/2/6 live-liked and historical recipes, early votes before open, live-over-history precedence, overlapping pools, unavailable/cooldown exclusions, temporary return, five-slot cap and empty Search target preservation. Focus commands: `task test:api -- --filter FullyQualifiedName~ScheduleServiceTests`; `task test:unit -- src/components/planner/QuickFindModal.test.tsx`. Add focused Playwright replacement/empty-escape scenarios using method-sensitive pwa/e2e/mock-api.ts; live endpoint parity checks remain required. Update help with this slice.


## 3. Discovery and Search historical ties

- [x] 3.1 Add failing contract/integration tests at the seams below before runtime edits; verify the intended failure.
- [x] 3.2 Implement the bounded slice, synchronize affected API/client/mock contracts, and pass its focused tests.

DiscoveryService and RecipeSearchService plus real historical rows and materialized affinity. Verify live counts/ratings/consensus unchanged, typed relevance stronger than H, Similar unchanged, current/open week exclusion, timezone boundaries, no-history and stale-affinity handling. Run focused API tests selected from existing Discovery/Search suites and add named real-database scenarios before implementation. Include generated client/mock synchronization if response generations change. Update guide in this slice.


## 4. Both paged Browse paths

- [x] 4.1 Add failing contract/integration tests at the seams below before runtime edits; verify the intended failure.
- [x] 4.2 Implement the bounded slice, synchronize affected API/client/mock contracts, and pass its focused tests.

RecipeService Explore list/stack and RecipeSearchService blank Browse continuation. Exercise next/previous/retry through main merged PR243 client recovery with history/config/window changes; pin or explicit restart, no page-local ranking. Add API continuation tests and Playwright mounted Search/Explore navigation scenarios. Include offset generation DTO, generated client and pwa/e2e/mock-api.ts behavior together; verify full Search remains accessible for cooled/manual-off recipes. Update affected help in this slice.


## Final verification

- [x] 9.1 Review the complete changed runtime and contract paths; run `task verify -- <complete-reviewed-changed-paths>` and record the actual record_path. Validate live API/database behavior and changed UI interactions, not mocks alone.
- [x] 9.2 Update Family Guide and rollout/reversal documentation with tested behavior and known limitations. Record actual qualification separately from planning checks.

## Execution checkpoint

Implemented and independently reviewed in PR 281, implementation commit `ca7d7886d6ab27e1e0338ea3faef7938c4d533a2`, based on main after PR 270. Full implementation CI run 39079367014 passed, including production browser E2E, API/PostgreSQL, Docker Compose smoke and both CodeQL analyses. Local harness and focused live evidence, prerequisite skips and browser intermittency are recorded in the archived capture change's `evidence.md`. Canonical specs are synchronized at archive; no merge or deployment is authorized.
