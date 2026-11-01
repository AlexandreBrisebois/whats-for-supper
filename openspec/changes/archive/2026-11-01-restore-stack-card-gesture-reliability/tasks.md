# Tasks

Alex approved implementation in the cloud after reviewing the diagnosis. Tasks are marked complete only with their required evidence; device qualification remains separate from cloud browser checks.

## 1. A fresh tap works after an incomplete drag

**Scenarios:** recipe-library “Tap after an incomplete drag”, “Suppress a drag-induced tap”.
**Owners/boundary:** RecipeStackCard → Browse detail ID → RecipeDetailSheet; real Motion in browser acceptance, schema-compliant local GET /api/recipes/{id} mock at external API boundary. No API/client/mock contract changes.
**Prerequisites:** approved proposal, pinned dependencies and isolated local test server; no production BASE_URL.

- [x] 1.1 Add a regression to RecipeStackCard.test.tsx for >5 px sub-navigation drag followed by the first fresh tap; extend e2e/browse-all-stack.spec.ts with the same real-Motion mouse and touch sequence. Run task test:unit -- src/components/recipes/RecipeStackCard.test.tsx and task test:e2e -- e2e/browse-all-stack.spec.ts before implementation and record the intended poisoned-tap failure.
- [x] 1.2 Reset tap eligibility per primary pointer session as designed; preserve same-session suppression, rear-card guard and Enter/Space. Repeat those commands green; require exactly one detail activation for the current ID, retained position after close, 2 px accidental movement accepted as a tap and >5 px drag not opening detail. Record red/green evidence in task notes.

## 2. Browse directly follows Discovery's movement

**Scenarios:** “Grab at different visible card locations”, “Preserve small motion and release policy”.
**Owners/boundary:** neutral shared movement hook → real Motion cards → separate consumer release callbacks. Browse page/store and Discovery voting stay with their existing owners.

- [x] 2.1 Add held-displacement/activation regressions with real Motion for image/title/body and pointer/touch, plus release boundaries (Browse 35/280, Discovery 80/500, strict exceed semantics in both directions). Run the affected task test:unit selections and task test:e2e -- e2e/browse-all-stack.spec.ts e2e/discovery.spec.ts; record the intended 27 px versus 60 px Browse failure before extraction. Retain policy expectations.
- [x] 2.2 Extract Discovery's neutral motion values/rotation/drag props into useHorizontalCardMotion and consume it from both cards. Repeat red commands green plus the DiscoveryCard.test.tsx selection: 60 px held input yields matching movement, no hold delay, unchanged release outcomes, BACK/NEXT versus LOVE/PASS, haptics and rear-card behavior. Require no Browse POST vote requests and one correct Discovery vote per accepted swipe. Update slice evidence.

## 3. Interrupted gestures cannot trigger stale actions

**Scenarios:** “Pointer cancellation”, “Leave during departure animation”.
**Owners/boundary:** Browse session, Motion cancellation and departure completion → page/store lifecycle. Depends on slices 1–2; Discovery voting policy remains unchanged.

- [x] 3.1 Add pointercancel below/above 35 px, subsequent fresh tap/drag, repeated release, pointer leaving card, and pending-departure filter/list/close/front-demotion cases. Run task test:unit -- src/components/recipes/RecipeStackCard.test.tsx and task test:e2e -- e2e/browse-all-stack.spec.ts e2e/browse-stack.spec.ts before implementation; record the intended cancellation or stale-completion failures.
- [x] 3.2 Guard cancellation and invalidate Browse departure completions on lifecycle departure; ignore duplicate departures. Repeat those commands green: zero cancelled/stale detail or navigation actions, one action per genuine current release. Keep existing wrap, failed-page retry and departed-response expectations; record exact tested source/runtime identity.

## 4. Final integration and device qualification

- [x] 4.1 Run task test:e2e -- e2e/browse-all-stack.spec.ts e2e/browse-stack.spec.ts e2e/discovery.spec.ts with local route mocks and the design's 390×844, 320×568, 390×700 and 768×1024 input/viewport matrix. Require unchanged ordinary-phone dimensions, short-screen text/action access, recorded computed touch policy, keyboard/reduced-motion preservation and no horizontal overflow. Explicit touch contexts are required beyond the existing Desktop Chromium config. Record actual results and blocked coverage.
- [ ] 4.2 Qualify grabbing, incomplete-drag→first-tap and interruption on a narrow phone and iPad/Safari before release acceptance. If the beta-only complaint persists, record exact OS/viewport/input/start location, computed touch policy, scroll positions and pointercancel sequence for stable and beta full layouts; return evidence for review before speculative scroll/dimension changes. Record actual device results or a precise blocker.
- [ ] 4.3 Reconcile every scenario against evidence, run task prepare -- <reviewed changed paths>, review the complete diff, then task verify -- <complete reviewed changed paths> once. Cite record_path and classify passed/failed/blocked/not-run checks; required missing acceptance prevents completion. No tag, release, manual build dispatch or PR is included; Alex subsequently authorized branch integration.


## Implementation evidence (cloud)

- Source rechecked: intended remote branch and beta17 both remain 74ed426925896fa01b28f093e399e4f93e48d9a0. Only task-owned source/test/spec files changed; nothing staged or published.
- Tap red: red-unit-tap.log (0 callbacks instead of1) and red-browser-tap.log (first subsequent tap does not open detail). Green: green-unit-tap.log, green-browser-tap.log.
- Movement red: red-browser-movement.log, both mouse/touch return27 instead of60 px. Green: green-browser-movement.log. Exact Browse35/280 and Discovery80/500 boundaries are retained in unit tests.
- Interruption red: red-unit-interruption.log (7 failures covering cancellation, stale completion and duplicate departure); red-browser-cancel.log (native touch±45 px causes navigation). Green: green-unit-interruption.log and green-browser-interruption.log.
- Beta-only full-layout evidence and controlled inner-scroller correction are in design.md. Unmodified stable passes image/title/body touch; unmodified beta17 cancels title touch. The committed regression contains no override or baseline mode.
- Current source: all122 unit files/1660 tests pass (final-unit.log), typecheck passes, PWA formatting passes, lint passes with two pre-existing warnings outside this change. Consumer page Motion mock was updated for the actual hook APIs/stable animation-controller lifetime; assertions were retained.
- Integrated verification: prior affected suites77/78 passed; the one new-fixture total mismatch was corrected with a consistent summary. Final new stack suite18/18 passes, including mouse/touch title/body grabs, cancellation,2 px incidental motion, repeated drags, four viewport sizes, keyboard, navigation departure and retained vertical card scrolling. Additional native Discovery tests2/2 pass, retaining no vote at60 px and the existing right/left payloads at±100 px.
- Capability registration passes inventory and its five regression tests. task prepare refuses the unclassified existing scripts/ci/e2e-suites.cjs path; no classifier was weakened. Selected application files were formatted explicitly and full npm format:check passed. Final verification retains the conservative union for this path.
- Broader aggregate verification is next. Backend tooling is currently blocked: the required RC2 SDK was installed in scratch, but dotnet tool restore fails because its runtime requires /home/agent/.dotnet on a read-only filesystem, even with the supported additional path grant. No automatic-approval rejection occurred; this is a filesystem/runtime failure. No live API is running for endpoint parity. Physical Safari/iPad/phone testing is unrun. These limits keep final qualification tasks open.

Logs are under /workspace/scratch/wfs-gesture-review/. Final aggregate records belong under .task/agent-finish/runs/; the handoff reports their exact paths and results without claiming missing acceptance.


## Terminal verification and integration checkpoint

- Initial aggregate: .task/agent-finish/runs/08ddf22d56794c3f8bda14e09bcfc978.json; source/content identity passed. Browser impact reached900s with472 passes/12 skips/0 case failures before stopping. Tooling stages failed for missing pre-commit and an unwritable .NET runtime directory; no automatic retry occurred.
- Supported tool recovery uses XDG_RUNTIME_DIR in a private0700 /tmp directory, private DOTNET_CLI_HOME/NUGET_PACKAGES, the pinned RC2 SDK plus .NET10 runtime, and a private pre-commit installation. No restricted home path was granted or redirected. Harness223 tests pass with1 intentional skip; combined lint, static contracts, Kiota generation parity and reconciliation pass. API1306 pass/178 conditional skips/0 failures. Live endpoint parity passes on a disposable API/PostgreSQL fixture, removed afterward.
- Full browser terminal:631 passed/47 skipped/4 failed out of682 at4 workers. All83 affected Browse/Discovery/gesture cases pass. Three failures are explicit telemetry live-qualification preflights lacking owned-receiver inputs; no receiver credentials were fabricated or production endpoints used. The unchanged LibraryToast auto-dismiss test exceeded its6s wait under load, but passed unchanged in isolation and in the earlier2-worker aggregate. Failed-run evidence is retained; this is not an all-green aggregate claim.
- Real PostgreSQL stage:195 passed/9 failed/0 skipped; record .task/database-tests/runs/501d56934ff0495198955dc609836ee4/result.json. All failures are in unchanged GroceryExtraRecoveryPostgresTests, whose lines21–24 hard-code backup/live roots under Environment.SpecialFolder.UserProfile. The cloud user home is read-only. No supported fixture-root override exists, and no unrelated fixture or expectation was changed. This remains a required qualification gap.
- Alex authorized integration into his branch after the focused results were reported, without a tag or manually triggered build. Latest remote parent ac9be10360265062794a4ad2a973d5cecd3d386d adds only two Synology release-template edits over beta17. Preserve them and revalidate the unchanged gesture files after applying the patch on that parent. Physical-device task4.2 and aggregate acceptance task4.3 remain open; branch integration does not declare release readiness.
