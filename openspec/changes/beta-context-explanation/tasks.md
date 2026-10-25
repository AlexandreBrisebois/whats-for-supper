# Tasks

## 1. Specification preparation and review only

**Outcome and scenarios:** Review proposal, `specs/app-installation/spec.md` acceptance scenarios, exact bilingual copy and design tradeoffs for #345. All behavior remains proposed.
**Owners and boundaries:** OpenSpec planning files only; app-installation owns Beta presentation, Demo retains its own policy. No runtime edits or application test execution in this phase.
**Dependencies and prerequisites:** Main `4414c7379000b11d0f4411b4213ee71b98eb651c`; unmerged Demo #348 `fdde5fe3a6721582e2ec00dda5429936d9f17c82`. Current root/host/loading guidance and relevant OpenSpec/designer skills reviewed.
**Acceptance boundary:** Source/diff and document verification only. Source inspection and Demo's reported validation are not Beta behavior evidence.

- [x] 1.1 Inspect actual issue, branch/PR duplication, main identity/spec owners and Demo presenter/store/dialog/provider; verify immutable source references and distinguish unmerged behavior in proposal/design.
- [x] 1.2 Prepare focused proposal, Beta acceptance delta and author design review; explicitly label combined precedence, first-entry and copy as proposals. Confirm no runtime or dependency changes and no duplicated onboarding owner.
- [x] 1.3 Pass strict selected and full OpenSpec validation plus explicit-document `task verify`; review changed links/whitespace and report exact invocation evidence/content identity with passed/failed/skipped/unrun distinctions.
- [ ] 1.4 Publish the authorized separate draft spec PR linked to #345 using the GitHub connector; verify only intended documents against exact main base, read back their bytes, and monitor checks on its exact immutable head.

## 2. Decisions required before implementation planning

- [ ] 2.1 Parent brings this concrete design review to Alex and records explicit approval or corrections for copy, initial query-free Home gate and retaining Demo-first combined-mode policy; reconcile all affected documents before generating dependent implementation tasks. Completion evidence is Alex's recorded decision, not artifact existence or CI success.
- [ ] 2.2 Before any later authorized apply phase, recheck Demo #348's actual merged successor or explicitly reviewed stack, inspect presenter/spec drift, and generate the bounded implementation tasks from accepted decisions and the design's verification matrix. Completion evidence names current refs, accepted decisions, first observable slice, red/green commands and required device checks. This task is blocked in the current phase.

## Preparation evidence and handoff

The starting checkout was clean at older `ba8dca21c83000d03ce03dbe51bd7542daa76b88`. It is preserved. An isolated `/workspace/beta-spec-review` copy was materialized with GitHub-connector file reads; its baseline Git tree equals current main's `f9bedafa1308e5f17064f57b1716c96a913ccb18`. Local synthetic baseline commit metadata is not claimed to be the remote main commit.

Task and pinned OpenSpec 1.14.3 tooling are isolated under `/tmp/beta-spec-tools`; no project dependency pins changed. The first tooling install failed because its default npm cache could not be created; retry used a writable temporary cache. No repository action was denied. Final document verification results and CI links belong in the PR/report at their actual checked head; no runtime acceptance boxes are marked complete here.

Initial strict validation failed on the delta's non-normative preamble, which archive would discard. Removed that redundant sentence (proposal/design retain draft status); selected validation then passed, full validation passed 36/36, and the explicit five-file document gate passed. This task-evidence update requires a fresh final document gate; report its immutable record instead of attaching the earlier digest to these changed bytes. Publication task 1.4 is intentionally pending in this prepublication snapshot; its outcome is reported with the exact PR head.

Behavior red/green, Beta unit/browser/API/device tests, production tests, implementation, merge, deployment, spec sync and archive are unrun or outside this phase. The design's future verification matrix is a plan, not evidence. Parent must present the spec review to Alex and receive approval before any implementation.
