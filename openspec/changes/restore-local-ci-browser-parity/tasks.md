# Tasks

## Current coordinated release policy — 2026-11-11

The user authorized completing the remaining accepted dependable-portions release
after predecessor C05 at `74f0a48b47ffd6eccb52d3710de58c384c2b6aaa`.
Local tests and exact-candidate data-preserving DV acceptance gate runtime slices;
applicable checks gate documentation slices. Commit accepted owned work locally
and continue the dependency queue without per-slice pushes. After full integrated
local/DV qualification, make one consolidated push, resolve required hosted CI
failures with justified repairs/follow-up pushes, then sync/archive only fully
completed in-scope changes. Required exact-final-candidate hosted acceptance stays
open until observed. Historical single-slice stopping and hosted-before-DV rules
below describe their original operations and are superseded prospectively by this
policy; historical failures/retries/limits remain unchanged. No production, reset,
reseed, force push, unrelated merge, garlic-placeholder implementation or Similar
UI work. Selective repair remains superseded. The 2026-11-12 user amendment includes
bilingual identity with a reviewed model-authored vocabulary, durable versioned JSON
on disk and full backup/restore; no external dataset or runtime AI regeneration.
Migration preserves all planned meals/events and rebuilds every grocery list;
checks and checked-demand baselines may reset only in that fenced rebuild.
Manual extras/corrections/history and ordinary later check continuity remain.
Task IDs/checklists remain authoritative; partial slices do not close aggregates.
The operational navigation record is `.task/dependable-portions-coordinator/continuation.md`.


Implementation progress and observed evidence are recorded in evidence.md. This change preserves existing product requirements; there are no delta specs. Use the commands below inside the task-owned runtime where port 3000 is available, never against the occupied DV server. Record exact invocations and content identity in invocation-specific evidence. Remote pushes/reruns are follow-up authorization, not an implied effect of applying local tasks.

## 1. Reproduce the reported CI failures on the reported candidate

**Outcome and scenarios:** Explain the nine final failures and two retry-pass cases from run 42383870083 without assuming a common race. First tracer: cooking / “Prepared response is lost” and “Completion resolves”.
**Owners and boundaries:** Fresh production PWA, CooksMode, generated consumer, prepared-supper/quiet-portions/context tests, method-sensitive mock-api handlers. No production API or household data.
**Dependencies and prerequisites:** Isolated checkout of `e504e820a67bf25e5849157a1017aad54e7ff392`, repository Node/npm/browser pins and a task-owned runtime. Preserve current dirty work and the independent cooked-portions change.
**Acceptance boundary:** Browser → real PWA/Kiota code → mocked HTTP boundary; no database durability claim.

- [x] 1.1 Capture the reported commit, job logs/traces, failure names, baseline file hashes and saved local invocation/build configuration. Confirm the earlier 956-pass report includes these cases; compare candidate/config/runtime identity rather than dismissing it as omitted coverage. Completion evidence: one discrepancy table with confirmed facts and unconfirmed causes, including the existing check:push path. See evidence.md.
- [x] 1.2 Reproduce the unchanged lost-reply tracer with CI build flags and production startup: `CI=true task test:e2e -- prepared-supper.spec.ts --grep 'reconciles lost reply' --workers=4 --retries=0`. Set the build flags through the current check:push:pwa exports until group 2 provides the shared owner. Capture POST prepare count, projection reread/receipt, alert, celebration and close state. Completion evidence: intended behavioral failure or a documented non-reproduction followed by the smallest controlled configuration/platform experiment; a startup error is not red.
- [x] 1.3 Run the full three reported files with `CI=true task test:e2e -- prepared-supper.spec.ts quiet-portions-layout.spec.ts supper-servings-context.spec.ts --workers=4 --retries=0` on the same artifact. Classify each failure/retry family using traces and attached DOM/network state; isolate menu focus/Enter and empty-color contrast measurements. Completion evidence: specific cause or still-unresolved finding per family, with a discriminating experiment before any repair. If the root cause requires a changed API/product contract, stop that dependent repair and reconcile scope.

## 2. Make production-browser commands execute the same candidate and settings

**Outcome and scenarios:** A CI-named local command consumes a fresh production build under the shared CI configuration; inherited URLs/selectors and occupied ports cannot silently redirect it.
**Owners and boundaries:** Taskfile, package scripts, Playwright config, small shared owner under scripts/ci, validate.yml; existing push_guard remains the committed-range entrypoint.
**Dependencies and prerequisites:** Group 1 configuration comparison; retain CI build-once and matrix/report/check names.
**Acceptance boundary:** Invocation/config regression tests plus an actual production build/start/browser smoke, not just inspection of shell strings.

- [x] 2.1 Add behavioral command tests proving both task/npm CI aliases currently fail to enforce production mode, and checking inherited BASE_URL/suite overrides, invalid suite input, occupied port and child failure propagation. Use existing `scripts/agent/tests/test_push_selection.py`, `test_ci_candidates.py`, `scripts/ci/*.test.cjs` patterns and task doubles for negative command cases. Completion evidence: observed red before runner edits, with no unrelated process terminated.
- [x] 2.2 Extract/reuse the production-browser execution/configuration owner and wire check:push:pwa, both test:e2e:ci aliases and CI build/run steps to it. Preserve ordinary development E2E and supplementary household/demo/beta checks. Build/config identity and per-suite results must survive CI artifact transfer; emit allowlisted settings and runtime/tool/browser versions. Completion evidence: group 2 regressions green via `node --test scripts/ci/*.test.cjs` and relevant Python harness tests, plus a real fresh build and representative browser smoke on the recorded artifact.
- [x] 2.3 Update LOCAL_DEV_LOOP.md and execution-harness guidance with exact development, dirty feedback, committed-range plan and production qualification commands; explain native versus hosted scope and port/resource isolation. Verify CI still builds once and matrix jobs consume that artifact, stale/external build evidence is rejected, and failed suites propagate through the existing required gate. Completion evidence: `task test:agent`, CI runner tests, and captured representative build/start/test record.

## 3. Close the local impact-selection holes

**Outcome and scenarios:** Changes to shared detail/cooking consumers select their cross-feature browser coverage; committing changes does not make push validation forget the pushed range.
**Owners and boundaries:** test_ops.py, select-e2e.cjs/e2e-suites.cjs, existing test_test_ops/test_push_selection fixtures. Preserve non-PWA classification and existing clean-commit safeguards.
**Dependencies and prerequisites:** Shared execution owner from group 2; use capability inventory, not a second filename-prefix map.
**Acceptance boundary:** Real selector and temporary Git-range integration tests, followed by the selected production-browser suites.

- [x] 3.1 Add and run regressions showing RecipeDetailSheet changes omit quiet-portions-layout and CooksMode changes omit prepared-supper/context coverage. Include source-plus-test changes, deleted/renamed/unknown/shared PWA inputs and documentation-only paths; retain all-unpushed-commits selection when the final commit is docs. Completion evidence: intended red for the omissions before selector edits; existing range/scope regressions remain meaningful.
- [x] 3.2 Reuse the shared capability selector/inventory for affected PWA paths in the impact runner, retaining conservative fallback, explicit selected-path scope, non-PWA behavior and cache identity safeguards. Run `node --test scripts/ci/*.test.cjs` and `task test:agent`; compare impact and `task check:push -- --plan --base <candidate-base>` suite output on temporary committed fixtures. Completion evidence: all reported file families included, unrelated docs excluded, unknown PWA impact broad, and changed ranges represented accurately. Update command scope documentation in this group.

## 4. Repair confirmed cooking completion and recovery causes

**Outcome and scenarios:** Existing cooking requirements “Wait for cooking completion before success feedback”, “Keep failed cooking completion open for retry” and “Confirm local supper completion only for a matching confirmed result”; frozen prepared portions remain protected.
**Owners and boundaries:** CooksMode, its existing unit/SSE tests, prepared-supper.spec.ts and mock-api prepare/projection handlers. No independent backend/contract rewrite.
**Dependencies and prerequisites:** Group 1 confirmed cause per selected family, group 2 reproducible production runtime. Coordinate the independent cooked-portions owner before overlapping changes.
**Acceptance boundary:** Actual production React/Kiota execution with method-sensitive boundary mocks; keep real database evidence separate.

- [ ] 4.1 Add/update the smallest focused regression for each confirmed cause and observe intended red before application changes, using `task test:unit -- src/components/planner/CooksMode.test.tsx` and `task test:unit -- src/components/planner/CooksMode.sse.test.tsx` as applicable, plus the exact failing prepared-supper case. Record whether the repair belongs in application code or fixture/readiness, and why approved intent supports it.
- [ ] 4.2 Apply the smallest repair and run `CI=true task test:e2e -- prepared-supper.spec.ts --workers=4 --retries=0 --repeat-each=3` against a rebuilt matching artifact, plus affected unit tests. Completion evidence: lost response/publication failure confirms one original write/receipt; negative/unavailable outcomes retain work until explicit review; successful completion closes after celebration; future/generic/prepared contexts and all existing responsive variants pass. No blind retries, removed assertions or blanket timeout increases. Publish cause and red/green evidence with this group.

## 5. Repair confirmed menu and measurement causes

**Outcome and scenarios:** Recipe-library “Keep refined detail usable across layouts and languages”, “Retain explicit preview intent through background loading” and “Expose original evidence without a duplicate serving list”.
**Owners and boundaries:** RecipeDetailSheet/ActionGearMenu, existing unit tests, quiet-portions-layout and supper-servings-context browser tests, coherent mock projection state.
**Dependencies and prerequisites:** Group 1 confirmed cause, group 2 runtime. Preserve the group 4 repair and original/preview/reset behavior.
**Acceptance boundary:** Production browser keyboard interaction and rendered geometry/contrast; unit tests cannot qualify focus/layout by themselves.

- [x] 5.1 Add/update focused regressions for the confirmed detachment/readiness cause and invalid computed-color measurement before changing their owners. Use `task test:unit -- src/components/recipes/ActionGearMenu.test.tsx`, `task test:unit -- src/components/recipes/RecipeDetailSheet.refinement.test.tsx` where relevant and exact CI browser cases. Completion evidence: intended red, with traces distinguishing an actual visual/focus defect from a detached measurement.
- [x] 5.2 Apply bounded fixes and run `CI=true task test:e2e -- quiet-portions-layout.spec.ts supper-servings-context.spec.ts --workers=4 --retries=0 --repeat-each=3` against the rebuilt artifact, plus affected unit tests. Completion evidence: both languages, existing phone/tablet/200%-text variants, keyboard original/reset activation and heading focus, coherent preview/planned/prepared quantities, valid contrast measurements and real low-contrast failure detection. Keep genuine contrast assertions; no click fallback, skip, or retry-based success. Document confirmed causes and preservation checks here.

## 6. Final integration and candidate qualification

- [x] 6.1 Review the complete task-owned diff, reconcile concurrent cooked-portions work without silently including it, run `task prepare -- <complete-reviewed-changed-paths>`, then `task verify -- <complete-reviewed-changed-paths>` on stable content. Completion evidence: all applicable statuses and invocation-specific record_path; record source identity and limitations. Planning validation alone does not complete these tasks.
- [ ] 6.2 On the final isolated candidate, run the three affected files at four workers with zero retries, then `task check:push:pwa SUITES='planning recipes'`, then `task check:push:pwa SUITES='tonight planning recipes household'` so full qualification uses CI's actual disjoint inventory rather than an accidental default including live-only files. Record all first-attempt failures, retry passes and intentional skips; reported families require zero failures/retry passes. Run the supplementary welcome/demo/beta scenarios using workflow-equivalent configuration. Completion evidence: fresh production build/config/source identity and complete per-suite results; unexpected unrelated failures remain visible blockers or explicitly scoped follow-up, never an unqualified full pass.
- [ ] 6.3 Reconcile final local records with an authorized hosted CI run on the same committed candidate. Compare suite inventory, effective flags, build identity and first-attempt/retry outcomes; require every selected required CI job green and the reported families clean on first attempt. Completion evidence: hosted run/job/artifact URLs tied to the final commit, local record references, and no later source mutation. If a push/rerun is not yet authorized or hosted execution is unavailable, leave this task incomplete and report hosted qualification as pending.
