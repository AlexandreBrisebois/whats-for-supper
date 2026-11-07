# Design

## Context and Existing Ownership

The proposal bounds this work to regression repair and verification tooling. Observed at `e504e820`:

| Owner | Observed behavior | Consequence |
| --- | --- | --- |
| `Taskfile.yml:test:e2e:ci`, `pwa/package.json:test:e2e:ci` | Build then test without setting CI mode | Playwright may run development output or reuse an existing server |
| `pwa/playwright.config.ts` | CI starts production, prohibits server reuse, uses four workers and one retry; BASE_URL bypasses server management | A runner's name alone establishes neither artifact identity nor runtime parity |
| `scripts/agent/test_ops.py:build_impact_plan` | Components map to filename prefixes | RecipeDetailSheet selects recipes.spec.ts; CooksMode selects planner-prefixed files, omitting relevant cross-feature cases |
| `scripts/agent/push_guard.py` and `Taskfile.yml:check:push:pwa` | Already select committed-range suites through scripts/ci/select-e2e.cjs and set production CI configuration | Reuse this path; do not invent another push framework |
| `.github/workflows/validate.yml` | Builds once, distributes output, runs capability suites on fresh hosted Ubuntu workers | Preserve matrix, reports and required-check names |
| `.pre-commit-config.yaml`, `Taskfile.yml:hooks:install` | Commit checks; push verification is explicitly manual | This work must not silently install an automatic pre-push gate |

The saved `.task/quiet-recipe-portions/final-browser-results.json` reports 956 passed and 60 skipped, including the currently failing cases. Its invocation used an external production Docker image and an isolated source copy, not this CI artifact. Missing test selection is therefore a demonstrated harness defect, not a proven sole cause of this run's failures. The latest saved grocery verification attempts also contain failed/not-run checks; they must not be presented as complete passes.

The reported failure families are:

- Eight final failures in `prepared-supper.spec.ts`: lost response, negative response, unavailable recovery read, frozen prepared-context journey, generic preparation, and three responsive rendered variants. Most final assertions see `cooks-mode-overlay` still mounted after completion.
- One final failure in `quiet-portions-layout.spec.ts`: original-ingredients keyboard focus/Enter operates on a detached menu item; both attempts fail, at different interaction steps.
- Two retry-pass cases: another prepared responsive variant and French partial-context geometry. The latter reads empty computed color values and ratio 1; it does not establish a real contrast violation.

Neither a scheduling race, an SSE defect, a production bundling defect nor stale test expectations has yet been established as the cause. The implementation begins with a bounded diagnostic experiment, not an assumed repair.

## Decisions and Tradeoffs

1. **One production browser execution owner.** Extract the shared E2E configuration/execution portion of `check:push:pwa` into a small owner under `scripts/ci/`, consumed by local CI-named entrypoints and the workflow. Retain separate build and run operations so CI can build once. Own the exact existing build flags, API origins, startup environment, suite validation and result reporting in that owner. Pin Node/npm/Playwright to repository versions; emit only an allowlist of non-secret configuration. Do not dump environment files or secrets.
2. **Keep fast feedback, fix its coverage.** Keep ordinary development E2E visibly distinct from production qualification. Reuse the existing capability selector/inventory for affected PWA inputs in the impact runner rather than maintaining component-name heuristics. Known test-only paths may retain direct-file selection where coverage is equivalent; shared/unknown PWA inputs keep the conservative full capability union. Preserve existing backend impact and documentation classification. Explicitly selected paths bound the change claim, not the dependency graph inside a selected component.
3. **Record two honest scopes.** Dirty-worktree feedback identifies selected source inputs; final push qualification identifies a clean commit and its comparison base. Reuse `check:push --plan` and clean-worktree validation. Do not auto-commit, stash or mix concurrent work into the candidate. Use a task-owned isolated checkout when needed. A rebuilt artifact must carry its candidate/source digest, configuration digest and build identity; copied external builds cannot inherit qualification through BASE_URL alone.
4. **Protect resources.** The production gate must start its own server, bypass inherited BASE_URL/test selectors, avoid cached E2E successes, and fail clearly on occupied ports without killing an unrelated service. Keep the current port-3000/cookie assumptions for initial parity; use an isolated runtime/network if 3000 is occupied. Configurable ports are not a prerequisite or an excuse to widen this repair. Preserve household/demo/beta supplementary suites.
5. **Repair only demonstrated causes.** First reproduce each failure family. Inspect traces and network/state sequences; add the smallest focused regression before changing application logic. Fix readiness/fixtures when they misrepresent the approved behavior; fix product code when it violates that behavior. Do not increase blanket timeouts, remove assertions, skip tests or accept retries as the fix.
6. **Separate local configuration parity from hosted platform qualification.** Native Mac checks can prove the selected source and shared execution settings. They cannot prove Ubuntu x64 behavior. The final hosted CI run is required on the final commit; if native results disagree, use an owned Linux production runtime to vary platform separately from configuration. Emulated build failure is a tooling blocker, not product evidence.

## First Observable Slice

Take the unchanged CI commit into a task-owned runtime. Build using the CI flags, start the resulting production artifact, and run `prepared-supper.spec.ts` filtered to the lost-reply scenario at four workers with retries disabled. Capture the preparation POST, authoritative projection reread, committed receipt, overlay/celebration state and close callback outcome. Compare with the saved local invocation configuration, varying one input only if needed to distinguish a cause.

This slice crosses local command → production build/start → real React/Kiota consumer → method-sensitive Playwright API boundary. The browser API remains mocked; it establishes browser integration, not PostgreSQL durability. Existing POST `/api/schedule/day/{date}/prepare` and GET `/api/recipes/{id}/ingredient-projection` contract shapes remain authoritative. Preserve occurrence, plan-token and serving-version guards. No provider or production household data is needed.

## State, Concurrency and Recovery

For lost replies/publication failure, inspect that one write occurs, confirmation reads the original committed receipt, and the UI closes only after confirmed success. For negative/unavailable outcomes, retain cooking work, prohibit blind write replay, and allow explicit review followed by a separate completion. Retain frozen prepared portions when household defaults change. Reuse `mock-api.ts` builders and state transitions; synchronize fixture routes for relative and configured absolute API origins without creating independent competing mock states.

For menu and geometry cases, inspect whether a projection refresh, responsive layout swap, menu closure or stale locator detaches the measured element. Assert enabled/connected state and the intended semantic transition at the exact interaction. Contrast checks must measure an attached rendered node with valid computed colors, and still fail for actual insufficient contrast. Keyboard Enter must perform the action once and return focus to the ingredients heading; adding a click fallback would conceal the regression.

## Operational Diagnosis

Retain one invocation-specific record with candidate commit/source digest, range/selected paths, suite inventory, production build/configuration identity, tool/browser/OS architecture, retry/worker settings and per-suite first-attempt/retry/skipped/failure outcomes. Connect CI artifacts to that record and the build consumed by every matrix job. Mark native-local and hosted results separately. Check source identity before/after verification; later source changes invalidate qualification.

Baseline and final diagnostics must retain failure screenshots, error contexts and traces. Explanations identify observation, hypothesis, discriminating experiment and confirmed cause. A test passing once, or after retry, is not evidence that the cause was repaired.

## Compatibility, Rollout and Reversal

Keep Task command entrypoints and workflow check names stable. Correct CI-named aliases to use the shared production owner. Keep ordinary `test:e2e` development behavior documented. No new dependency, API migration, database write, hook installation or deployment is required. Tooling changes can be reverted by their scoped diff; hosted rerun/push remains a separately authorized remote action.

## Risks and Deferrable Questions

- The concurrent cooked-portions change overlaps tests/consumer state. Reconcile its committed identity before final integration; do not edit or absorb it as part of this plan. It does not explain all reported failures by itself.
- True failure causes remain unconfirmed. Diagnostic tasks have explicit outputs before repair; a contract conflict or required backend change stops that dependent repair for scope reconciliation.
- Full-suite retry passes outside these reported families remain visible limitations. They prevent an unqualified claim of a clean first-attempt full pass; unrelated repairs require separate scope.
