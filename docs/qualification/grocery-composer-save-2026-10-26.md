# Physical Android grocery composer saves — 2026-10-26

**Current result:** the user confirms all four workflow checks pass in the current installed app, reported build **0.1.32**, with its backend. These are user observations, recorded below. The separate owned synthetic attempt remains blocked before fixture launch or physical Add; its original findings and records are preserved. No product change is proposed or implemented.

## Scope and preserved baseline

This is a new prerequisite-only attempt following the passed bounded [viewport correction](grocery-viewport-correction-2026-10-26.md) and the final physical findings in the [Android investigation](grocery-extras-android-investigation-2026-10-26.md). Those reports and every historical failed record and marker remain unchanged. Their earlier physical visibility/reopen passes do not qualify saves on this attempt.

Entry HEAD: `e680fb7966978da3fbde25453a241c7e69e2b2a1`; staged diff empty. Eleven tracked unstaged files existed: Taskfile.yml; GroceryExtraPostgresTests.Live.cs; the data-backup-and-recovery, demo-household, grocery-shopping and household-live-updates canonical specs; grocery-extras-live.spec.ts; grocery.spec.ts; layout.tsx; weekStore.test.ts; weekStore.ts. Existing untracked audit/qualification packages, two October 26 archives, openspec_audit.py and its test remain existing work.

Fresh evidence directory: `.task/grocery-composer-save-2026-10-26/attempt-1/`. `entry.json` records expanded staged/unstaged/untracked status and 2,499 file hashes, including both prior evidence trees. `staged.patch` and `unstaged.patch` retain entry diffs. Only this new qualification document is added outside ignored evidence; no existing document is edited.

The canonical [grocery-shopping requirements](../../openspec/specs/grocery-shopping/spec.md) were reviewed for free-text creation, stable submission identity, selected-section confirmation, persistent bottom composer, Add focus/keyboard retention and dismissal/reopening. No requirement, task checkbox or application source is changed.

## Device and origin preflight

Actual user observation: in response to the availability/USB question, **“Available without USB”**. This confirms availability without a cable route; it does not establish the phone's current origin, browser-tab identity, keyboard state or runtime capabilities.

Separate agent UI observations: the existing normal Chrome `chrome://inspect/#devices` page initially displayed stale Offline / Pending authentication information. After Reload, USB discovery remained enabled but no remote Pixel/device target was shown. No device settings, discovery settings or forwarding rules were changed. No phone tab was inspected or operated.

Separate capability checks: `adb` was absent from PATH and the checked Homebrew, `/usr/local/bin`, user Android SDK and Android Studio platform-tools locations. `cloudflared`, `ngrok`, `tailscale`, `mkcert` and `caddy` were absent from PATH. These bounded checks do not establish that every possible secure route is impossible; they establish no usable route with the capabilities identified for this attempt. No credentials, certificate stores, household/development services or their data were accessed to seek an alternative.

The prior physical origin was plain LAN HTTP and reported `isSecureContext=false` and `crypto.randomUUID` undefined. That historical telemetry is not a new phone measurement. Reusing it for Add would leave the known prerequisite unresolved. No trusted HTTPS synthetic origin or USB loopback route was established, and no save was attempted.

## Source/runtime and evidence boundaries

`runtime-preflight.json` retains the per-file source manifest and source digest `16ff47651410950d9cfbbec3984f61754a0a8c850d088ba41dee7d9456dc2443`, matching the prior corrected-source physical attempt. This is source identity only: no new API/PWA/database/browser application runtime was started or identified. No fresh disposable fixture was created because secure-origin establishment failed first; historical fixtures were not resumed or reused.

`observations.jsonl` separates the actual user reply from agent UI and tool observations. `disposition.json` records individual results. No new physical telemetry, screenshot, accepted submission, persistence read or keyboard geometry was obtained.

| Disposition | Result |
|---|---|
| Passed | Entry baseline; selected requirements/evidence review; corrected-source digest comparison; preservation and no-owned-resource cleanup checks. Documentation verification is separate evidence below. |
| Failed | No new product test failed. Historical failures remain preserved in their original records. |
| Blocked | Secure-origin prerequisite: Pixel available without USB; no current inspectable USB target or established trusted HTTPS route to an owned synthetic fixture. |
| Skipped | None. |
| Not run | Fresh fixture launch/seeding; actual-phone synthetic origin/tab, secure context/UUID, hydrated single source-generated viewport tag and keyboard visibility preconditions. |
| Not run — check 1 | Tap Add; focus and keyboard retention; exactly one saved row; cleared field. |
| Not run — check 2 | Saved-section confirmation visible above keyboard without scrolling or focus movement. |
| Not run — check 3 | Second distinct item; keyboard dismiss/reopen; continued composer reachability. |
| Not run — check 4 | Reload and exactly one persisted row per accepted submission. |
| Not applicable | Product correction, implementation red/green, API/schema/client changes, historical task completion, installed-PWA/production qualification. |

## Cleanup, verification and stopping point

No owned service, gateway, tunnel, container, listener, browser tab or fixture was created. There is no owned runtime to stop; the pre-existing Chrome inspection tab remains open. `cleanup.json` records that empty owned-resource inventory. `preservation.json` verifies entry-file hashes, prior evidence and markers, HEAD and both entry diffs remain unchanged. No checkout, reset, stash, dependency/certificate installation, persistent network/security change, shared-service stop, commit, deployment or PR occurred.

Scoped documentation verification: `task verify -- docs/qualification/grocery-composer-save-2026-10-26.md`; output and immutable record path are retained in the fresh evidence directory's `documentation-verification.log`. This checks documentation only and cannot establish physical acceptance. Stop at this origin blocker; the four save checks remain unqualified.

## Subsequent user confirmation — installed build 0.1.32

The preceding sections describe the isolated synthetic attempt at its stopping point. Subsequently, the user reported that the current installed app and backend work well. After the four checks were explained, the user replied **“1 confirmed / 2 yes / 3 yes / 4 yes”**, then identified the installed build as **0.1.32**.

| Check | Actual user-reported result |
|---|---|
| 1 — Add | Passed: one row saves, the field clears, and focus and keyboard remain open. |
| 2 — Confirmation | Passed: saved-section confirmation is visible above the keyboard without scrolling or moving focus. |
| 3 — Continue | Passed: another distinct item can be added; dismissing and reopening the keyboard leaves the composer reachable. |
| 4 — Reload | Passed: both accepted items persist exactly once after reload. |

These confirmations support the reported workflow in installed build 0.1.32. The agent did not access that installation, its data or backend, and did not obtain telemetry, screenshots, source-to-build mapping, backend runtime identity or direct persistence reads. The data used for these user checks was not identified as the owned synthetic fixture. Secure context/UUID and hydrated viewport metadata were not newly measured. These observations do not constitute source-identified installed-PWA or production qualification and do not convert the blocked synthetic checks into passes.

Fresh evidence: `.task/grocery-composer-save-2026-10-26/user-confirmation-1/observations.jsonl` retains the exact user replies separately from the earlier agent evidence. That directory also retains the report before this update, entry HEAD/status/diffs and a separate documentation-verification log. Historical attempt records, failures, markers and task checkboxes remain unchanged. No additional testing or product correction is indicated by these reported passes; isolated synthetic qualification is deferred.
