# Active resume checkpoints

Load for resumption or active-state ambiguity via `task agent:status`. These
checkpoints are context, not authority. Follow the shared
[handoff procedure](.agents/core/execution-harness.md#evidence-and-meaningful-handoffs).


## Dietary separation Phase 1

Task/spec: User-pasted `WFS Dietary Separation Migration — Phase 1: EXPAND`; no repository spec package exists.
Worktree/branch: `harness-upgrade`; baseline recorded at HEAD `6a2d2eac` in ignored `.task/dietary-separation-phase1/baseline.txt`.
Authorized scope and source: Additive WFS-owned vegetarian classification only; preserve legacy health/dietary behavior and public API.
Current checkpoint: Added configurable server-owned ingredient policy, failure-preserving classification diagnostics, a quiet ingredient-only classifier, cursor-bounded persisted backfill/status workflows, description-regeneration recategorization, and an operator runbook. Search/backup additions remain from the preceding committed slice.
Verification evidence and content identity: `task agent:prepare` passed with escalated access (Kiota 1.35.0 generation, API/PWA format). `task test:api` passed 727/750 with 23 existing skipped PostgreSQL/manual tests. `task agent:finish` passed documentation/lint/PWA format/typecheck/PWA unit/review contracts and content identity `59d1d6f244166cc4c8eb738fed4ac3b96aef0e8c479037bbf0a28c379f7f5dfc`; its impact/API/live-endpoint/database checks are blocked by runner qualification and unavailable infrastructure. `git diff --check` passed.
Blocker or next action: Establish the intended Docker network/database and isolated runner for live migration evidence, then rerun the blocked finish checks. Trigger one intentional search reconciliation only after the catalogue backfill settles.

## Public Synology release

Task/spec: [.kiro/specs/01-public-synology-release](.kiro/specs/01-public-synology-release/tasks.md).
Worktree/branch: Current checkout `harness-upgrade`; original task branch not recorded.
Authorized scope and source: Prior checkpoint records owner-approved beta planning; no release execution selected by HM-E.
Current checkpoint: Review requirements/design/tasks/workstream map before implementation; current tasks say planned. First release target remains `0.1.0-beta.1`.
Verification evidence and content identity: HM-E verified the current spec path/status; it did not run release gates or certify physical NAS behavior. See [salvage evidence](docs/archive/specs/harness-modernization/hm-e-ledger.md).
Blocker or next action: Resume release planning when selected; publication remains subject to release gates and separate explicit authorization.
