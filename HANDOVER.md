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

## HM-E — harness modernization

Task/spec: [HM-E](.kiro/specs/harness-modernization/tasks.md#hm-e--memory-and-specialist-cleanup).
Worktree/branch: `/Users/alex/Code/whats-for-supper`, `harness-upgrade`.
Authorized scope and source: User selected HM-E only; no HM-Q, adoption, commit, push, deploy or application behavior changes.
Current checkpoint: Memory salvage, specialist/caller cleanup and summary/status implementation recorded in [HM-E evidence](.kiro/specs/harness-modernization/hm-e-validation.md).
Verification evidence and content identity: See HM-E evidence and content records; automated checks do not qualify candidate/native loading. HM-D remains implemented-verification-blocked with its checkbox open.
Blocker or next action: Fresh/resumed native loading and F07 candidate runs need the protocol-compliant pinned runner. Acceptance remains open; stop at HM-E.
