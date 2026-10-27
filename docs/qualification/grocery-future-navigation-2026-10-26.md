# Grocery future-week navigation timing diagnosis — 2026-10-26

A test-only correction synchronizes shopping entrance and exit in the selected future-extras/past-snapshot scenario. No persistent product defect was reproduced. The historical five-worker timeout remains failed evidence: this investigation reproduced its animation and pointer-interception symptoms, but did not reproduce the full 30-second timeout or eventual DOM detachment. It does not establish their complete root cause.

## Entry and preservation

Entry HEAD: `e680fb7966978da3fbde25453a241c7e69e2b2a1`; index empty. Entry unstaged paths: Taskfile.yml; GroceryExtraPostgresTests.Live.cs; canonical data-backup-and-recovery, demo-household, grocery-shopping and household-live-updates specifications; grocery-extras-live.spec.ts; grocery.spec.ts; mock-api.ts; layout.tsx; weekStore.ts/test.ts. Entry untracked paths include docs/audits, docs/qualification, the two October 26 archives and openspec_audit.py/test_openspec_audit.py. Exact expanded inventory, staged/unstaged binary patches, before-image hashes and the grocery test before-image are retained under `.task/grocery-navigation-2026-10-26/` in status.txt, staged.patch, unstaged.patch, baseline.json and grocery.before.ts.

Only the selected test body in `pwa/e2e/grocery.spec.ts` and this new document are task edits. Product source, composer behavior, restored grocery_updated SSE test, viewport correction, shared fixtures, archive task markers and historical qualification/failure records are preserved. No checkout, reset, stash, dependency installation, commit, deployment or PR was performed.

## Evidence and diagnosis

Read the SSE quarantine and extras live reports, retained broader failure error context and verification disposition, canonical grocery-shopping requirements for selected-week shopping, future projections, current-only creation and read-only historical occurrences; selected test and setupGroceryPage; fixtures.ts and connected SSE helper; Planner navigation/AnimatePresence, GroceryList overlay, and connected schedule reconciliation.

The path is synthetic schedule/extra route state → real generated-client/store loading for the selected offset → Planner grocery tab → animated wrapper → fixed GroceryList → close callback → animated exit → planner week navigation. Current fixtures return unchecked current occurrences for positive offsets and a read-only checked historical occurrence for offset -1. Finite connected SSE responses reconnect and can request a selected-week refresh; traces show coherent selected-week reads, with no observed cross-worker state sharing. Each test has its own page and closure-owned extra array.

Historical evidence is `.task/grocery-sse-2026-10-26/verification/e2e-results/grocery-Grocery-List-—-eve-5f87b--only-snapshots-in-the-past-chromium/error-context.md`: Close waited for stability, encountered sticky-header interception, then detached before timeout. These observations alone do not prove a product defect, fixture data race or resource exhaustion.

Bounded experiments used the same isolated source copy and owned webpack dev server, synthetic authentication, strict browser API route isolation and an unreachable loopback internal API. No real API, household, database or development dotenv data was used. All browser executions disabled test retries and retained traces. Commands and output are in each named log under the evidence root; run-browser.py records the exact task invocation.

| Experiment | Result and separating observation |
|---|---|
| Original body, five workers, five repetitions, cold server | 5/5 passed; Close actions logged 35 pointer interceptions and 21 unstable-element observations. Initial compilation contributed startup time. |
| Original body, same five workers/repetitions, warm server | 5/5 passed; 35 interceptions and 25 unstable observations remained. Cold compilation alone cannot explain those symptoms. |
| Exit-only control: wait for checklist removal after each Close | 5/5 passed; 19 interceptions and 39 unstable observations remained. Exit completion alone is insufficient entrance readiness. |
| Geometry control: additionally await viewport-sized checklist | 5/5 passed; zero unstable observations, but 50 interceptions remained. Before readiness, measured checklist bounds included width 358, height 0, y 834/849; afterwards they were x/y 0, width 390, height 844. Visible rows were insufficient evidence of the fixed overlay having reached its viewport. |
| Geometry plus expanded acceptance assertions | 5/5 passed; zero unstable observations, 75 interceptions across the increased number of closes. Geometry alone still did not establish pointer readiness. |
| Final: geometry plus actual Close pointer-target readiness and exit completion | 5/5 passed; zero Close interceptions, unstable observations or detachments in retained traces. |

Counts are Playwright action-log observations, not independent failures; transition-comparison.json contains the extraction results. geometry-control.log retains measured geometry; baseline-actions.json and selected DOM snapshots retain the early action evidence. The paired controls isolate animation/layout readiness as a demonstrable test synchronization gap. They do not prove that this gap explains every part of the historical timeout. Shared CPU/rendering contention could amplify timing, but saturation was not measured and is not asserted. A broader unrelated-suite rerun would add scope without resolving a remaining selected-test question.

The first hypothesis that exit overlap alone explained the symptoms was insufficient. A viewport-sized overlay can also remain behind the sticky header while stacking/opacity transitions finish. The final test observes both viewport geometry and whether the Close button contains the actual center-point hit target before interacting. Playwright still performs its normal click actionability checks. Persistent obstruction would fail readiness; it is not bypassed. After closing, checklist count must reach zero before navigation/reopening. There are no sleeps, added test retries, forced clicks, disabled animations or relaxed assertions.

Acceptance remains: Coffee appears as an editable outstanding extra at future offsets 1 and 2; a checked Tea fixture is absent from both; the composer is absent from future and past views; closing/reopening at offset 2 retains URL, heading and Coffee; the historical Toilet paper row retains Bought state with no buttons or checkbox. Loaded week headings accompany URL checks. These expectations agree with the canonical requirements; no stale expectation or persistent product behavior failure was found in the bounded runs.

## Identity, verification and limits

Evidence root: `.task/grocery-navigation-2026-10-26/`. resources.json identifies the owned temporary source copy, PID and loopback port. The copy reuses installed PWA dependencies and excludes dotenv files. API build inputs/outputs are copied for repository verification; the Python environment is reused. Source/runtime identity, final entry-baseline comparison and cleanup are recorded separately in that evidence root.

- **Passed:** all six bounded five-execution browser batches above; scoped preparation. The final five-execution batch is the acceptance result for the final test source; intermediate passes belong to their own traced source revisions.
- **Failed, historical and preserved:** the earlier broader-suite grocery timeout and all other broader-suite failures remain failed records. No full-timeout reproduction failed in the new focused experiments.
- **Repository verification:** applicable final checks follow this document's initial content in the isolated replica, selecting this report and grocery.spec.ts. Their immutable record and detailed outcomes are retained in verification/; the final disposition is a later documentation-only update and does not alter the original tested digest.
- **Blocked:** none in focused browser execution.
- **Skipped:** zero in focused experiments; opt-in skips in repository checks must remain skips.
- **Not run:** physical Android, installed PWA, production, real API/PostgreSQL/live SSE transport, exhaustive timing/CPU-load qualification, unrelated broader-suite failures. Desktop viewport measurements do not qualify a physical device.
- **Not applicable:** product implementation red/green cycle, API/client/schema changes, migration, deployment and task-marker completion. This is a test synchronization correction with observed timing controls, not a reproduced product defect fix.

## Final repository disposition

**Passed:** final application verification, immutable copied record `.task/grocery-navigation-2026-10-26/verification/runs/3d8096ed49f1437f93e3a81070f946ba.json`, log verification.log. Documentation, lint, PWA formatting, typecheck, 1,072 unit tests, all 19 grocery browser tests at five workers, 1,249 API tests and static contract/client/mock checks passed. Browser checks had zero failures/skips; API opt-ins retained 154 skips. All identity checks passed with tested content/runtime identity `df72609dfba67ec14a504a681467873fb5eaf8151a533183e24938c6ed4b6ce1`. Source-copy parity has zero mismatches among copied entry files; excluded dotenv paths are enumerated in replica-source-parity.json. Explicit selection qualifies these changes, not the excluded dirty paths or unrelated historical suite failures.

Final PWA source manifest identity: `6edb92ecb997c73e562e1e4e22287a910c6d678e296675e6bf29de4b57af06c8` (tested-source.json/sha256, including this report before this disposition). Runtime: Node v26.12.0, Next 16.4.2, Playwright 1.64.1, Chromium 156.0.8078.4; browser binary SHA-256 `c8509aee32abd6977968e9999769980b7a420dea05402d90042d9e5b41db15ef`, recorded in runtime.json. Repository verification additionally fingerprints installed toolchain/dependencies. Browser traces embed each experiment's test source; intermediate passes do not qualify the final source. The normal API harness refreshed restore metadata in the disposable replica using the installed package cache.

**Blocked:** none. **Not applicable:** spec:check, test:agent, live endpoint parity and database-behavior for this selection. **Not run:** all device/live/production and unrelated-suite qualification listed above. No new failing run erased or replaced historical failures. The final report-only disposition receives its own bounded documentation verification under documentation-verification/.

preservation.json records unchanged HEAD/index, 2,414 unchanged entry files, no missing entry files, and byte-identical content outside the selected test body. The only new repository file is this report. task-local.patch compares the final test with its entry before-image. cleanup.json records the owned process/loopback-port shutdown and removal of the disposable source replica after verification; retained evidence remains in the workspace. No shared service or persistent network/security setting was changed.
