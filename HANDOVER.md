# Active resume checkpoints

Load for resumption or active-state ambiguity via `task agent:status`. These
checkpoints are context, not authority. Follow the shared
[handoff procedure](.agents/core/execution-harness.md#evidence-and-meaningful-handoffs).

## Public Synology release

Task/spec: [.kiro/specs/01-public-synology-release](.kiro/specs/01-public-synology-release/tasks.md).
Worktree/branch: Current checkout `harness-upgrade`; original task branch not recorded.
Authorized scope and source: Prior checkpoint records owner-approved beta planning; no release execution selected by HM-E.
Current checkpoint: Review requirements/design/tasks/workstream map before implementation; current tasks say planned. First release target remains `0.1.0-beta.1`.
Verification evidence and content identity: HM-E verified the current spec path/status; it did not run release gates or certify physical NAS behavior. See [salvage evidence](docs/archive/specs/harness-modernization/hm-e-ledger.md).
Blocker or next action: Resume release planning when selected; publication remains subject to release gates and separate explicit authorization.

## .NET preview migration and generated-file reconciliation

Task/spec: [ADR 043](docs/archive/adr/043-dotnet-11-preview-migration.md); prior migration checkpoint, including generated client/lockfile review.
Worktree/branch: Current checkout `harness-upgrade`; original task branch not recorded.
Authorized scope and source: Prior checkpoint records migration validation; HM-E does not execute it or authorize commits.
Current checkpoint: SDK and API/test project pins inspected; dotnet-ef is Preview 7 while runtime projects remain Preview 6; prior checkpoint's claim of a dirty migration worktree is stale (HM-E started clean). Validation and generated/lockfile determinism remain unconfirmed.
Verification evidence and content identity: [HM-E ledger](docs/archive/specs/harness-modernization/hm-e-ledger.md) records inspected sources; no new restore, vulnerability, API, application-suite or Docker-build pass is claimed.
Blocker or next action: When resumed, verify current identity, inspect ADR 043 gates and generated/lockfile determinism; diagnose migration-caused failures within scope. Deferred `home-goto.spec.ts` C7 reload test still skips; do not silently close it.

## Harness modernization — completed with qualification waiver

Task/spec: [HM-Q and HM-D/HM-E closure](docs/archive/specs/harness-modernization/hm-q-validation.md).
Worktree/branch: `/Users/alex/Code/whats-for-supper`, `harness-upgrade`.
Authorized scope and source: User selected HM-Q plus HM-D/HM-E verification, then explicitly waived model-dependent qualification and instructed completion on 2026-09-11.
Current checkpoint: Structural migration accepted; qualification operator tooling delivered. Model runs, native loading and efficiency remain unmeasured and waived, not passed.
Verification evidence and content identity: HM-Q check/export records contain actual deterministic results and source identities; final assembled verification is in `.task/agent-finish/last-run.json`.
Blocker or next action: None under the accepted scope. Future model benchmarking is optional newly selected work. No commit, push, deployment or application behavior change performed.

## Filters SFD-1 — reconciliation and red tests

Task/spec: [filters SFD-1](.kiro/specs/filters/tasks.md).
Worktree/branch: `main`, starting HEAD `31e5d4a718ab78575eaa72451545c12d1a0a2f59`.
Authorized scope and source: User selected SFD-1 only; trace and missing-feature integration tests, no production changes, Discovery changes, commit or deployment.
Current checkpoint: `search-fix` is already an ancestor with identical search code. Cuisine/Meal predicates and concept serving are missing; preference fingerprinting already works.
Verification evidence and content identity: [SFD-1 evidence](.kiro/specs/filters/sfd-1-evidence.md); focused PostgreSQL/HTTP run has 35 passed and 18 expected red feature assertions, no skips. Starting content snapshot `/tmp/wfs-sfd1-baseline`.
Blocker or next action: Stop after SFD-1. SFD-2 ready for contract/config definition when selected; SFD-5 owns production fixes. See evidence for broad gate limitations.

## Filters SFD-2 — contract/configuration approval checkpoint

Task/spec: [filters SFD-2](.kiro/specs/filters/tasks.md).
Worktree/branch: `main`, starting HEAD `31e5d4a718ab78575eaa72451545c12d1a0a2f59`; pre-existing work is snapshotted at `/private/tmp/wfs-sfd2-baseline-20260919`.
Authorized scope and source: User selected SFD-2 only, including OpenAPI, DTO/options, configuration defaults/binding, and focused contract/configuration tests. No endpoint/materializer/ranking/UI/client regeneration, commit, or deployment.
Current checkpoint: The proposed response, fallback, Main validation, fixed Meal Types, and Search-only 28-day rediscovery policy are approved; see [SFD-2 proposal](.kiro/specs/filters/sfd-2-proposal.md). No dependent task is selected.
Verification evidence and content identity: [SFD-2 evidence](.kiro/specs/filters/sfd-2-evidence.md): 8 focused API configuration tests and 2 contract tests passed; YAML parse and whitespace checks passed. Generated-client checks are intentionally deferred pending contract approval.
Blocker or next action: Select the next dependent task explicitly before SFD-3/SFD-4/SFD-5b or `task gen:client`.

## Filters SFD-5 — search semantics

Task/spec: [filters SFD-5](.kiro/specs/filters/tasks.md).
Worktree/branch: `main`, starting HEAD `31e5d4a718ab78575eaa72451545c12d1a0a2f59`; full starting dirty-state snapshot `/private/tmp/sfd5-baseline-20260919T215023`.
Authorized scope and source: SFD-5 only, using SFD-1 reconciliation and approved SFD-2 contract; no Discovery work, later SFD slice, commit, or deployment.
Current checkpoint: Cuisine/Meal Type predicates now constrain EF and PostgreSQL lexical/vector candidates before limits. Main concepts feed semantic text only; concept-only fallback and zero-match behavior are implemented without changing caller query.
Verification evidence and content identity: [SFD-5 evidence](.kiro/specs/filters/sfd-5-evidence.md). Focused real PostgreSQL suite: 21 passed, 0 failed, 0 skipped after implementation and preparation. Reconciliation, Kiota preparation, lint, PWA formatting/typecheck/unit checks passed. `task agent:finish` content guard invalidated the broad record despite no observed post-run source delta.
Blocker or next action: Stop after SFD-5. Do not infer full-harness, live endpoint, E2E, or live semantic-provider qualification; select SFD-5a or another task explicitly before further changes.

## Filters SFD-7 — contract sync and regression verification

Task/spec: [filters SFD-7](.kiro/specs/filters/tasks.md).
Worktree/branch: `main`, SFD-7 baseline is `/private/tmp/wfs-sfd7-baseline-20260920T000000` at HEAD `31e5d4a718ab78575eaa72451545c12d1a0a2f59`.
Authorized scope and source: User selected SFD-7 after preceding filters tasks; contract/client/mock verification and in-scope integration defects only. No commit or deployment.
Current checkpoint: Required OpenAPI requiredness, mock vocabulary, and Search-only deferred refresh corrections are made. Discovery source is unchanged.
Verification evidence and content identity: [SFD-7 evidence](.kiro/specs/filters/sfd-7-evidence.md) records passing preparation, static reconciliation, API/PWA suites, 55 real PostgreSQL tests and 22 current-worktree E2E tests. Live endpoint parity and live browse-performance qualification remain blocked.
Blocker or next action: Run production-equivalent API/browser performance measurements against the final source and representative dataset; do not represent static/mocked evidence as live qualification.

## Search Surprise Me — promotion eligibility upgrade

Task/spec: [filters SFD-5b / SFD-6](.kiro/specs/filters/tasks.md); Search Surprise Me control upgrade.
Worktree/branch: `main`, starting HEAD `d4774657a816ac285985b7bc8d7514a29fb03556`.
Authorized scope and source: User instructed verification and completion of the Search page "Surprise Me" control upgrade to respect server-vetted promotion eligibility (`isPromotionEligible`), preserve search/filter context, ensure deterministic testing and accessibility, and avoid promoting blocked or stale candidates.
Current checkpoint: "Surprise Me" rotates only server-vetted, promotion-eligible candidates (`isPromotionEligible && !importIssueStatus && id !== currentData.topPick?.id`) in-memory, preserving query, active filters, Focus concepts, and planning context. Button is disabled with accessible description when no eligible alternate exists. Guarded by Search promotion version and generation against stale SSE/schedule states. Discovery mode remains unchanged.
Verification evidence and content identity: 52 PWA unit tests passed (`src/app/(app)/recipes/page.test.tsx`); 13 Playwright E2E tests passed (`e2e/recipes.spec.ts`), including Surprise Me alternate promotion; 32 API integration tests passed (`RecipeSearchIntegrationTests`); PWA typecheck and lint passed; whitespace diff checks clean.
Blocker or next action: Clean worktree ready for push/deployment review; live NAS/endpoint performance measurements remain separate standing items.
