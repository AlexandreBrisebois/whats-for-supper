# Tasks

## 1. Preserve application behavior on a compatible dependency cohort

**Outcome:** Existing API, persistence, generated-client and browser behavior remains unchanged. No specification-level behavior changes; any discovered logic regression requires an observed failing test before correction.
**Owners:** API/test manifests and shared EF overrides, package locks, PWA and generated Kiota client, tool/runtime pins and container references.
**Acceptance:** Normal resolution without forced peers or suppressed NuGet errors; real isolated PostgreSQL integration, full mocked-browser tests and production container smoke. No billable AI calls or household data.

- [x] 1.1 Verify current main, existing PR ownership and published versions; capture baseline locked restore, npm tree/outdated/format and disposable candidate resolution including peer constraints in evidence.
- [x] 1.2 Align the API/test EF and provider cohort, update compatible unowned API/test packages and both NuGet locks; verify locked restore, Release build, API tests and the isolated PostgreSQL suite, retaining the report SQL workaround; document version rationale.
- [x] 1.3 Apply accepted PWA/toolchain versions and lockfile, preserving packages owned by other PRs; verify clean npm install/tree, generated Kiota parity (regenerate from the unchanged approved contract only if needed), lint/types, units, production build and full E2E; update dependency documentation.
- [x] 1.4 Align verified infrastructure image patches and installation templates without a database-major change; verify migration behavior and disposable runtime checks, plus production container smoke in CI if connector-only binary retrieval prevents local execution. Record local and CI scope separately.

## 2. Final integration and verification

- [ ] 2.1 Reconcile acceptance and version evidence, run scoped preparation, review all changed/new/deleted files and run `task verify -- <complete-reviewed-task-paths>`; record the invocation path and actual passed/failed/blocked/skipped/unrun checks. Run the repository push gate against the reviewed committed scope and follow exact-head CI to completion; leave missing qualification visible.

## Workflow follow-up

- Update existing EF PR #293 as a draft without force push or an auto-merge request; retain its history and remove obsolete bot text. GitHub documents that custom extra commits stop automatic Dependabot rebases; do not use any skip-Dependabot marker that permits overwriting them.
- Keep the change active until all acceptance, including remote container checks, passes. Archive only when appropriate after reconciliation and verify the final planning state. No merge, release or deployment.

Current final-verification status: local repository verification and commit checks passed. Implementation head `19b721b81b57bad5dfec6b476344a96048633367` completed push/PR CI, AMD64 production smoke, installation identity and both CodeQL analyses; the CodeQL comparison aggregate is neutral due to legacy main configurations. The full implementation-range local push gate is still unrun because its production-smoke step cannot retrieve GitHub binary notices through the connector. Task 2.1 remains open for that local prerequisite; no local full push-gate pass or archive is claimed. Documentation-only follow-up validation is recorded separately.
