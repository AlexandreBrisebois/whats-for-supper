# Active resume checkpoints

Load for resumption or active-state ambiguity via `task agent:status`. These
checkpoints are context, not authority. Follow the shared
[handoff procedure](.agents/core/execution-harness.md#evidence-and-meaningful-handoffs).

## Public Synology release

Task/spec: [.kiro/specs/01-public-synology-release](.kiro/specs/01-public-synology-release/tasks.md).
Worktree/branch: Current checkout `harness-upgrade`; original task branch not recorded.
Authorized scope and source: Prior checkpoint records owner-approved beta planning; no release execution selected by HM-E.
Current checkpoint: Review requirements/design/tasks/workstream map before implementation; current tasks say planned. First release target remains `0.1.0-beta.1`.
Verification evidence and content identity: HM-E verified the current spec path/status; it did not run release gates or certify physical NAS behavior. See [salvage evidence](.kiro/specs/harness-modernization/hm-e-ledger.md).
Blocker or next action: Resume release planning when selected; publication remains subject to release gates and separate explicit authorization.

## .NET preview migration and generated-file reconciliation

Task/spec: [ADR 043](specs/decisions/043-dotnet-11-preview-migration.md); prior migration checkpoint, including generated client/lockfile review.
Worktree/branch: Current checkout `harness-upgrade`; original task branch not recorded.
Authorized scope and source: Prior checkpoint records migration validation; HM-E does not execute it or authorize commits.
Current checkpoint: SDK and API/test project pins inspected; dotnet-ef is Preview 7 while runtime projects remain Preview 6; prior checkpoint's claim of a dirty migration worktree is stale (HM-E started clean). Validation and generated/lockfile determinism remain unconfirmed.
Verification evidence and content identity: [HM-E ledger](.kiro/specs/harness-modernization/hm-e-ledger.md) records inspected sources; no new restore, vulnerability, API, application-suite or Docker-build pass is claimed.
Blocker or next action: When resumed, verify current identity, inspect ADR 043 gates and generated/lockfile determinism; diagnose migration-caused failures within scope. Deferred `home-goto.spec.ts` C7 reload test still skips; do not silently close it.

## Harness modernization — completed with qualification waiver

Task/spec: [HM-Q and HM-D/HM-E closure](.kiro/specs/harness-modernization/hm-q-validation.md).
Worktree/branch: `/Users/alex/Code/whats-for-supper`, `harness-upgrade`.
Authorized scope and source: User selected HM-Q plus HM-D/HM-E verification, then explicitly waived model-dependent qualification and instructed completion on 2026-09-11.
Current checkpoint: Structural migration accepted; qualification operator tooling delivered. Model runs, native loading and efficiency remain unmeasured and waived, not passed.
Verification evidence and content identity: HM-Q check/export records contain actual deterministic results and source identities; final assembled verification is in `.task/agent-finish/last-run.json`.
Blocker or next action: None under the accepted scope. Future model benchmarking is optional newly selected work. No commit, push, deployment or application behavior change performed.
