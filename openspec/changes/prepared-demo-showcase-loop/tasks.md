# Tasks

This is a research/specification-only proposal. No implementation is authorized by these tasks. The date policy, votes/reports policy, maintenance allowlist and legacy recapture choice in design.md require review before dependent implementation tasks are generated. Proposed requirement language is not approval.

## 1. Resolve consequential behavior choices

**Outcome and scenarios:** Accept or amend the proposed fresh-round, calendar-anchor, safe-maintenance and legacy-baseline requirements.
**Owners and boundaries:** Existing demo-household capability and application-time, recovery, search and workflow owners.
**Dependencies and prerequisites:** Review proposal.md, the complete inventory in design.md and specs/demo-household/spec.md against issue #245.
**Acceptance boundary:** Written review decisions and reconciled planning artifacts; no runtime changes.

- [ ] 1.1 Record the accepted date/clock policy and field-level rebasing versus audit-time classification, including soft-delete retention; reconcile all date scenarios and inventory rows.
- [ ] 1.2 Record whether prepared votes and import reports are included or cleared, and define round/report normalization; reconcile the fresh-round scenarios without replayable identities.
- [ ] 1.3 Record the safe-maintenance allowlist and stale-work fencing owner, including dreaming, search reconciliation and maintenance commands; demonstrate that each allowed path is model-free by source review.
- [ ] 1.4 Accept or amend legacy recapture policy and baseline authority separation and the concrete operator-authority mechanism; reconcile format, management diagnostics and compatibility scenarios.

## 2. Prepare the accepted implementation plan

**Outcome and scenarios:** A bounded implementable plan only after group 1 decisions are resolved.
**Owners and boundaries:** Existing management workflow, demo/recovery, search/provider boundaries and PWA consumers; no general framework.
**Dependencies and prerequisites:** All consequential decisions in group 1 accepted; current source rechecked if main moved.
**Acceptance boundary:** Reviewed tasks with named checks, not implementation or runtime qualification.

- [ ] 2.1 Expand the first real API/workflow/PostgreSQL/file-generation slice from design.md into red/green/refactor tasks with exact test filters and expected restored plan/extra/asset outcomes.
- [ ] 2.2 Add dependency-ordered slices for the full state inventory, stale-work/client generation invalidation, every provider zero-egress path and failure-safe recurrence; name real database, failure-injection, fake-clock and browser acceptance per slice.
- [ ] 2.3 Identify exact affected OpenAPI routes/status shapes, generated Kiota client consumers and method-sensitive pwa/e2e/mock-api.ts handlers/builders/state transitions; require contract-first synchronization and task gen:client:check in each affected slice.
- [ ] 2.4 Include non-demo, ordinary merge/exact recovery, authorization and artwork preservation checks, and operator preparation/capture/activation documentation in their owning slices.

## 3. Planning verification

- [ ] 3.1 Reconcile full modified requirement blocks with canonical demo-household ownership; verify complete table/non-database inventory, no contradictory new policy, and clearly labelled unapproved choices.
- [ ] 3.2 Run task spec:check -- prepared-demo-showcase-loop --type change and task verify with the complete reviewed planning-file set in a supported repository environment; record actual result and record_path. Local CLI/harness are not run in this connector-only drafting session.
- [ ] 3.3 Review the final planning-only diff and strict CI at its exact head. Record pass/fail/blocked/not-run separately; no runtime, provider, database or browser acceptance is claimed for this PR.

## Current evidence

Research used GitHub Connector reads pinned to main e76332c9e35c3d8584cbed6476ea9c43b4d40ea7, repository policy/schema/templates, canonical specs and current source. Connector authoring follows the existing WFS artifact shape; OpenSpec discovery/generation commands and local Taskfile verification were not executed. The established repository root/configuration was inspected directly; no new root/store was initialized. Strict CI results belong in the PR at the tested commit. Application red/green, live database, browser, deployment and model qualification are not applicable to this planning-only publication and remain required future implementation evidence.
