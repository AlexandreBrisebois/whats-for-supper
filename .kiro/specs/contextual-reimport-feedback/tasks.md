# Tasks: Contextual Recipe Re-import Feedback

## Dependency graph

```mermaid
flowchart LR
  A[CRF-01 Contract and atomic command] --> B[CRF-02 Workflow snapshot and agent focus]
  A --> C[CRF-03 PWA single Save flow]
  B --> D[CRF-04 Digital twin and end-to-end parity]
  C --> D
  D --> E[CRF-05 Finish gate]
```

## CRF-01 — Contract and atomic command

Model label: `LARGE_REQUIRED` — replaces a public report-save contract and retires a manual-import trigger while coordinating report persistence, workflow creation, lifecycle marking, generated client, and API tests.

Baseline (2026-09-12): `3116d4015dc2dcf1253819950f279993cf09aa6d`; staged, unstaged, and untracked worktree state were all empty before CRF-01 edits.

1. [x] Update `specs/openapi.yaml` first: replace `PUT /api/recipes/{id}/import-report` with `POST` using `RecipeImportIssueRequest` and a `RecipeImportReportSubmissionResponseDto`, including the distinct `reimportLaunchFailed` result for a persisted report whose workflow could not be started/marked; retire both old `/api/recipes/{id}/import` operations and add ID-addressable `GET /api/recipe-imports/{importId}`.
2. [x] Add failing contract/API tests for every CRF-2/CRF-4 branch, repeated-save snapshot comparison, active-workflow ID reuse, rejection without mutation for changed active feedback and resolve, `reimportStarted` meaning an active newly created or reused workflow with its required ID, workflow-ID authorization, retryable launch failure after report persistence with no orphaned active workflow, and terminal-workflow failure retention.
3. [x] Extend the existing in-process per-recipe lock across the controller/service command: capture the prior snapshot before mutation, reject changed active feedback and resolve, otherwise normalize/validate and persist the permitted report, derive eligibility, reuse a matching active workflow or start one new eligible revision. Document that this assumes one active API process.
4. [x] Snapshot only content reasons and note onto the new workflow; return `reimportStarted=true` with the `importId` for a newly created or reused active workflow, return `false` with no ID for manual review or unchanged terminal feedback, return the separate retryable `reimportLaunchFailed` result after persisted-report launch failure, expose `isReimporting` on the public report while an attempt is active, and expose/clear the fixed parent-safe `reimportFailureMessage` computed from the latest failed or paused contextual workflow as specified by CRF-2/CRF-4, never raw internal failure details.
5. [ ] Regenerate the client through the Taskfile and prove contract parity. Client generation passed. Static controller-route and DTO-schema drift checks passed, but reconciliation fails because `GET /api/recipe-imports/{importId}` is intentionally not in the CRF-04 stateful PWA mock; live endpoint parity is blocked because no API is running at `127.0.0.1:5001`.

CRF-01 evidence (2026-09-12): red `task test:api` failed as expected with `405 Method Not Allowed` for the new POST command before implementation. Final `task test:api` passed: 668 passed, 8 skipped. `task gen:client` passed through the Taskfile. `task agent:reconcile` failed only for the deferred CRF-04 mock route. `task agent:drift` passed static controller routes and DTO schemas; its live endpoint probe was blocked (connection refused at `127.0.0.1:5001`). Scope review against the clean baseline above found only CRF-01 contract, API, API-test, generated-client, and task-evidence paths; no CRF-02 through CRF-05 files were edited.

Required context: `requirements.md` CRF-2; `RecipeController`; `RecipeImportService`; `RecipeImportReportService`; `specs/openapi.yaml` import-report and import routes.

Escalate if: the deployment requires multiple active API replicas, or the orchestrator cannot preserve the specified saved-report-on-launch-failure behavior without a new durable outbox or schema change.

Verification: `task test:api`; `task agent:reconcile`; `task agent:drift`.

## CRF-02 — Workflow snapshot and agent focus

Model label: `MEDIUM_REQUIRED` — touches both workflow definitions and the extraction agent but does not alter unrelated agents or prompt resources.

1. [x] Add failing unit tests proving both workflow variants forward an immutable `repairReasons`/`repairNote` snapshot and normal imports omit it.
2. [x] Extend `recipe-import.yaml` and `url-import.yaml` to declare/forward the optional snapshot fields.
3. [x] Extend `RecipeAgent` to add the delimited, untrusted focus block to extraction's dynamic user message.
4. [x] Test reason-specific focus wording, note inclusion, source/schema authority, immutable payloads, and comparison of the latest snapshot for a repeat re-import.

CRF-02 evidence (2026-09-12): baseline captured before edits at HEAD `3116d4015dc2dcf1253819950f279993cf09aa6d` in task-local `/private/tmp/crf-02-baseline.ZeeZQs` (staged/unstaged diff and status hashes retained); it contained only the accepted CRF-01 worktree changes. Red `task test:api` failed as expected on the five new workflow/agent expectations (optional parameters, forwarding, and focus block). Final `task test:api` passed: 674 passed, 8 skipped. Scope review found seven CRF-02 implementation/test/workflow paths plus this evidence update; the CRF-01 contract/client/API paths remain pre-existing and unchanged by CRF-02. `WorkflowOrchestrator` gained the narrowly necessary `?` optional-parameter handling because ordinary imports otherwise fail required-parameter validation; absent optional template fields are omitted from task payloads.

Required context: `design.md` Workflow snapshot; `RecipeAgent`; both import workflows; `RecipeAgentPromptSelectionTests`.

Forbidden: base embedded extraction prompts, hero/categorization agents, status semantics, and any prompt instruction that lets feedback override source evidence.

Escalate if: workflow parameters cannot safely carry the 500-character note or YAML templating changes its contents.

Verification: `task test:api`.

## CRF-03 — PWA one-Save flow and menu removal

Model label: `MEDIUM_REQUIRED` — adapts the generated client and existing sheet/detail state, including mutually exclusive report-reason selection, without introducing a new completion choice.

1. [x] Write failing component/detail tests: gear has no reimport action; every Save submits its draft to `POST /import-report`; selecting `duplicate` clears content reasons, visibly shows `This will be saved for review.`, and announces the clearing without moving focus, while selecting either content reason clears `duplicate`; selecting an eligible content reason on a re-importable recipe reveals `What should we check?` and `Add a note to re-import this recipe.` without moving focus; a non-empty note uses that same Save submission and follows a `reimportStarted=true` response, while a blank note remains manual review; both new and existing reports expose the completion action as `Save`; only recipe-detail responses with `reimportStarted=true` begin ID-addressable polling, close the sheet, and announce `Reimporting in background`; `reimportLaunchFailed=true` leaves the sheet open with the saved draft and fixed parent-safe retry-later copy; an active report keeps its saved draft visible but disables reasons, note disclosure, note field, Save, and resolve with the live status `Reimporting recipe… You can update this after it finishes.`; completed work renders `Reimported — check recipe` and reopening the report explains the resolve-or-add-feedback next step; failed or paused polling refreshes detail, unlocks controls, and persistently shows the specified parent-safe recovery message; an unchanged post-failure Save shows the specified manual-review confirmation, while changed feedback clears the failure and may start one later attempt. Add Cook Mode coverage for consuming the same response, closing its sheet, announcing accepted background re-import, retaining its compact non-polling acknowledgement, and deferring durable outcome presentation to recipe detail.
2. [x] Remove `onReimport`, the refresh menu row, and reimport-only translation/test expectations from `ActionGearMenu`.
3. [x] In `RecipeDetailSheet` / `RecipeImportIssueSheet`, consume the command response, poll only `GET /api/recipe-imports/{importId}`, close the sheet and announce `Reimporting in background` for an accepted active response, keep the sheet open with the saved draft for `reimportLaunchFailed=true`, honor persisted `isReimporting`, and render the existing `readyToReview` state as the durable `Reimported — check recipe` outcome on recipe detail and cards after successful completion without renaming the status. Preserve the review filter label `Ready to review`. In `CooksMode`, consume the same response, close the sheet, announce accepted background work, retain a compact non-polling acknowledgement until normal refresh/navigation, and do not start a second polling loop; later recipe detail owns durable state.
4. [x] Preserve focus, Escape, draft retention, manual resolution, 44px targets, and the current three-column reason layout. The contextual cues and background acknowledgement use an accessible live status without moving focus.

Required context: `requirements.md` CRF-1/CRF-2; `ActionGearMenu`; `RecipeImportIssueSheet`; `RecipeDetailSheet`; `CooksMode`; generated recipe client.

Forbidden: a new confirmation step, two visible completion buttons, auto-reimport based on a blank note, or changing duplicate eligibility.

Escalate if: generated-client shape makes a component bypass the API contract.

Verification: `task test:unit`; `task agent:test:impact`.

CRF-03 evidence (2026-09-12): baseline captured at HEAD `3116d4015dc2dcf1253819950f279993cf09aa6d` in `/private/tmp/crf03-{status,tracked,staged,untracked}-baseline.*`; it preserved accepted staged CRF-01/02 work and had no unstaged or untracked paths. Red focused PWA tests failed as expected on the removed menu action, mixed reason selection, note cue, and old polling seam. Focused green tests: 40 passed. Final `task test:unit` passed: 503 passed, 4 skipped. `task agent:test:impact` selected all E2E because pre-existing CRF-01 API files are unmapped; after local server permission it failed before assertions across the suite (179 failed, 2 skipped, 3 did not run), so impact/E2E is failed and no CRF-04 mock or E2E work was added. Scope review found only CRF-03 PWA component/API-wrapper tests, durable badge/card assertions, and this evidence update; CRF-01/02 API/workflow/generated-client changes remain pre-existing.

## CRF-04 — Digital twin and end-to-end parity

Model label: `SMALL_SAFE` — bounded mock/test extension after the contract and PWA client are stable.

1. [x] Extend the stateful PWA mock for `POST /import-report`, preserving report reasons/note and returning `reimportStarted` plus an import ID only for eligible drafts.
2. [x] Add E2E coverage for four representative parent-visible journeys: (a) eligible content-with-note start, ID-addressable polling, absent gear re-import, and durable successful outcome; (b) one manual-only save covering duplicate or blank-note behavior; (c) active-control locking across reload; and (d) failed/paused unlock after authoritative refresh. Keep the complete eligibility, reuse, and unchanged-feedback matrix in CRF-01 API/service tests.
3. [x] Confirm existing status-polling mocks remain deterministic.

Required context: `requirements.md` CRF-2; `pwa/e2e/mock-api.ts`; existing recipe-report E2E flows.

Forbidden: live API calls, loose selectors, and mock-only behavior that differs from API eligibility.

Escalate if: the mock needs contract fields not generated by CRF-01.

Verification: `task test:e2e`; `task agent:drift`.

CRF-04 evidence (2026-09-12): baseline captured before edits at HEAD `3116d4015dc2dcf1253819950f279993cf09aa6d` in `/private/tmp/crf-04-baseline-{tracked,staged,status,untracked}.*`; it preserved the accepted staged CRF-01/02/03 worktree. `pwa/e2e/mock-api.ts` now persists normalized reasons/note through the POST command and uses only the accepted `canReimport && content-only && nonblank-note` predicate; it omits `importId` for manual saves and returns deterministic Processing then terminal ID polling. Focused E2E adds the four parent-visible journeys without recreating the API reuse matrix. `npm run typecheck` passed. `task agent:drift` passed static controller-route and DTO-schema checks but is blocked at the live endpoint probe because `127.0.0.1:5001` is unavailable; its mock-compliance child was run separately and passed. `task test:e2e` reached the test runner after local server permission but failed before assertions (179 failed, 2 skipped, 3 did not run) because the required Chromium executable is absent from the Playwright cache. Scope review against the baseline found only `pwa/e2e/mock-api.ts`, `pwa/e2e/recipe-import-reporting.spec.ts`, and this CRF-04 evidence update; all prior CRF work remains pre-existing. Reviewed CRF-04 content identity: `mock-api.ts` `7eea4ef87d4386d9398d433bc68975274916cfa4363fc0fed8025801e9560a45`; `recipe-import-reporting.spec.ts` `f8a1974e816bd00d2e9d6939740f344eb00feefb8af26fcd0665f2ee4bbebd44`.

## CRF-05 — Completion gate

Model label: `SMALL_SAFE` — no implementation; run repository-owned gates once all prior slices are complete.

1. [ ] Verify the spec task checkboxes and decisions match implementation.
2. [ ] Run `task agent:finish` exactly once and report passed versus blocked gates.

Required context: this spec package and final worktree.

Verification: `task agent:finish`.

## Prompt manifest

Each task above is launch-ready only after its predecessor is complete. Use the listed model label as the smallest viable fit; do not parallelize CRF-01 with CRF-03 because the generated command shape is their shared seam.
