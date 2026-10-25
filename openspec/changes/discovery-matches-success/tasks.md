# Tasks

## 1. Converged card and completed-week handoff

**Outcome and scenarios:** Both requirements in the recipe-discovery delta, including late updates, non-current week, prior groceries, keyboard, narrow layout and unchanged Home dismissal.
**Owners and boundaries:** Discovery page/store, shared success presentation, Home wrapper, locale lookup, existing Planner route/store. No API contract or lifecycle changes.
**Dependencies and prerequisites:** Approved user copy and navigation, pinned tooling, installed PWA dependencies and disposable fixture data.
**Acceptance boundary:** Real browser/router/stores; external API boundary doubles from `e2e/mock-api.ts`, schema-compliant builders and GET `/api/discovery/session`, `/api/schedule` and smart-default reads. Retain live-suite assertions but do not mutate live households. Physical-device qualification is outside this browser-fixture change.

- [x] 1.1 Update Discovery unit expectations and Home wrapper regressions; run `task test:unit -- 'src/app/(app)/discovery/page.test.tsx' src/components/home/HomeSections.test.tsx` and observe the intended missing-copy/navigation failure before production edits.
- [x] 1.2 Extract the narrow shared presentation, implement centered static Discovery and anchored CTA, update English/French strings; rerun the focused unit command green, preserving Home markup/test IDs/dismiss callback.
- [x] 1.3 Update and run `task test:e2e -- e2e/discovery.spec.ts e2e/home-recipe.spec.ts`; retain mid-drag/reduced-motion/late-SSE checks and cover 320px phone, phone portrait, tablet portrait, desktop, keyboard, non-current week and prior grocery tab. Capture disposable-fixture review screenshots, update `voting-session-live.spec.ts` expectations and record whether its isolated fixture ran.

## 2. Discovery small-text contrast correction

- [x] 2.1 Add rendered/composited browser contrast assertions for Discovery subtitle and action (normal/hover, all four viewports); observe ratios below 4.5:1 before implementation with the focused convergence browser test.
- [x] 2.2 Apply the narrow Discovery-only sage-900 small-text treatment, preserving Home defaults; pass focused contrast/navigation and Home wrapper checks and re-inspect all four viewport screenshots. Full validation is tracked in 3.1 and final-head CI in workflow follow-up.

## 3. Final Integration and Verification

- [x] 3.1 Reconcile acceptance and evidence, run applicable `task prepare`, review all changed paths, then run `task verify` with the complete task path set; record actual passed/failed/blocked/unrun checks and evidence path. Validate all OpenSpec changes with `task spec:check`.

## Evidence

- **Red:** `task test:unit -- 'src/app/(app)/discovery/page.test.tsx' src/components/home/HomeSections.test.tsx`, 2026-10-25: 1 intended missing-headline failure, 10 passed. `/tmp/wfs-322-red.log`.
- **Initial-head green and full repository checks (superseded for the contrast edits):** `task verify -- <all 15 reviewed task paths>` passed. Record `.task/agent-finish/runs/c20e0451a71f48f8abbe1997f326052a.json`, identity `474d8398059ded200c88694e20bbf15c834a9b47d03e9014ae39c2bccb03fa5c`. Documentation, OpenSpec, API/PWA lint, format, types, unit, impact/browser, API and static contract/client checks passed with stable content. 90 unit files / 950 tests passed; full Playwright: 307 passed, 18 explicitly skipped; API: 1191 passed, 135 explicitly skipped. Skips are not passes. Live endpoint parity and broad database suites were not applicable to this UI-only change. Log `/tmp/wfs-322-verify-stable.log`.
- **Real seam:** Existing disposable `database_environment` with `WFS_CALENDAR_LIVE=1`, then `task test:api -- --filter FullyQualifiedName~VotingSessionPostgresTests.LiveBrowser_TwoMembersConvergeReconnectAndReopenAgainstRealPostgres`: 1 passed, 0 skipped. The updated live browser suite opens absolute week 2026-10-19 through the CTA and confirms voting stays open without assignments. TRX `/workspace/review-322/live-results/voting-live.trx`; `/workspace/review-322/live-runtime.json` confirms the temporary PostgreSQL container was removed.
- **Visual/interaction acceptance:** All four requested viewports rendered, geometry-checked and visually inspected: 320×740, 390×844, 768×1024, 1280×900. The full browser pass includes prior grocery tab, anchored schedule GET, Enter/Space, return to Discovery, late SSE, mid-drag convergence, reduced motion, unchanged Home dismissal, and French 320×568 with enlarged text and scrolling. No physical-device qualification is claimed. Clean review PNGs are retained at `/workspace/review-322/convergence-{small-phone,phone,tablet,desktop}.png`; their disposable capture hides only Next's development-tools portal. CI also receives test screenshot attachments. The user-uploaded reference is outside the repository.
- **Corrections before final pass:** Explicit DateOnly serialization fixed typecheck. Browser fixture setup was corrected to visit groceries at phone width and scroll the enlarged-text short viewport. Pinned Vitest 5.0.5 writes generated `.vitest-cache` output outside the harness's existing cache exclusions; moving only that generated cache beneath already-excluded `.cache` and symlinking its default location resolved self-invalidating runtime identity. No harness, application dependencies or tests were weakened.
- **Environment/scope:** Node 26.12.0, npm 11.21.1, OpenSpec 1.14.3, SDK/runtime RC2 restored to repository pins; existing EF/Npgsql RC1 preserved. No manifest, lockfile, API, database schema, assignment, voting lifecycle or deployment changes. Full scope review found only the 15 task-owned files. This evidence/checklist update is subsequent documentation content; final scoped documentation verification follows, the original head retained all 10 tested application/test/locale hashes at that checkpoint; contrast edits require new evidence.

## Workflow follow-up

- Publish a draft PR linked to #322 and follow its immutable final-head CI. Keep the issue open; no merge or deployment.

- Independent review requested a Discovery-only contrast correction after initial head `93d9f11e66e1c379e3cdb767af16d4e530ad9f6f`; both push and PR CI passed for that head. Earlier app verification belongs to that original source; new contrast and full verification evidence will follow.

- Contrast red (actual browser/compositing): `task test:e2e -- e2e/discovery.spec.ts --grep "both members stop" --workers=1` failed as intended, subtitle 2.281:1 and action 3.064:1. Computed subtitle is white at 0.7 alpha over sage RGB(138,154,91); CTA is the same sage RGB on opaque white. `/tmp/wfs-322-contrast-red.log`. Discovery now selects sage-900 small-text tone; Home defaults are unchanged.

- Contrast green: subtitle 5.523:1 against base sage (the minimum under white decorative glows), CTA 16.921:1 normally and 15.429:1 on the rendered 90%-white hover background. All four requested viewports pass actual browser-color/compositing assertions. Focused convergence + French browser checks: 2 passed (`/tmp/wfs-322-contrast-green-2.log`); Discovery/Home unit checks: 11 passed (`/tmp/wfs-322-unit-contrast.log`). Home default subtitle/action classes are explicitly preserved.

- Contrast-focused final artifacts: convergence + French checks passed again (2 passed, `/tmp/wfs-322-contrast-shots.log`), all four clean PNGs re-inspected visually and copied to `/workspace/review-322/`. The isolated real voting/API/PWA fixture was rerun after the color change: 1 passed, 0 skipped (`/tmp/wfs-322-live-contrast.log`, `/workspace/review-322/live-contrast-results/voting-live.trx`), and its disposable PostgreSQL container was removed (`live-contrast-runtime.json`). New complete validation follows.

- **Contrast final full validation:** `task verify -- <all 15 task paths>` passed on corrected Discovery styling; record `.task/agent-finish/runs/d55958f6a2124bd8aa1e579ce6ebf585.json`, identity `05ccc6ab41531f7f638435e00b2e3075696ba8e9a2b312eb04d4705070390539`. All applicable checks and content identity passed: 950 unit tests; full browser suite 307 passed / 18 skipped; API 1191 passed / 135 skipped; OpenSpec 36 valid; lint, format, types and static contract/client checks passed. This subsequent evidence/checklist-only update receives separate scoped documentation verification; the 10 tested application/test/locale hashes are unchanged. Final-head CI will be followed after publication.
