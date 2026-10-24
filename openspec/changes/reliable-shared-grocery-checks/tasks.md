# Tasks

This is a specification-only draft. The following is a future implementation plan, not implementation authorization. No behavior check has run in this planning pass.

## 1. Distinct household checks survive overlapping requests

**Outcome and scenarios:** Grocery shopping / Persist a sequential single-key check update / Two members check different items; Process normal check-map writes against current persisted state.
**Owners and boundaries:** ScheduleController item PATCH, ScheduleService, shared grocery coordination, PostgreSQL weekly-plan map and grocery publication; existing UI/client request shape.
**Dependencies and prerequisites:** An explicit implementation request; confirmed single host; disposable PostgreSQL and separate DI scopes. No overnight maintenance work.
**Acceptance boundary:** Real controller/service/database path with controlled barriers; publisher substitutions may isolate delivery, not replace persistence.

- [ ] 1.1 Add a controlled PostgreSQL regression suite `GroceryCheckConcurrencyPostgresTests` exercising two actual item PATCH requests from separate scopes; run `task test:database -- --filter FullyQualifiedName~GroceryCheckConcurrencyPostgresTests` before production edits and record the intended lost-update red plus fresh-third-scope result. If it already passes, document the interleaving and reassess the hypothesis rather than manufacturing failure.
- [ ] 1.2 Inventory normal check-map writes, scoped tracking and caller transaction/lock relationships; record the gate owner, non-reentrant call structure and stale-tracked-entity safeguard in this design before implementation. Acceptance: each of item, full-map and recompute paths has exactly one acquisition and no fresh-scope read depends on caller-uncommitted state.
- [ ] 1.3 Reconcile the item/full-map behavioral descriptions in `specs/openapi.yaml` to this approved single-instance policy, run `task gen:client`, then implement the smallest shared gate/fresh-state slice. Update affected Kiota consumers and method-sensitive `pwa/e2e/mock-api.ts` item/full-map PATCH handlers, builders and persistent mock check maps in the same slice. Run the concurrency suite green, `task gen:client:check`, `task agent:drift:endpoints` against a live test API, and `task test:e2e -- grocery.spec.ts`; retain real persisted reread evidence, not merely mock success.

## 2. Replacement, recomputation and failures preserve the contract

**Outcome and scenarios:** Same-key intended-state requests; replacement/clear ordering; Preserve current checks during overlapping recomputation; Acknowledge check mutations only after persistence.
**Owners and boundaries:** The same gate and request paths, GroceryRecomputeService predecessor rules, fresh database scope and existing publication seam.
**Dependencies and prerequisites:** Slice 1 green; PostgreSQL fixtures with prior grocery lines and a pretracked WeeklyPlan.
**Acceptance boundary:** Actual relational writes and controlled interleavings, including a recomputation whose original request scope already tracked stale state.

- [ ] 2.1 Add and observe red/appropriate preservation baselines for same-key true/false in controlled processing order, repeated intended true, stale full-map replacement, empty clear before/after item update, and check-versus-recompute including pretracked entity and predecessor merge/rename. Run `task test:database -- --filter FullyQualifiedName~GroceryCheckConcurrencyPostgresTests`; preserve existing replacement and normalization expectations rather than inventing stale-body merging.
- [ ] 2.2 Route all remaining normal map writers through the reviewed owner without recursive acquisition or singleton DbContext; run the above suite green and `task test:api -- --filter 'FullyQualifiedName~ScheduleServiceTests|FullyQualifiedName~GroceryRecomputeServiceTests|FullyQualifiedName~GroceryItemsIntegrationTests'`. Verify unrelated map entries, grocery lines, other weeks and extra occurrence/version behavior remain unchanged; record any necessary caller integration edits within scope.
- [ ] 2.3 Add controlled cancellation-before-acquisition, cancellation-after-acquisition, pre-commit save failure and post-commit publisher failure tests; run the concurrency suite and relevant API tests. Acceptance: no false saved success before commit, committed state remains recoverable after notification failure, every acquired gate is released, and a subsequent request completes. Add a restart/response-loss relational recovery check that distinguishes committed state from uncommitted pending work; record exact setup/results and no durable-queue claim.

## 3. Ordered publication and two-tab recovery

**Outcome and scenarios:** Household live updates / Order coordinated grocery publication attempts with committed mutations, including the explicit independent-snapshot boundary.
**Owners and boundaries:** IScheduleEventPublisher and existing grocery_updated event; useScheduleStream, plannerStore, weekStore, GroceryList; no new protocol fields.
**Dependencies and prerequisites:** Slices 1–2 green; real API/PostgreSQL and two isolated browser contexts, plus existing mocked Playwright infrastructure.
**Acceptance boundary:** Real mutation and read seam plus actual browser event reception; mock tests separately qualify controlled delivery/failure cases.

- [ ] 3.1 Add tests that pause A's publication while B waits and assert B cannot publish first; include changed-state recompute and failing A publication. Run `task test:api -- --filter 'FullyQualifiedName~GroceryCheckConcurrency|FullyQualifiedName~GroceryRecomputeServiceTests'` and the PostgreSQL concurrency suite; record ordered attempts, commit-before-publication and eventual gate release.
- [ ] 3.2 Extend `pwa/e2e/grocery.spec.ts` and affected hook/store tests for distinct-key updates, explicit false/clear, failure and pending interaction with schema-valid method-sensitive mocks. Run `task test:unit -- src/components/planner/GroceryList.test.tsx src/hooks/useScheduleStream.grocery.test.ts src/store/weekStore.test.ts` and `task test:e2e -- grocery.spec.ts`; preserve accessibility and week guards.
- [ ] 3.3 Run and document a two-browser-context scenario against the real test API/PostgreSQL: overlap checks, await settled ordered events, compare both tabs and a fresh database-backed read. Delay/reorder an independent older snapshot to expose the stated protocol limit, then settle outstanding responses and reread to verify recovery. Record URL/runtime identity, observed order and persisted map; mocked Playwright alone cannot complete this task. Do not silently add revision tokens or claim universal stale-response immunity.

## 4. Final Integration and Verification

- [ ] 4.1 Reconcile every scenario with actual red/green, preservation and real-seam evidence. Run `task test:database`, `task spec:check -- reliable-shared-grocery-checks --type change` and final full `task spec:check`. Review complete owned diffs and generated output, run applicable `task prepare -- <complete-reviewed-changed-paths>` followed by `task verify -- <complete-reviewed-changed-paths>`; record the invocation's record_path and passed/failed/blocked/not-run statuses. Missing required real database/browser acceptance prevents implementation completion.

## Planning validation status

GitHub source/spec inspection completed against main `3d1bd68ea0965bb6df2c3689dd8f4aed1c6e598e`. Local OpenSpec CLI and task harness were not run in this connector-only planning pass. CI uses `openspec validate --all --strict --no-interactive`; report its actual result separately. Runtime TDD is not applicable to the present documentation-only diff, and no implementation task is marked complete.

