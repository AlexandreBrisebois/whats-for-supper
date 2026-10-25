# Tasks

This is a research/specification-only proposal. No implementation is authorized by these tasks. Resolve the policy choices below with Alex before generating dependent implementation tasks; neither merged PR #332 nor planning-complete CLI status is implementation approval. Proposed requirement language is not approval. This review stops at the design gate; no apply, sync, archive, merge or deployment.

## 1. Resolve consequential behavior choices

**Outcome and scenarios:** Accept or amend the proposed reset/quiescence, partial-failure, fresh-round/fixture, calendar, maintenance/manual recurrence, compatibility and operator requirements.
**Owners and boundaries:** Existing demo-household capability and application-time, recovery, search and workflow owners.
**Dependencies and prerequisites:** Review proposal.md, the complete inventory in design.md and specs/demo-household/spec.md against issue #245.
**Acceptance boundary:** Written review decisions and reconciled planning artifacts; no runtime changes.

- [ ] 1.1 Record the accepted date/clock policy and field-level rebasing versus audit-time classification, including soft-delete retention; reconcile all date scenarios and inventory rows.
- [ ] 1.2 Record whether prepared votes and import reports are included or cleared; approve deterministic synthetic fixture/privacy rules and round/report normalization. Verify the fixture can converge under ordinary thresholds and matches remain distinct from saved meals, without replayable authority or a mandatory tour.
- [ ] 1.3 Record the safe-maintenance allowlist and stale-work fencing owner, including dreaming, search reconciliation and maintenance commands; demonstrate that each allowed path is model-free by source review.
- [ ] 1.4 Accept or amend legacy recapture policy and baseline authority separation and the concrete operator-authority mechanism; reconcile format, management diagnostics and compatibility scenarios.
- [ ] 1.5 Accept or amend complete declared household reset, preserved operator-owned state, bounded quiescence and partial-failure recovery. Record how demo coordination becomes active despite conditional RecoveryBoundary enablement; verify the inventory includes checks/recompute and all stale publication paths.
- [ ] 1.6 Decide manual reset one-shot versus recurrence outside demo mode. If the proposed one-shot choice is accepted, reconcile the complete canonical restore-acceptance requirement, workflow lifecycle, contract behavior and regression acceptance before generating dependent tasks.

## 2. Prepare the accepted implementation plan

**Outcome and scenarios:** A bounded implementable plan only after group 1 decisions are resolved.
**Owners and boundaries:** Existing management workflow, demo/recovery, search/provider boundaries and PWA consumers; no general framework.
**Dependencies and prerequisites:** All consequential decisions in group 1 accepted; current source rechecked if main moved.
**Acceptance boundary:** Reviewed tasks with named checks, not implementation or runtime qualification.

- [ ] 2.1 Expand the first showcase slice from design.md into red/green/refactor tasks: proposed DemoShowcaseLoopTests exercise actual management workflow acceptance, PostgreSQL, assets and ordinary reads; proposed pwa/e2e/demo-showcase.spec.ts exercises browse/vote/matches/explicit-save/groceries/cook and reset. Name exact filters when those tests are authorized. Small content still declares every state owner's disposition; asset preflight alone is a prerequisite, not a showcase result.
- [ ] 2.2 Add dependency-ordered acceptance for every state owner, stale-work/client generation, provider matrix and failure-safe recurrence. Require absent/empty/corrupt assets, interrupted capture/publication, incompatible schema/embeddings, active worker and grocery-check/recompute races, missed SSE, stale extra versions and voting close, retries/restart, fake-clock week/DST/year cases and preserved operator data. Never infer zero AI from one happy-path test.
- [ ] 2.3 Identify exact affected OpenAPI routes/status shapes, generated Kiota client consumers and method-sensitive pwa/e2e/mock-api.ts handlers/builders/state transitions; require contract-first synchronization and task gen:client:check in each affected slice.
- [ ] 2.4 Include non-demo, ordinary merge/exact recovery, authorization and artwork preservation checks, and operator preparation/capture/activation documentation in their owning slices. Trace chat/stream/agents, embedding HTTP and direct hero SDK transports with failing outbound traps and dummy credentials; all fixtures and test activity must remain synthetic, disposable and isolated, without live AI or telemetry.
- [ ] 2.5 Define device and bilingual acceptance for entry disclosure, honest AI-unavailable recovery, interrupted tasks and mounted-client reset on iPad, iPhone and Pixel Phone. Verify touch targets/safe areas, readable English/French copy, keyboard/focus/status feedback and a secondary self-hosting path using existing patterns; report physical-device checks separately from emulation and leave #339/#329 ownership untouched.

## 3. Planning verification

- [x] 3.1 Reconcile full modified requirement blocks with canonical demo-household ownership; verify complete table/non-database inventory, no contradictory new policy, and clearly labelled unapproved choices.
- [x] 3.2 Run task spec:check -- prepared-demo-showcase-loop --type change and task verify with the complete reviewed planning-file set in a supported repository environment; record actual result and record_path. Retain earlier verification only as evidence of its original identity.
- [ ] 3.3 Review the final planning-only diff and strict CI at its exact head. Record pass/fail/blocked/not-run separately; no runtime, provider, database or browser acceptance is claimed for this PR.

## Current evidence

Original research was pinned to main e76332c9e35c3d8584cbed6476ea9c43b4d40ea7. This design review uses connector main ba8dca21c83000d03ce03dbe51bd7542daa76b88 and clean local starting work at 86faaadd11e35bc52f529c5bbe5e9891d0b1771b; the connector comparison proves inspected demo/schema/provider sources and selected artifacts are unchanged. Current designer/identity/North Star/Everyday Household and Discovery changes were read separately through the connector. Issue #245 and competing PRs #339/#329 were checked. No runtime guarantee is inferred from historical issue tests.

OpenSpec 1.14.3 and Task were installed only under /tmp; discovery confirmed the existing local root and all artifact paths. Planning/document validation is recorded with this review's final result. Tasks 1–2 remain unapproved planning work; verification does not settle their choices. Application red/green, real database, browser/device, deployment and provider qualification are not run and remain future implementation evidence. No application files, API contract, SQL, secrets or live state are changed.
