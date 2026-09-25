# Active resume checkpoints

Load for resumption or active-state ambiguity via `task agent:status`. These
checkpoints are context, not authority. Follow the shared
[handoff procedure](.agents/core/execution-harness.md#evidence-and-meaningful-handoffs).


## Dietary separation Phase 1

Task/spec: User-pasted `WFS Dietary Separation Migration — Phase 1: EXPAND`; no repository spec package exists.
Worktree/branch: `harness-upgrade`; baseline recorded at HEAD `6a2d2eac` in ignored `.task/dietary-separation-phase1/baseline.txt`.
Authorized scope and source: Additive WFS-owned vegetarian classification only; preserve legacy health/dietary behavior and public API.
Current checkpoint: Added nullable version/timestamp metadata, ingredient-bearing categorization response, confirmed-only search projection, and backup/restore round trip. Backfill/observability and exhaustive required workflow/test coverage are not implemented.
Verification evidence and content identity: Focused search/categorization tests (7) and backup tests (6) passed. `task agent:prepare` blocked at Kiota 1.35.0 20-second timeout; it made no generated-file changes. `git diff --check` passed.
Blocker or next action: Implement an explicit, side-effect-isolated, resumable backfill plus migration observability; add the requested failure/ingredient matrix and full workflow/Find Similar coverage. Then resolve the formal Kiota gate and run final completion.

## Public Synology release

Task/spec: [.kiro/specs/01-public-synology-release](.kiro/specs/01-public-synology-release/tasks.md).
Worktree/branch: Current checkout `harness-upgrade`; original task branch not recorded.
Authorized scope and source: Prior checkpoint records owner-approved beta planning; no release execution selected by HM-E.
Current checkpoint: Review requirements/design/tasks/workstream map before implementation; current tasks say planned. First release target remains `0.1.0-beta.1`.
Verification evidence and content identity: HM-E verified the current spec path/status; it did not run release gates or certify physical NAS behavior. See [salvage evidence](docs/archive/specs/harness-modernization/hm-e-ledger.md).
Blocker or next action: Resume release planning when selected; publication remains subject to release gates and separate explicit authorization.
