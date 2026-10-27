# Android grocery composer investigation — 2026-10-26

**Current result:** physical A/B/A testing isolated the viewport-policy/layout interaction on the identified synthetic Chrome-tab route. Effective content resizing restored visibility; returning to the original policy restored obstruction. Smallest proposed correction: add `interactiveWidget: 'resizes-content'` to the root viewport export. No implementation. See the final findings below.

Initial investigation checkpoint (preserved): the historical physical Chrome-tab obstruction is confirmed by the supplied screenshot, but its cause remains unisolated. No fresh physical check has been performed in this investigation. Source findings below are hypotheses, not Android runtime observations. No implementation is proposed as ready to apply.

## Entry and preservation

HEAD `e680fb7966978da3fbde25453a241c7e69e2b2a1`, branch `main`, empty index. Nine tracked unstaged files at entry: Taskfile.yml; GroceryExtraPostgresTests.Live.cs; data-backup-and-recovery, demo-household, grocery-shopping and household-live-updates canonical specs; grocery-extras-live.spec.ts; weekStore.ts; weekStore.test.ts. Existing untracked audit/qualification packages, two October 26 archives, openspec_audit.py and its tests remain existing work.

Expanded status, staged/unstaged binary patches and 2,411 entry file hashes are recorded in `.task/grocery-extras-android-investigation-2026-10-26/`. The new report is the only intended nonignored addition. Historical evidence and markers are preserved. No checkout, reset, stash, dependency installation, commit, PR or product edit. No services, containers or gateways were started/stopped; no household data, household credentials or persistent network/security settings were accessed or changed.

Read AGENT.md and its applicable context/host, mission, contract/testing, execution and topology owners; Next.js QA skill and PWA instructions; both full canonical grocery-shopping and household-live-updates specs; the [physical qualification](grocery-extras-android-2026-10-26.md) and [live qualification](grocery-extras-live-2026-10-26.md). Inspected the historical screenshot, screenshot receipt, runtime manifests, preservation record, preflight, user observations, startup diagnostics, route/gateway records, seed and owned workflow/gateway source. The former documentation verification record `a793608851b64656a9c663ad59fd6607` remains evidence for its own inputs only.

## Evidence and tested identity

- **User-reported:** Pixel 10, Android 17, October 5 security update, Chrome 155.0.8059.87, default keyboard, repeated hidden/half-hidden Add, and different behavior in an unidentified installed app. Exact Android build and keyboard identity remain unconfirmed.
- **Supplied screenshot, inspected here:** retained 1080×2424 image with SHA-256 `d6fd8c1c26b1fff87d19cee8995229f17ad4f1d188c14bdb29dc0479dabd211b`. Chrome browser chrome, synthetic rows 08–12, Coffee input and Add lower portions covered by keyboard. The Next badge additionally overlaps the input's left side. The badge's visible footprint does not explain the right-side Add coverage. No household-history tray is visible.
- **Historical agent runtime evidence:** synthetic HTTP LAN gateway to loopback Next development/API/disposable PostgreSQL. Source identity `a1896f53122483d20be12c94fe879c599906bc8cc1a7284d1f8319f84e143e0e`, Node v26.12.0, Next 16.4.2, .NET 11.0.100-rc.2.26504.105. Historical manifest comparison in this investigation found no source-file drift. Historical cleanup records report owned resources removed/stopped; no new live listener or device-receipt claim is made.
- **Current agent observation:** source/evidence review only; adb is not on PATH. Pixel availability and an already authorized debugging connection were requested, with settings left unchanged. No answer or phone telemetry has yet established a new physical session. Lack of adb alone does not rule out user-guided LAN diagnostics.

Historical reproduction: in the current-week narrow grocery view with twelve scrollable synthetic extras, focus composer and type Coffee; dismiss/reopen keyboard. User reported repeated obstruction, supported by the supplied screenshot. No phone Add request or successful phone save is established. Neither desktop diagnostics nor the two-client live test qualify keyboard geometry.

## Ordered source trace and hypotheses

1. `pwa/src/app/(app)/planner/page.tsx` (Planner narrow branch) renders GroceryList inside motion.div, entering from x=20 and animating to x=0. The outer Planner main clips horizontal overflow. A transformed ancestor can become a fixed descendant's containing block under the [CSS transform model](https://www.w3.org/TR/css-transforms-1/#transform-rendering). However, installed motion-dom's build-transform emits `none` for default transform values. Therefore JSX animation alone does not prove a persistent transformed containing block. Record computed transform, translate, will-change, contain and geometry after animation settles and while keyboard opens before blaming this wrapper.
2. [GroceryList](../../pwa/src/components/planner/GroceryList.tsx), lines 578–618: narrow root is `fixed inset-0`, flex column; list content is `flex-1 overflow-y-auto`. Lines 940 onward: composer is a normal-flow sibling, `relative ... p-3`, with 48px input/Add; it does not consume visualViewport height/offset or safe-area padding. The suggestion tray is positioned upward from that composer. Hypothesis: the surface remains bounded by a larger layout viewport while keyboard reduces/pans the visible viewport. The browser may pan enough to expose the caret while leaving lower control portions obscured. Actual physical dimensions are missing.
3. [Root viewport](../../pwa/src/app/layout.tsx), lines 46–53, has viewportFit cover but no interactiveWidget setting. [Chrome's documented keyboard behavior](https://developer.chrome.com/blog/viewport-resize-behavior) describes visual-only resizing by default and an opt-in content-resizing policy. This supplies an experiment hypothesis, not proof of this Pixel/Chrome 155 behavior. Body/Layout min-h-dvh does not by itself establish keyboard-visible composer bounds.
4. `pwa/src/app/(app)/layout.tsx` (app notification layer) uses [useVisualViewportOffset](../../pwa/src/hooks/useVisualViewportOffset.ts) for top notification panning only. It does not size or position GroceryList. Notification handling cannot qualify bottom composer visibility.
5. [Layout](../../pwa/src/components/common/Layout.tsx) reserves navigation and safe-area space for normal content. Narrow GroceryList is a separate fixed surface; its own geometry must be measured. No broad Layout rewrite is supported by this evidence.
6. Historical gateway bootstraps test cookies/storage then navigates to the actual Planner document. Its bootstrap viewport tag is not evidence of the final Planner metadata. The gateway and C# fallback proxy responses without an intentional grocery CSS/layout rewrite. Origin/Host adaptation, HTTP origin, development overlay and browser display mode remain runtime differences that need physical isolation. The HMR omission was corrected and physical app entry succeeded historically; that explains initial white screen, not a demonstrated keyboard cause.

No API/DTO/persistence or household-live-update mismatch has been traced as a cause of the geometric obstruction. No backend change is proposed.

## Next physical check — one step at a time

First establish Pixel availability and the existing connection method. Then recreate only the owned synthetic stack in a **new evidence directory**, without reusing historical STOP/ready/hold paths or overwriting failed records. Reuse installed dependencies and database_environment, discard configured PostgreSQL connections, and retain per-file/runtime/container identities. Do not start a timed hold while physical availability is unknown.

The first consequential check is an unchanged Chrome-tab baseline: open the identified synthetic current-week grocery surface in portrait, allow entry animation to finish, then focus and type Coffee without submitting. Capture physical screenshot and, if an existing authorized inspection route permits, before/after `innerHeight`, document clientHeight, visualViewport height/offsetTop/scale, scroll position, actual viewport metadata, display-mode matches, secure-context/UUID availability, control/surface bounding rectangles and containing-block ancestor styles. Compare input/Add bottom against visualViewport offsetTop + height in layout coordinates. Record whether the phone reports partial coverage even if the browser metrics claim visibility. Do not derive actual keyboard bounds from desktop emulation.

Only after that result choose one distinguishing check:

- If the surface extends below the measured visual bottom with no transformed containing ancestor, test a session-only viewport-policy diagnostic, separately from any product edit. If content resizing alone restores both controls, evaluate the smallest metadata policy change and its wider impact; otherwise evaluate grocery-local visualViewport sizing/offset with an independently scrollable list.
- If a non-none ancestor transform or other containing-block trigger is present after settling, isolate that one factor using a reversible diagnostic on the phone before proposing moving the fixed surface outside that wrapper or changing its animation. Do not bundle wrapper and viewport changes.
- If the development overlay may contribute, hide only that overlay in a diagnostic session and repeat. Treat removal of the left badge separately from input/Add keyboard coverage. A source-identified production runtime on the same synthetic origin is a later distinguishing check if needed; do not install dependencies or overwrite existing build artifacts.
- Compare browser and installed modes only with the same source/runtime identified on synthetic data. Do not use the unidentified installed household app as a control. Obtain its identity only if that comparison becomes necessary.

These are conditional next experiments, not performed checks or authorized implementation. Preserve focus, existing controls and list scroll in any eventual smallest correction. Do not add speculative bottom margins or a responsive redesign.

## Origin and save boundary

Geometry-only typing needs no save. Before testing Add, establish a suitable origin and verify `isSecureContext` and callable `crypto.randomUUID` on the physical target. The current creation path calls randomUUID before its request try/catch; failure on insecure LAN HTTP could prevent POST and must not be recorded as a product save failure. Prefer an already authorized USB loopback route or a trusted HTTPS route to the owned synthetic stack, without trust installation, browser flags, persistent security changes or household services. If neither is available, record secure-origin save qualification blocked and retain geometry findings separately. No secure origin has been established in this investigation.

## Current disposition and proposed correction

**Cause:** unresolved between application viewport geometry, a containing-block effect, browser/display-mode behavior and development/runtime-route interaction. The screenshot supports partial obstruction; it cannot assign exclusive causation. The temporary route's white screen is a separately explained environment failure. No installed-app regression is established.

**Smallest proposed correction:** conditional only. If physical measurements confirm viewport mismatch, bound the narrow grocery surface to the keyboard-visible viewport, retaining a separately scrollable list and existing focus behavior. Select metadata policy versus local geometry only after the single-factor physical result. If a containing-block trigger instead explains the result, correct that narrow wrapper relationship. Hiding the Next badge alone is insufficient evidence of a composer correction. Owners: GroceryList, Planner narrow wrapper and root viewport; notification and Layout owners are dependencies to inspect, not changes recommended now.

**Exact current blocker:** no fresh physical session/viewport measurements or controlled comparison; awaiting the device-availability/connection answer. Source inspection cannot resolve the requested physical attribution. Stop before implementation; this is an investigation checkpoint, not completed diagnosis or Android acceptance.

- **Passed:** entry HEAD/index capture, complete canonical/evidence review, source-manifest drift comparison (none), scoped source trace, screenshot inspection. Documentation verification is separate and reported with its own immutable record.
- **Failed:** historical repeated physical reachability and initial HMR gateway setup remain failed records. No new physical test was run or failed.
- **Blocked:** fresh physical attribution pending device/connection answer; save qualification additionally requires a suitable physical origin.
- **Skipped:** no executed checks silently skipped.
- **Not run:** new phone reproduction, physical viewport/ancestor telemetry, single-factor diagnostics, source-identified installed mode, production-runtime comparison, Add/focus/save and other physical acceptance checks; no new application tests.
- **Not applicable:** implementation, red/green correction tests, contract generation, migrations, commits/PRs and historical checkbox completion.

Initial documentation verification failed because its link checker parsed parentheses in two app-route paths as link terminators. Those two references now use literal source paths. The failed record `.task/agent-finish/runs/5c61daa3c587494e8a99a1f6b764d798.json` is retained; this was documentation-checker compatibility, not Android evidence.


## Physical-connection continuation checkpoint

The sections above retain the initial findings and initial verification history. After that checkpoint, the user confirmed Pixel availability and an already authorized USB connection, selected Chrome USB inspection, reported accepting the current session, reported reconnecting with Pixel unlocked/Chrome open, and explicitly requested another USB retry. No Wi-Fi pairing code was provided or used.

**Agent-observed USB result:** Chrome guest inspection reports remote debugging unavailable in Incognito mode. The owned guest window was closed and a normal Chrome inspection tab opened. Discover USB devices was already enabled. Chrome reports the device as Offline / Pending authentication, including after page refresh and after toggling USB discovery off/on to its original checked state. No inspectable Pixel tab, physical viewport measurement, exact browser runtime identity or keyboard geometry was obtained. User-reported prompt acceptance and agent-observed pending authentication remain distinct. The latest question about whether a phone-side prompt is presently visible was unanswered at cleanup; absence of an answer is not a device observation. No authorizations were revoked and no phone security/network settings were changed.

**Owned setup, separate from phone acceptance:** reused installed dependencies and the existing disposable database/live fixture in a new `.task/grocery-extras-android-investigation-2026-10-26/usb-attempt-1/` directory. Discarded any configured PostgreSQL connection. The live prerequisite reached its hold checkpoint; seeded four checked Milk-history names and twelve outstanding Android fixture rows through the real isolated API. Suggestion query returned 200. Owned API/PWA remained loopback; temporary LAN gateway retained the historical phone/Mac allowlist and HMR forwarding. Agent HTTP checks returned 200 for bootstrap, Planner document and collector script. These are setup checks, not phone entry/keyboard checks.

A diagnostic gateway variant was prepared to append a geometry-only script, without changing product source, CSS, viewport metadata or layout. Its collector records viewport/control/ancestor geometry and deliberately avoids input text, cookies and storage. Diagnostic script/gateway hashes are recorded separately from the unchanged product source manifest. The user was offered one keyboard-closed synthetic entry check but then steered back to USB. No phone collector records or new physical entry/reproduction results were received. The LAN HTTP origin was never qualified for saves; no physical Add test occurred. No conclusion about the original obstruction follows from this setup.

All owned gateway/PWA/API/test processes exited, the disposable container was removed, and owned listener closure checks passed. The live prerequisite exited zero and source_stable remained true. Runtime manifests, seed, HTTP prerequisite results, diagnostic identity, USB/user observation records and cleanup checkpoint are retained in that new attempt directory. Historical Android/live evidence directories and failed records were not rewritten.

**Updated blocker:** Chrome USB authentication remains pending despite user-reported authorization/reconnection; adb remains absent from PATH and the inspected common locations, with installation prohibited. No physical telemetry or controlled comparison exists to select a correction. No Wi-Fi pairing attempted. Further checks await a usable physical route; the conditional correction and source owners above remain hypotheses. No implementation.

- **Passed:** isolated live/setup prerequisite, synthetic seed/suggestion API, agent HTTP prerequisites, source stability and owned cleanup.
- **Failed:** USB connection attempts did not reach an inspectable target; guest-mode inspection was unavailable. Historical reachability/HMR failures remain preserved separately.
- **Blocked:** physical attribution by unavailable USB inspection; secure-origin save qualification remains unavailable.
- **Skipped:** no executed checks silently skipped.
- **Not run:** new physical entry/keyboard baseline, collector telemetry, controlled layout/tooling/mode comparisons, phone Add and Wi-Fi pairing.
- **Not applicable:** implementation, regression red/green, API/client/schema changes, commits and PRs.


## Final physical findings — controlled viewport-policy comparison

### Reproduction and identity

The user confirmed current physical synthetic app entry, then reported input and Add “half covered like in the picture above” while typing Coffee. This is a **new user-reported physical reproduction**, separate from the original supplied screenshot. No new screenshot or direct agent operation of the phone was obtained. Agent-observed runtime evidence is the geometry-only collector executing in that phone's Chrome tab and posting to the owned gateway; it is not desktop emulation. User reported seeing autocomplete for the first time, but its position/identity was not established, so no household suggestion-tray acceptance follows.

New evidence lives under `.task/grocery-extras-android-investigation-2026-10-26/lan-attempt-2/`: runtime.json/runtime-final.json, physical-geometry.jsonl, geometry-final-summary.json, observations.jsonl, gateway-events.jsonl, all diagnostic gateway/script variants and hashes, seed.json, HTTP prerequisite checks, diagnosis.json, stack.log and stack.trx. Product source identity again matches `a1896f53122483d20be12c94fe879c599906bc8cc1a7284d1f8319f84e143e0e`; source_stable=true. Runtime remains Node v26.12.0, Next 16.4.2 and .NET 11.0.100-rc.2.26504.105 with the disposable database workflow. Full per-file/container identities are retained in those manifests. Source HEAD remains `e680fb7966978da3fbde25453a241c7e69e2b2a1` on main, empty index.

Physical mode is browser tab by runtime display-mode measurement, with Android mobile Chrome reduced UA and the same previously observed phone peer. Pixel/Android/full Chrome version remain user-reported as previously recorded, rather than newly measured system versions. Exact keyboard app/version and Android build remain unconfirmed. Installed-app identity remains unknown and no installed-app regression is established.

### Controlled results

All three effective comparisons retained the same physical phone/browser, synthetic household/seed, LAN origin, development runtime, grocery controls, Planner wrapper and geometry collector. Only the diagnostic viewport policy changed; no product source or CSS changed. No phone save was attempted.

| Physical phase | User-reported visibility | Agent-observed phone geometry after keyboard opens |
|---|---|---|
| A: original viewport setting | Input/Add half covered | One original viewport tag; layout/client height about 801px; grocery surface 801.524px. Visual viewport height 472.762px with offsetTop 328.762px. Add bounds 741.524–789.524px. All ancestor transforms `none` after settling. |
| B: effective content-resizing diagnostic | Both fully visible | Runtime viewport tags consistently contain interactive-widget=resizes-content. Layout/client height about 436px; visual viewport and fixed grocery surface 436.571px; offsetTop zero; Add bounds 376.571–424.571px. All ancestor transforms `none`. |
| A again: original setting restored | Partly covered again | One original viewport tag; layout/client height returns to about 801px; visual viewport 472.762px with offsetTop 328.762px; Add again 741.524–789.524px; ancestor transforms `none`. |

Raw times identify the effective B keyboard samples around 20:25:40–20:25:50 UTC and reversal A around 20:26:25 UTC. geometry-final-summary.json retains original per-record indices, received/phone times, metadata and geometry; collector sequence numbers restart on navigation and are not globally unique.

Baseline metrics alone would have misleadingly placed Add 12px inside the reported visible bottom even while the user saw half coverage. This discrepancy is retained; no physical keyboard edge was measured from a new screenshot and no undocumented Android/IME mechanism is asserted. The decisive evidence is the **physical visibility reversal plus actual layout-resizing change**, rather than a rectangle-only visibility assertion.

The wrapper briefly had a non-none transform during grocery entry animation, with a zero-height containing block and displaced controls. After settling, all ancestor transforms were none in both covered baseline and visible content-resizing phases. That transient observation is preserved but does not explain the repeated settled keyboard obstruction; no wrapper correction is recommended for this finding.

### Failed/unqualified diagnostic attempts remain preserved

The query-selected first variant did not load on the physical target; the phone retained baseline metadata. A subsequent requested refresh produced no new Planner document/collector restart in observed traffic. Both “Still partly covered” reports remain baseline/unqualified-policy observations, not failures of a policy that was not active.

The distinct /resize route then delivered rewritten HTML metadata, but Next's head reconciliation added a second tag with the original setting, and layout height still did not resize. The report of continued coverage in that phase is preserved, with effective content-resizing not established. Finally, a **temporary diagnostic script** reconciled only viewport metadata on all runtime tags; phone telemetry then confirmed content resizing, and user visibility changed. This observer was experiment machinery in the ignored evidence directory, not a product fix. The duplicate-tag situation was introduced by rewriting server HTML without changing the React-owned metadata; the proposed source correction belongs in the existing viewport export so the normal head owner emits the selected setting.

### Cause and smallest correction

**Evidence-supported cause in this tested mode:** the application's layout-viewport-sized fixed grocery surface interacts poorly with Chrome's original visual-only keyboard resizing/panning policy. A controlled effective content-resizing policy removes the obstruction, and restoring the original policy returns it. This supports the application/browser viewport interaction as the actionable cause, without inventing an exact IME overlap calculation.

**Development tooling:** the same Next development runtime/indicator remained present in successful B. The badge's separate left-input overlap and the previously corrected HMR white screen are not sufficient causes of this settled right-side Add obstruction. Production-runtime parity was not tested.

**Temporary route:** the same gateway/origin/seed produced both failure and success. Route replacement, secure-origin changes and backend changes were unnecessary to restore reachability in this comparison. This isolates a policy correction within the owned route; it is not qualification of every production gateway, service worker or display mode.

**Browser versus installed mode:** browser-tab identity is measured, but no source-identified installed build was compared. The user's installed-app difference remains a report, not causal proof or a regression claim. That comparison is unnecessary to select this bounded proposal.

**Smallest supported proposed product change:** add `interactiveWidget: 'resizes-content'` to the existing `viewport` export in `pwa/src/app/layout.tsx`, alongside width/scale/viewportFit. This is a proposal only. It lets Chrome resize the layout that already bounds the fixed flex grocery surface and its independently scrolling list. The controlled test supports this policy before a more complex GroceryList visualViewport hook, wrapper change or arbitrary keyboard margin. No property, observer or CSS was added to product files.

Primary correction owner: root viewport configuration, line 46 onward. Affected consumers: GroceryList narrow fixed surface/list/composer (lines 578, 618 and 940 onward) and Planner narrow animated branch (line 569 onward). Existing notification offset handling remains a separate owner. Because root viewport policy affects other keyboard surfaces, implementation acceptance would need physical Add focus-retention, suggestion tray/confirmation visibility and relevant other keyboard journeys, plus a source-identified installed PWA separately if included in the implementation scope. Those are future acceptance checks, not additional work performed here.

### Origin, cleanup and dispositions

The physical collector measured isSecureContext=false and crypto.randomUUID undefined on the plain HTTP origin. Geometry checks only; no physical Add/create requests were observed by the gateway. Secure-context-dependent creation was neither tested nor called a product failure. No household/development data or credentials, shared services, dependency installations or persistent network/security settings were used/changed. USB remained authentication-blocked; no Wi-Fi pairing occurred.

All owned API/PWA/test/gateway processes exited, disposable container removal was recorded, owned ports were checked closed, live prerequisite exited zero and source stability passed. No historical marker or failed record was rewritten. Earlier sections are chronological checkpoints superseded only by these new findings; they remain preserved.

- **Passed:** new user-reported physical baseline reproduction; agent-observed physical browser geometry/metadata; effective B visibility and A reversal; setup/live prerequisite; synthetic seed/API and HTTP prerequisites; source stability, preservation and owned cleanup. Final documentation verification has its own immutable record, reported separately.
- **Failed:** original-policy reachability in initial and reversed physical checks; retained USB connection attempts. These failures are not erased by diagnostic B success.
- **Blocked:** USB inspection/authentication and secure-origin save qualification. Neither blocks the completed viewport-policy diagnosis.
- **Skipped:** no executed check silently skipped.
- **Not run:** physical Add/focus retention, saves, suggestion identity/selection, saved-section toast, interruption/reconnect behaviors, new physical screenshot, exact keyboard/build collection, source-identified installed mode and production runtime qualification. Invalid policy attempts above are explicitly unqualified, not passes.
- **Not applicable:** product implementation, implementation red/green, API/client/schema changes, commits/PRs or historical task completion.

Stop after diagnosis and this smallest correction proposal. No implementation performed.
