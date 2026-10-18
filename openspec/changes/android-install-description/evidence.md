# Issue #274 evidence and remaining qualification

## Source and scope

Started from clean, connector-verified main `2a5ff0b62484993c14d551aac6e035cf72caec29`. No PR #285 toggle/Search changes are included. GitHub remote operations use the connector only. No production, deployment, release, Play Store or device reinstall operation was performed.

Ordered metadata path:

1. `pwa/src/lib/baseManifest.json` owns app description, ID `/`, names, start URL `/`, display/orientation, icons and shortcuts.
2. `pwa/src/lib/pdfManifest.ts` spreads the base and selects only PDF/link share transport.
3. `pwa/src/app/manifest.json/route.ts` spreads that manifest and overlays names/icon paths from `app-identity.ts`; description survives unchanged. Response is public, manifest JSON and no-store. `pwa/public/sw.js` explicitly leaves `/manifest.json` outside service-worker cache handling.
4. `pwa/src/app/layout.tsx` now reads the same base description for Next HTML metadata. Initial HTML and manifest descriptions are app-controlled; this does not establish an Android settings field mapping.
5. `app-identity.ts` keeps the same name across variants and selects production/demo/beta/beta-demo icons. This resolver, release artifact, icons, origin, manifest URL and launch behavior are unchanged.

## Documented browser boundary (retrieved 2026-10-18)

[Chrome WebAPK overview](https://web.dev/articles/webapks) explains that Chrome generates an APK from manifest/other metadata, enabling Android settings integration. It does not promise that manifest description appears in the user's unidentified settings surface.

[Chrome manifest updates](https://web.dev/articles/manifest-updates) documents launch-time checks after 24 hours, selected update-triggering properties, and WebAPK update conditions including closed app windows, power and Wi-Fi. Description is absent from the documented trigger list. Therefore a description-only change is not a supported promise of automatic installed metadata refresh. No-store controls the HTTP response, not installed-package refresh. The documentation also describes `about://webapks` diagnostics/manual update scheduling; that procedure has not been exercised here.

These are documented constraints, not observations of the user's Android/browser version. No current on-device text, OS version, Chrome version or navigation path is known.

## Automated evidence

- Red: `task test:unit -- src/lib/server/app-identity.test.ts` before production edits: 5 failed, 18 passed. Four matrix cases reported the old HTML description; the PDF-toggle case reported the old manifest description.
- Green: `task test:unit -- src/lib/server/app-identity.test.ts src/lib/pdfManifest.test.ts`: 30 passed. Assertions cover exact descriptions, existing identity matrix and PDF transport independence.
- Public HTTP/browser matrix: `python3 pwa/e2e/run-install-identity.py` passed all 10 cases / 40 browser checks. Results and per-case source/build identities: `.task/identity-T4/production-matrix/results.json`. Includes both channels × demo off/on × PDF off/on and invalid demo configuration for both channels. Channel artifact restored byte-for-byte.
- Final harness results are reported in the PR and final handoff. Automated metadata checks do not qualify Android.

Initial runtime and corrective setup: the supplied cache ran Node 24.19.0 / npm 11.9.0, Next 16.3.6 and Vitest 5.0.2. The first harness record `.task/agent-finish/runs/c9faedb6f6dd47d68077a2ab2c7699dc.json` is **not passing final evidence**: .NET lint lacked the required SDK; the old Next dev server rewrote the generated `pwa/AGENTS.md` heading; impact tests were interrupted once that mutation was identified; API/contract checks were not run. Only that generated heading was restored, preserving the task changes.

Corrective setup installed task-local Node 26.12.0, npm 11.21.1, OpenSpec 1.14.3 and .NET SDK 11.0.100-rc.2.26504.105, restored the locked PWA/.NET dependencies and pinned Playwright Chromium, and retained .NET 10.0.12 for Kiota. `XDG_RUNTIME_DIR` points to a task-owned temporary directory because the default home is read-only. No repository version pins or system permissions changed. The original cached matrix is retained outside the source tree at `/workspace/issue274-evidence/cached-production-matrix`; The pinned-runtime production matrix also passed all 10 cases / 40 checks; its results and source/build identities are in `.task/identity-T4/production-matrix/results.json`. Final harness results are reported in the PR/handoff.

## Device availability and pending checks

Tool discovery exposed no Android/device connector. Local discovery found no `adb` or `emulator` on PATH or under inspected workspace/tool locations, no Android SDK in the inspected standard locations, no `/dev/kvm` or `/dev/bus/usb`, and no running adb/emulator/qemu process. No paid service was provisioned or permissions changed. This is unavailable device evidence, not a finding that Android cannot display the tagline.

| Qualification | Result | Evidence still required |
| --- | --- | --- |
| Original installed-app details location | Blocked | Exact navigation, screenshot/text, Android/Chrome versions, install mechanism and field ownership |
| Fresh installation | Not run: no supported device | Before/after on the actual target surface; use an approved test origin/device without replacing an existing installation |
| Existing-install refresh | Not run: no supported device | Same installation identity, before/after text, elapsed time and browser update status; no destructive reinstall |
| OS-owned field feasibility | Unresolved | Inspect the actual field; if unconfigurable, evidence the limitation and review a supported alternative |

Keep issue #274 open, PR draft and this OpenSpec change active. Do not infer success from JSON, HTML, install prompts, desktop Playwright or Android viewport emulation. Further device work must preserve installation identity and production boundaries.

## Final implementation verification and review handoff

Draft [PR #286](https://github.com/AlexandreBrisebois/whats-for-supper/pull/286) was created after equivalent issue-number, description, Android and tagline PR searches found none. Implementation/evidence head `b88668ba6467399fdc5b120c63f35fdcc465eb62` passed [CI](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/39100504807) (269 browser passes, 14 prerequisite skips, both CodeQL languages) and [native amd64 stable/beta install identity](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/39100504898). API and Docker smoke CI jobs were skipped by path selection. Final documentation-head results are reported on the PR.

Local final harness `.task/agent-finish/runs/870095d3ea394895989ac710e59f9f18.json` retained stable content identity and passed documentation, OpenSpec, lint, formatting, types, 833 units, 987 API tests (93 prerequisite skips) and all static contract/Kiota checks. Live endpoint and database-behavior checks were not applicable to this application-metadata scope. The broad browser run had 268 passes, 14 skips and one failure: `home-race.spec.ts:155` did not find `tonight-menu-card` within five seconds after QuickFind selection. This full local run is **not green**. Five unchanged, traced repetitions of that exact test passed (`task test:e2e -- e2e/home-race.spec.ts --grep 'Selecting a recipe from QuickFind' --repeat-each=5 --workers=1 --trace=on`); the failure was not reproduced, and no unrelated Home code or test was changed.

The first pinned harness `.task/agent-finish/runs/b24513fbd0f542cfb47e1a762ad8a132.json` stopped after unit success because Vitest initialized `.vitest-cache` and its token directory. A subsequent full-unit experiment compared runtime file hashes and found zero changes; only then was the final harness rerun. Neither invalidated attempt qualifies final content. Traces, failed screenshot/context, matrix results and harness records are retained under `/workspace/issue274-evidence/`. No harness guard was weakened.
