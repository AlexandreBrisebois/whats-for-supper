# Tasks: Dev Loop Optimization & Digital Twin Testing

## Phase 1: Security & Targeted Verification (Completed)
- [x] Fix `scripts/agent/test_ops.py` paths and mapping logic
- [x] Implement Global API Blocker in `pwa/e2e/fixtures.ts`
- [x] Audit `pwa/e2e/mock-api.ts` to remove `route.continue()`
- [x] Fix brittle E2E assertions (hover variants) in `home-goto.spec.ts`

## Phase 2: Execution Acceleration (Completed)
- [x] Update `pwa/playwright.config.ts` for parallel workers (`fullyParallel: true`)
- [x] Update `Taskfile.yml` to replace sequential E2E calls with native Playwright scheduling
- [x] Simplify `pwa/package.json` test scripts

## Phase 3: Developer Experience (Completed)
- [x] Introduce `task gate` for high-speed local validation
- [x] Implement `dev:kill` and `test:kill` automation in `gate` and `review`
- [x] Implement Task-Level Parallelization (run lint/typecheck/test in parallel)
- [x] Update `testing` skill and `execution-harness.md` documentation

## Phase 4: Digital Twin Testing Utilities (Pending)
- [ ] Implement `delayResponse(route, ms)` helper in `mock-api.ts`
- [ ] Implement `workerIndex` isolation in `fixtures.ts`
    - Inject `x-family-member-id` cookie based on `workerIndex` to ensure store isolation
- [ ] Implement `assertStoreState(page, storeName, expectedState)` helper
    - Use `page.evaluate` to access Zustand stores via `window.__STORES__` or similar exposure
- [ ] Add regression tests verifying the 10s optimistic write window in `todayStore`

## Phase 5: Verification
- [ ] Run `task review` to confirm all parallel tests pass with the new helpers
- [ ] Verify zero drift via `task agent:drift`
