# Tasks

## 1. Correct the selected consumer behavior

**Outcome and scenarios:** A→B→A, acknowledgement, delayed/rejected writes, close/switch and retry, as specified in this change's delta.
**Owners and boundaries:** Existing PWA owners and focused tests; no API/persistence contract changes.
**Dependencies and prerequisites:** Pinned Node/OpenSpec/Task, installed lockfile dependencies and Chromium; deterministic fixtures.
**Acceptance boundary:** Real UI/state/generated request consumers with controlled HTTP responses; existing API persistence is preserved, not newly qualified by mocks.

- [x] 1.1 Add regressions before production logic and run `task test:unit -- src/components/recipes/RecipeDetailSheet.test.tsx src/store/recipeNotesStore.test.ts`; record intended behavior failures.
- [x] 1.2 Implement the bounded behavior and run the same focused suites green, preserving adjacent behavior and exact identities/text.
- [x] 1.3 Add/run `task test:e2e -- recipe-notes-recovery.spec.ts` with stateful method-sensitive GET/PATCH or paged GET fixtures and retained existing browser coverage; record actual success/failure/retry observations.

## 2. Final Integration and Verification

- [x] 2.1 Reconcile every scenario, run preparation and `task verify -- <complete-reviewed-changed-paths>`, record the verification path and limitations; do not close with blocked required checks.

## Workflow follow-up

- After acceptance, synchronize this delta into its existing capability and archive the change. Update only completed backlog scope, preserving adjacent unresolved items. Publish the combined draft PR through the GitHub connector and inspect exact-commit CI.

## Evidence

Initial component regression run: 3 intended failures (premature Saved, missing A restoration, discarded close draft), 20 existing passes. After implementation 23/23 passed. Ordered-save state tests passed 3/3. Required browser and final harness acceptance remain pending.

Additional stale-read regression failed as intended (A overwrote acknowledged B), then notes component/store suites passed 27/27. Stateful Chromium GET/PATCH acceptance passed 1/1, including close/failure/reopen/retry and exact reread. Real controller/service PATCH→GET acceptance passed 1/1 for B→A, whitespace and empty notes with rating unchanged, using the repository EF in-memory test host (not PostgreSQL). The test fixture enum compile error was corrected before that successful run.

Final implementation acceptance: `task prepare -- <all 19 reviewed paths>` passed. `task verify -- <the same paths>` recorded `.task/agent-finish/runs/0f46718ca3bd420f9fdf2a28d5fcfc79.json`: documentation, OpenSpec, lint, formatting, types, 816 unit tests, impact browser coverage (262 passed/13 skipped), and API tests (934 passed/61 skipped) passed, with stable content identity. Its only failure was Kiota startup without .NET 10; after installing that runtime, `task gen:client:check` passed with the client up to date. Do not describe that original aggregate record as wholly passing. A fresh full verification of the archived/backlog-cleaned tree is the publication gate.

Browser acceptance includes complete 126- and 180-item forward/backward cycles (3.7 and 5.4 minutes), global ordinals/IDs, visible failed-wrap recovery and retry, delayed All→Discovery response isolation, and notes acknowledgement/close/failure/reopen/retry/reread. Existing browser detail return and list-mode tests also passed. Browser fixtures substitute HTTP; API tests use the repository test host. No PostgreSQL, production dataset, external-provider or native-device claim is made. Browser skips are 11 opt-in live-host cases plus two existing quarantined cases (grocery SSE and Home reload); API opt-in/skip results remain distinct from passing tests. The reported 200-recipe dataset has not been reproduced or tested; fixtures cover 126/180. WFS-BL-011 still retains additional presentation/unmount qualification.

Publication-tree verification: `.task/agent-finish/runs/6dc6ad2c9f5443f6a146ef8d305114e4.json` has stable content and passing documentation, strict specs, lint, formatting, types, 816 unit tests, 934 API tests/61 skips, and all static contract/client checks. Browser impact discovered 275: 261 passed, 13 skipped, and the existing unchanged `LibraryToast auto-dismisses without navigation` test failed its six-second hidden assertion. Both full stack cycles and notes recovery passed. The same toast test passed in the earlier full run and then passed 3/3 isolated reruns via `task test:e2e -- capture-flow.spec.ts --grep 'LibraryToast auto-dismisses without navigation' --repeat-each=3 --workers=1 --reporter=line`, without changing its code or assertions. This is timing-sensitive evidence, not a wholly green publication-tree aggregate record. No additional long full-suite rerun was used to hide it. The draft PR reports this limitation and exact-commit CI separately.
