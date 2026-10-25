# Prepared demo showcase loop

## Why

The demo should let an operator prepare a convincing household, capture it, let visitors experiment, and periodically return to that baseline without visitor-driven AI spend. Since the original demo, planner, grocery-extra, preference, history, search and recovery state have grown beyond the snapshot's coverage.

Related: #245. This is research and proposed behavior only, not implementation or deployment authorization.

## What Changes

- Treat recurring workflow reset as the intended product loop, not a defect.
- Make the prepared household usable on iPad, iPhone and Pixel Phone through ordinary browse, vote, explicit plan saving, groceries/extras and cooking. No mandatory tour or invented feature showcase.
- Use deterministic synthetic fixture identities/content and verified local media; disclose shared, periodically reset demo state and offer a self-hosting next step without interrupting household tasks.
- Separate operator baseline publication authority from shared visitor household access; visitors cannot overwrite the prepared baseline or enable AI preparation.
- Capture a versioned, complete prepared household baseline with explicit restore/clear/preserve/rebuild policies and verified assets.
- Restore plans, calendar, grocery state, preferences, categories and history as well as recipes and members; fence stale visitor work and refresh derived state without AI.
- Enforce zero outbound model requests throughout visitor mode, including direct image clients, embeddings, edits, maintenance and retries. Operator preparation may use AI only before visitor mode under explicit operator control.
- Reuse existing exact-recovery coordination, preflight and publication primitives where suitable, without importing their incompatible search-repair behavior.
- **BREAKING:** require a new complete demo snapshot format for the upgraded reset path; legacy core snapshots require recapture and must never be silently interpreted as a rich empty baseline.
- **BREAKING:** visitor AI-dependent actions return an honest demo alternative/unavailable outcome rather than attempt a provider request; active pre-reset work no longer survives to mutate the next visitor generation.
- Propose coherent application-calendar-week date re-anchoring, a fresh voting round and cleared import reports for review. These are not approved decisions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `demo-household`: complete prepared-state capture/reset, safe recurrence and visitor no-AI contract. Existing demo-specific rules qualify the shared search/indexing and workflow owners only in visitor mode; ordinary installations and exact/merge recovery retain their existing contracts.

- `data-backup-and-recovery`: qualify the existing demo missing-history cross-reference; ordinary merge and independent exact-recovery behavior are unchanged.

## Impact

Likely implementation owners: `ManagementService`, `RecoveryBoundary`, `RecoverySnapshotService`, demo workflow processors/seeding, provider composition, search/indexing, dreaming/maintenance, management diagnostics, and affected PWA consumers. No new general snapshot framework is proposed.

This branch changes only OpenSpec planning artifacts. It does not change application code, SQL, OpenAPI, generated clients, credentials, live configuration, workflow schedules or deployed state. Existing bounded documentation verification exceptions remain unchanged.

## Review boundaries

The accompanying design refreshes evidence at main `ba8dca21c83000d03ce03dbe51bd7542daa76b88` and retains the existing 19-table inventory. No new tables or demo/provider implementation changes were found since the original research baseline; newer voting, shared grocery checks and trust-first guidance change acceptance, not the inventory count. Reset/quiescence and partial-failure policy, date mapping, fixture votes/reports/privacy, maintenance/manual recurrence, schema compatibility and operator authority remain review choices. Requirements are proposed, not approved or implemented guarantees.

The first showcase slice is a small complete household crossing capture → visitor changes → workflow reset → ordinary reads, with provider-boundary tests forbidding AI egress. Missing-asset preflight and recoverable publication are prerequisites, not the demo experience itself. A narrow preflight or provider guard PR cannot establish the full zero-cost claim. This review excludes application implementation, spec application/sync/archive, Home handoff PR #339, voting docking PR #329, deployment redesign and live operations.
