# Active resume checkpoints

Load for resumption or active-state ambiguity via `task agent:status`. These
checkpoints are context, not authority. Follow the shared
[handoff procedure](.agents/core/execution-harness.md#evidence-and-meaningful-handoffs).


## Dietary separation Phase 1

Task/spec: User-directed simplification of the user-pasted `WFS Dietary Separation Migration — Phase 1: EXPAND`; no repository spec package exists.
Worktree/branch: `harness-upgrade`; baseline recorded at HEAD `8bf3503d4a0db028ead78d6c3da73540f77e2130` in ignored `.task/dietary-lifecycle-removal/baseline.md`.
Authorized scope and source: Remove vegetarian-classification lifecycle fields in favor of nullable `recipes.is_vegetarian`, while preserving confirmed data and the public boolean response.
Current checkpoint: Implemented nullable storage, one-time legacy-data conversion guarded by a schema-column comment, removed version/timestamp/failure persistence and writer service, simplified backfill/status/search/backup paths, and updated workflow/docs/tests. Unknown remains internal and maps to `false` at the API boundary.
Verification evidence and content identity: `dotnet build api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --no-restore` passed with zero warnings; `git diff --check` passed; `task agent:reconcile` passed static route/mock reconciliation. `task agent:drift` static schema checks passed but live endpoint parity is blocked. `task agent:prepare` and `task review` are blocked by Kiota generation/check timing out in the restricted runner; focused `dotnet test` is blocked by test-host local socket permission; `task db:schema:push DRY_RUN=true` is blocked by Docker socket permission.
Blocker or next action: On a qualified local runner, complete Kiota generation/check, API tests, and standard database migration verification before running the single `task agent:finish` completion invocation. Review the schema comment guard after observing the sqldef dry-run.

## Public Synology release

Task/spec: [.kiro/specs/01-public-synology-release](.kiro/specs/01-public-synology-release/tasks.md).
Worktree/branch: Current checkout `harness-upgrade`; original task branch not recorded.
Authorized scope and source: Prior checkpoint records owner-approved beta planning; no release execution selected by HM-E.
Current checkpoint: Review requirements/design/tasks/workstream map before implementation; current tasks say planned. First release target remains `0.1.0-beta.1`.
Verification evidence and content identity: HM-E verified the current spec path/status; it did not run release gates or certify physical NAS behavior. See [salvage evidence](docs/archive/specs/harness-modernization/hm-e-ledger.md).
Blocker or next action: Resume release planning when selected; publication remains subject to release gates and separate explicit authorization.
