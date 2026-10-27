# Grocery extras physical Android qualification — 2026-10-26

Qualification stopped after a reproducible, mode-bounded reachability failure: the on-screen keyboard partially covers the extra-name input and Add button in the current-source synthetic Chrome browser-tab session. User repeated the observation; the supplied physical-device screenshot confirms it. No product correction was implemented. The six requested checks are not collectively passed.

## Scope, entry and preservation

Entry/final HEAD: `e680fb7966978da3fbde25453a241c7e69e2b2a1` on main; index empty. Entry inventory: nine tracked unstaged files (Taskfile.yml; GroceryExtraPostgresTests.Live.cs; canonical data-backup-and-recovery, demo-household, grocery-shopping and household-live-updates specifications; grocery-extras-live.spec.ts; weekStore.ts and weekStore.test.ts). Existing untracked audit/qualification packages, October 26 management-status and version-reconciliation archives, inventory script and its tests are preserved.

Exact expanded inventory, staged/unstaged binary patches and 2,410 entry file hashes are retained in `.task/grocery-extras-android-2026-10-26/`. All entry hashes match at closure; HEAD/index unchanged. The only new nonignored repository file is this report. No checkout, reset, stash, dependency installation, commit, PR, production-code change, archive-marker change, shared-service stop, household/development data access or persistent network/security configuration change occurred.

Reviewed AGENT.md and applicable loading owners, [current live evidence](grocery-extras-live-2026-10-26.md), [acceptance review](../audits/openspec-architecture/GROCERY_EXTRAS_ACCEPTANCE_REVIEW.md), full canonical grocery-shopping, household-live-updates, data-backup-and-recovery and scheduled-maintenance specifications, and the October 24 archive proposal/design/tasks/evidence/lifecycle disposition. Historical failed records and seven incomplete archive tasks remain unchanged. Prior repository verification `e7a5dcd9a18b44f99bcafaf57c05215b` reports automated checks passed with task acceptance not evaluated; it is not Android evidence.

## Device and attribution

| Attribute | Recorded value | Evidence |
|---|---|---|
| Device | Pixel 10 | User-reported |
| Android | 17; security update October 5, 2026 | User-reported; exact build unreported |
| Browser | Chrome 155.0.8059.87 | User-reported; Chrome browser chrome visible in screenshot |
| Keyboard | Default keyboard; EN/FR spacebar and suggestion strip visible | Exact app/version unconfirmed; do not infer app identity from appearance |
| Mode | Chrome browser tab, synthetic LAN HTTP origin | Screenshot and gateway traffic; installed-PWA mode unrun |
| Installed app comparison | User reports different behavior in installed version | Installed source/runtime identity unknown; no installed-version regression established |

User reports: initial white screen; corrected route “it worked”; “the keyboard is hiding the add button”; after being asked to dismiss/reopen, “it is half hidden now”. The agent observed gateway requests and source/runtime metadata, and visually inspected the user-supplied screenshot. The agent did not operate or directly observe the live phone. Network frame forwarding is not proof of device receipt or state application. The reduced user agent contains an Android 10 placeholder and Chrome 155.0.0.0; it does not override the user-reported OS/full browser version.

Screenshot: original `/Users/alex/Downloads/Screenshot_20261026-153708.png`; retained copy and SHA-256 receipt in `.task/grocery-extras-android-2026-10-26/`. Original resolution 1080×2424; screenshot clock 3:37 PM. It shows synthetic rows Android fixture 08–12, the focused composer with Coffee text, and keyboard covering lower portions of both input and Add. The keyboard's own suggestions are not household-history suggestions. The Next development indicator also appears near the field's left edge; this does not establish the right-side Add obstruction's cause.

## Owned source/runtime and safe route

Reused the installed live fixture and `database_environment`; discarded any configured PostgreSQL connection. Disposable PostgreSQL and synthetic members/data only. Source identity `a1896f53122483d20be12c94fe879c599906bc8cc1a7284d1f8319f84e143e0e` matches the prior live-qualified identity; `source_stable=true` at closure. Full per-file manifest and runtime/container metadata: `runtime.json` and `runtime-final.json` in the evidence directory. Node `v26.12.0`, Next `16.4.2`, .NET `11.0.100-rc.2.26504.105`. PostgreSQL image `pgvector/pgvector:0.8.7-pg18-trixie`, image ID `sha256:9d9c930220cb9bf2f956d10a8f909cf9973d9672ca0278aef2c1e6facccad2e0`.

The existing live scenario reached its successful hold checkpoint. Its original PWA stopped as designed; an owned PWA restarted the same loopback port for manual testing. Fixture deployment clock remained October 20, 2026, current Monday October 19; the physical browser clock was not overridden. The user saw fixture calendar dates rather than actual October 26 calendar dates.

API/PWA/DB remained loopback-only. Temporary gateway bound the Mac Wi-Fi address and admitted only the observed phone address and local Mac. Synthetic bootstrap set test cookies/family local storage; gateway blocked phone access to fixture controls, adapted Origin for the owned dev server and forwarded HTTP/SSE plus development HMR WebSocket. No router/firewall/OS trust changes. Temporary plain HTTP is a qualification limitation: it does not qualify secure-context, installed-PWA/service-worker or production gateway behavior. The creation path uses `crypto.randomUUID()`; secure-context-dependent creation on this route was not qualified, and any future Add failure here must first be separated from this environment limitation.

Synthetic seed: four checked Milk-history names, whose real suggestion API returns three matches for `mi`, plus twelve outstanding fixture rows for scrolling. `seed.json` records real API outcomes. Phone typing produced forwarded successful suggestion lookups; no phone Add submission is established. Delay/failure controls were prepared but never exercised in the physical checks.

Owned gateway, PWA, API/test process, probe and disposable database were stopped; the database container is recorded removed. Listener checks found the three owned gateway/API/PWA ports closed. No shared process or service was stopped.

## Checks and observations

| Requested check | Disposition | Actual steps and observations |
|---|---|---|
| 1. Keyboard remains open and entry focused when Add tapped | Blocked | Opened synthetic app, entered grocery view, focused composer and typed Coffee. User reports keyboard hid Add; on repeat Add was half hidden. Screenshot confirms partial obstruction. Add was not exercised, so no keyboard-cycle/focus-retention pass. |
| 2. Saved-section confirmation visible during keyboard panning | Not run | No successful physical Add/confirmation. Screenshot of a keyboard alone cannot qualify toast positioning. |
| 3. Household tray above composer, at most three rows, input/Add reachable | Failed reachability; tray not run | Physical screenshot confirms input/Add are partly covered. `mi` household tray was not exercised; three API results alone do not qualify physical tray layout. |
| 4. Suggestion fills without submitting; free text usable | Not run | No physical household suggestion selection or free-text submission. Typing Coffee alone does not qualify this check. |
| 5. Understandable pending/saved/error after interruption | Not run | No controlled phone background/foreground during an operation; no delay/error injection used. |
| 6. Missed-update reconnect/read recovery retains grocery week | Not run | Physical missed-update/recovery sequence not attempted. Prior live two-client success remains separate. |

## Finding and smallest proposed correction

**Classification:** reproducible current-source browser-tab reachability failure, bounded to this synthetic HTTP development runtime. This is a physical observation supported by the screenshot, not a desktop-emulation claim. Attribution to an application layout cause versus this runtime's viewport/display mode remains unisolated. The user reports the installed version behaves differently; its identity is unknown. No installed-version or production regression is established.

**Trigger:** current-week narrow grocery view with seeded scrollable rows; focus bottom extra composer, type Coffee with default on-screen keyboard; dismiss/reopen keyboard for repeat.

**Expected:** input and Add remain fully visible and reachable above the keyboard, and Add can be tapped while retaining entry focus.

**Actual:** keyboard covers the lower portions of both controls; user reported hidden then half-hidden Add. The Add-focus criterion cannot proceed normally.

**Affected source owners to investigate:** `pwa/src/components/planner/GroceryList.tsx` (narrow `fixed inset-0` surface, scrollable content and normal-flow composer); `pwa/src/app/(app)/planner/page.tsx` (animated narrow wrapper). The root viewport metadata and existing `useVisualViewportOffset`/notification layout were inspected; notification offset handling is not proof of composer geometry. Source inspection locates candidates, not a proven root cause.

**Smallest proposed correction, conditional on isolating layout causation:** bound the narrow shopping surface/composer to the actual keyboard-visible viewport and leave its list independently scrollable, preserving input focus and the existing controls. Establish the physical viewport/containing-block cause before choosing metadata versus component geometry changes. Retest this exact Pixel/browser mode and separately qualify a source-identified installed PWA on synthetic data. Do not apply an unproven broad responsive redesign. No implementation performed.

## Separate evidence disposition

- **Passed:** baseline/evidence review and preservation; Docker; user-reported LAN probe and corrected app entry; synthetic seed API checks; desktop gateway diagnostic after WebSocket correction; existing live scenario in this stack setup (one test, zero failed/skipped, source stable). These prerequisite/desktop/live passes do not imply a physical grocery acceptance pass.
- **Failed:** physical composer input/Add reachability; initial gateway setup omitted development WebSocket and produced white screen. The latter was reproduced in a desktop diagnostic, corrected only in the temporary gateway, and followed by user-reported physical entry success. Retain failed setup diagnostics as fixture/environment evidence.
- **Blocked:** physical Add-focus test by occluded controls. Broader secure-context-dependent creation is not qualified on this HTTP route.
- **Skipped:** zero in the live setup test; no selected physical check silently skipped.
- **Not run:** remaining physical behaviors as listed above; installed PWA; exact keyboard app/version and Android build collection. Stopped after the repeated visibility finding without claiming completion.
- **Not applicable:** implementation/red-green cycle, contract/client generation, migrations/backup/restore, historical task completion.

No historical checkbox or failed record is superseded by this session. Repository documentation verification is separate from Android acceptance and is reported with its exact immutable run record at completion.
