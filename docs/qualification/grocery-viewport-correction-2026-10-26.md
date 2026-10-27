# Android grocery viewport correction — 2026-10-26

Implemented the bounded correction selected by the final [physical investigation](grocery-extras-android-investigation-2026-10-26.md): `interactiveWidget: 'resizes-content'` in the existing root viewport export. Corrected-source physical Chrome-tab checks report the entire grocery input/Add visible on keyboard opening and dismissal/reopening. Source-generated metadata survives hydration without reconciliation machinery. Physical saves remain blocked separately by the insecure origin; this is not complete grocery workflow or installed-PWA qualification.

## Scope and preservation

Entry/final HEAD: `e680fb7966978da3fbde25453a241c7e69e2b2a1`; index empty. Entry had nine tracked unstaged files, plus untracked audit/qualification packages, two October 26 archives, inventory script and tests. Expanded status, binary staged/unstaged patches and 2,412 entry-file hashes are retained in `.task/grocery-viewport-correction-2026-10-26/entry.json`, `staged.patch` and `unstaged.patch`.

Only production change: one viewport property in `pwa/src/app/layout.tsx`. The canonical grocery-shopping composer requirement gains one keyboard-dismiss/reopen visibility scenario, clarifying existing reachability without changing save, suggestion, identity or recovery policy. Its pre-existing version-reconciliation scenario is preserved. Browser regression coverage is added in `pwa/e2e/grocery.spec.ts`; this report is the only new nonignored file from this task.

No API, persistence, wrapper, CSS, keyboard heuristic, visualViewport hook or production metadata observer changes. No checkout, reset, stash, dependency installation, commit, deployment, archival or PR. No household/development data or credentials, shared-service stops or persistent network/security changes. Historical [initial qualification](grocery-extras-android-2026-10-26.md), investigation, failed attempts and archive markers remain unchanged. Preservation receipts are retained in the evidence directory.

## Automated evidence

- **Red observed before implementation:** `task test:e2e -- e2e/grocery.spec.ts --grep 'source viewport policy'` failed because real Next document output lacked `interactive-widget=resizes-content`; one original viewport tag was present. `red.log` preserves the expected failed assertion.
- **Green:** same command after the single-property correction: one test passed. It checks real server document output, one unchanged viewport tag after hydrated grocery interaction, blur/refocus and reload. `green.log` retains output. Desktop focus cycles do not simulate Android keyboard geometry.
- **Preparation passed:** `task prepare -- pwa/src/app/layout.tsx pwa/e2e/grocery.spec.ts openspec/specs/grocery-shopping/spec.md`; only selected PWA files formatted. `prepare.log` retains output.
- **Repository verification passed:** explicit-path `task verify` selected the two PWA files, canonical grocery-shopping and this report's initial checkpoint. Immutable record: `.task/agent-finish/runs/c440abf8cb2d4f6b9dcff242e86dbecb.json`; tested identity `3eb476f22befff11d2c83ba7a4792f1bb657b507ab4c879e354f3ea3de59effc`. Documentation/spec validation, lint, formatting, types, unit, full impacted E2E, API and static contract checks passed; content remained stable. Unit: 97 files / 1,072 tests passed. E2E: 358 passed, 18 skipped. API: 1,249 passed, 154 skipped. Skips are not physical or relational passes. No task acceptance was inferred from the harness result. `verify.log` retains full output.
- The final report is later documentation content; its scoped documentation verification is recorded separately in `documentation-verification.log`, with its immutable run path retained there. The application sources/tests were not edited after their passing verification.

## Corrected physical source/runtime

Fresh attempt: `.task/grocery-viewport-correction-2026-10-26/physical-attempt-1/`. No historical STOP, hold, ready or diagnostic file was reused or overwritten. User confirmed Pixel availability before fixture start.

Source identity: `16ff47651410950d9cfbbec3984f61754a0a8c850d088ba41dee7d9456dc2443`, distinct from the historical investigation's `a1896f53122483d20be12c94fe879c599906bc8cc1a7284d1f8319f84e143e0e`. Full per-file manifests and runtime/container identities: `runtime.json` / `runtime-final.json`. Node v26.12.0, Next 16.4.2 development runtime, .NET 11.0.100-rc.2.26504.105. Disposable PostgreSQL image `pgvector/pgvector:0.8.7-pg18-trixie`, image ID `sha256:9d9c930220cb9bf2f956d10a8f909cf9973d9672ca0278aef2c1e6facccad2e0`. Live fixture clock October 20, current week October 19; phone clock not overridden. Setup's real live browser prerequisite passed and exited zero after hold release.

Only owned synthetic members/data: four checked Milk-history names and twelve outstanding Android fixture rows. API/PWA/DB remained loopback; temporary allowlisted LAN gateway admitted the same phone peer `192.168.1.126` and local Mac. It forwarded development HMR and appended a read-only geometry collector. It did **not** rewrite viewport HTML, reconcile metadata, observe/mutate head tags or change CSS. Collector hashes, raw geometry, gateway events, seed/API outcomes and HTTP prerequisite receipt are preserved. Agent HTTP preflight returned 200 and one source-generated viewport tag containing the correction.

Physical mode is Chrome browser tab by telemetry and user-guided entry. Pixel is user-reported; prior Pixel 10 / Android 17 / Chrome 155.0.8059.87 details were not newly recollected. Exact Android build and keyboard identity remain uncollected. Installed-app identity remains unknown. No new screenshot or direct agent operation of the phone occurred; visibility results below are user reports, supported separately by phone telemetry.

## Physical observations, guided one step at a time

| Check | Actual result |
|---|---|
| Keyboard-closed entry | User confirmed synthetic fixture rows and bottom input/Add visible. |
| Source-generated metadata after hydration | Phone collector retained exactly one `interactive-widget=resizes-content` viewport tag, including 10-second and 30-second post-hydration samples. All 61 received samples retained that single policy across navigation. No diagnostic metadata override was used. |
| Grocery keyboard opening | User typed Coffee without submission; entire input and Add fully visible. Settled layout/client height about 436px; visual viewport 436.571px, offsetTop zero; input/Add bounds 376.571–424.571px. |
| Dismiss/reopen | User dismissed with Android Back, then reopened the same field; both controls still fully visible. Phone resize samples show approximately 801px → 436px with unchanged single metadata tag. |
| Household suggestions | For `mi`, user confirmed up-to-three suggestions above the field with input/Add visible. Tapping one filled the field, kept keyboard open and created no row. |
| Grocery inline editor | User confirmed Extra name and Save/Delete controls reachable with keyboard open, using scrolling; no save/delete. |
| Search input | User typed Fixture and dismissed/reopened keyboard; field stayed visible/usable without blank/stuck page. **Input visibility only:** the temporary write guard also blocked read-only `POST /api/recipes/search`; successful search-result behavior was not qualified. These 403 records remain fixture limitations, not product failures. |
| Capture URL | Synthetic `https://example.invalid/fixture` entered without saving. User confirmed field usable after keyboard dismissal/reopening and Save reachable by scrolling. |
| Capture description | Synthetic recipe name/description entered; user confirmed fields usable and Synthesize Recipe/Cancel reachable by scrolling. No synthesis. |
| Member entry | Settings Manage Family form used only Fixture member text. User confirmed Name, Add Member and Cancel reachable by scrolling after dismissal/reopening. No submission. |

Raw `observations.jsonl`, `physical-geometry.jsonl`, `gateway-events.jsonl` and `physical-summary.json` retain observations and incidental navigation/development requests, including the unqualified `/recipies` navigation. Rectangle evidence is supporting geometry, not an independent measurement of the physical keyboard edge. The earlier investigation's baseline discrepancy and transient ancestor transform samples remain preserved in their original records.

## Origin, separate dispositions and cleanup

Actual phone origin was plain LAN HTTP `http://192.168.1.149:63417`. All phone samples reported `isSecureContext=false` and `typeof crypto.randomUUID === 'undefined'`. No suitable secure origin was established within this bounded session. No physical Add/save/synthesis/member submission was requested or attempted. The temporary gateway blocked non-read API methods; zero phone API mutations were forwarded. Forwarded non-GET Next development diagnostic requests are separately retained and are not grocery saves. Synthetic seeding and the automated live prerequisite are separate from physical saves.

- **Passed:** test-first red observation and green; repository checks above; corrected-source physical metadata/hydration, grocery opening/reopening, household tray/selection, inline-editor reachability and other named keyboard-surface visibility checks; live setup prerequisite; source stability, preservation and owned cleanup.
- **Failed:** expected pre-fix browser regression test; initial fixture launch used system Python without PyYAML and failed before resource start (`launcher.log`). Existing repository virtual environment succeeded without dependency installation (`launcher-venv.log`). No new corrected-source physical visibility failure was reported. Historical product/setup/USB failures remain unchanged in their original records.
- **Blocked:** physical saves, Add focus retention during submission and saved-section confirmation by unavailable suitable secure origin/UUID. Search-result qualification was additionally blocked by the visibility-only gateway guard. These environment limitations are not product failures.
- **Skipped:** repository runners reported 18 E2E and 154 API skips. Physical checks were not silently skipped.
- **Not run:** physical save/confirmation/interruption/reconnect acceptance; successful physical search results; new screenshot, exact Android build/keyboard identity; source-identified installed-PWA, production-runtime and other-device qualification.
- **Not applicable:** API/schema/client changes or database migrations; installed-app regression attribution; historical task checkbox completion, specification archival, commits and PRs.

Owned gateway/PWA/API/test launcher exited; disposable database removal recorded. Listener probes confirmed gateway 63417, API 62817 and PWA 62810 closed. `cleanup.json` and `runtime-final.json` retain cleanup evidence, prerequisite exit zero and `source_stable=true`. No shared services were stopped. Historical evidence hashes and entry work are checked in `preservation.json`; final documentation verification does not turn blocked physical saves into passes. Stop after this correction and verification.
