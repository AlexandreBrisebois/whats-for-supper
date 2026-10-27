# Tasks

## 1. Approved compact band and disclaimer revision

**Outcome and scenarios:** Offer a reopenable demo context explanation: approved 32px band exception without decorative padding, static title without outline, exact four-paragraph EN disclaimer and aligned French, matching CTA and preserved lifecycle/reset behavior.
**Owners and boundaries:** DemoContext presentation, demo-only EN/FR locale keys and a default-preserving title-style option in DemoDialog. No other dialog styles, global focus, API, provider/account or data changes.
**Acceptance boundary:** Synthetic isolated loopback app, existing schema-compliant builders and route fixtures; actual DOM/CSS, target geometry, contrast, focus and reset behavior. No production, live household or real AI.

- [x] 1.1 Update exact-copy and browser geometry/title-focus acceptance first; observe intended red with `task test:unit -- src/components/identity/DemoContext.test.tsx` and the selected phone browser cases.
- [x] 1.2 Implement the approved revision and pass selected DemoContext/DemoResetBoundary component tests, preserving dialog semantics and interactive focus.
- [x] 1.3 Pass `task test:e2e -- demo-mode.spec.ts demo-reset.spec.ts` for EN/FR phone/iPad and 320px text growth; inspect ordinary touch Home/modal screenshots separately from keyboard-focus captures. Verify band is genuinely 32px minimum with no decorative cream padding, modal controls remain 44px, actual states exceed 4.5:1 and lifecycle/reset behavior remains intact.

## 2. Final Integration and Verification

- [ ] 2.1 Run Task preparation and final verification on the complete revised path set, review the actual diff, publish the revision in draft PR353 via connector and follow final exact-head CI. Deliver inspected ordinary-state screenshot artifacts through the PR discussion; no merge/deployment.

## Local copy revision and archival checkpoint (2026-10-26)

- Synced the approved four-paragraph English and French disclaimer and existing sage presentation requirements into the main demo-household spec. Archived at the user's explicit request with task 2.1 still unchecked; no PR publication or CI follow-up was performed for this local revision.
- Focused acceptance passed: 19 component tests and all 29 demo-mode/demo-reset browser tests. English/French phone and iPad portrait/landscape screenshots were inspected; expanded-text scrolling and action access passed.
- Application verification record `.task/agent-finish/runs/520ca8e5fc85450f9c9a4df6f063653f.json` applies to the pre-sync application revision: 1,021 unit tests, 1,249 API tests, documentation, OpenSpec, lint, formatting, types and static contracts passed. Aggregate verification failed on one grocery persistence timeout (352 browser tests passed, 18 skipped); that single case passed on isolated rerun. Database-dependent API cases: 153 skipped. This is not an aggregate pass or live database qualification.
- Spec-sync documentation verification passed: `.task/agent-finish/runs/a35fd8238b5d4dcdb0dd820a533c1ca6.json`. Post-archive validation is reported separately; archival does not establish implementation acceptance. All changes remain local and uncommitted.

## Current revision evidence

- Green: revised focused component/reset tests passed all 16 cases. Revised demo-mode/demo-reset browser acceptance passed all 29 tests (37.0s), including exact 32px geometry, zero outer vertical padding, no title outline with initial focus retained, contrasting control focus, modal controls/link at least 44px and separate ordinary touch-state screenshots. Phone/tablet EN/FR and 320px expanded text screenshots were inspected.

- Red: revised exact-copy unit cases failed in EN/FR (two failures, 13 existing passes). Selected iPhone browser cases failed with expected 32px vs observed 44px before implementation.

User explicitly approved the 44px-to-32px band tradeoff and separately requested removal of only the static title outline and the exact four-paragraph disclaimer. Planning artifacts were reconciled before code; no material unknown remains. Earlier evidence below applies to the superseded 44px/padded design and prior copy, not this revision.

## Prior revision evidence


- Source base: verified main d34af7b154911659cb68f68ce2ccd0a709c70b7d (tree a48b2315e9cecc1e7c6a5222e84831f692c7b060). The local source tree matched that exact tree before edits; no unrelated work was present. Reference screenshots were materialized consumer-locally and inspected.
- Red: `task test:unit -- src/components/identity/DemoContext.test.tsx` failed on the two new EN/FR exact-copy expectations; 13 existing cases passed. Green: the selected DemoContext and DemoResetBoundary command passed 16 tests.
- Final focused acceptance: `task test:e2e -- demo-mode.spec.ts demo-reset.spec.ts --workers=2 --reporter=list --output=/workspace/demo-evidence/acceptance` passed all 29 tests. EN/FR phone and iPad portrait/landscape, 320px enlarged/wrapped text, 44px targets, first visit, dismissal/reopen/focus and reset preservation were exercised. Actual inner-strip contrast was 11.66/9.07/6.90:1; CTA contrast was 7.22/11.31/16.92:1. Focus remained visibly contrasting, including the existing stronger 3px band outline.
- Task preparation passed on all ten selected paths; scope review found only the approved presentation/copy, acceptance tests and this delta. Lifecycle logic, global tokens, APIs, data and archived history were unchanged.
- Final aggregate `task verify -- <all ten selected paths>` passed all selected checks. Record: `.task/agent-finish/runs/aa228e9217de45dd9f577a59c1af0303.json`; tested identity: `3936867867c50f8a4cced17f864aa41b158cfd3ed8d43b37274a8b1959a451ba`; content stability passed. Results: 96 unit files/1,021 tests passed; 353 E2E passed and 18 skipped; 1,249 API passed and 153 database-dependent tests skipped because no database connection was configured. Documentation, OpenSpec, lint, formatting, types, static route/schema/mock checks, generated-client parity and reconciliation passed. Live endpoint/database qualification was not applicable to this UI-only change, not claimed as passed.
- The earlier aggregate record `d506473c8d6f487ba46b1a48742d7bc3.json` was unsuccessful: its SDK was stale, an empty directory remained from source synchronization, and an added assertion expected exactly 2px where the app provided 3px. Its identity was also invalidated during the explicitly requested early draft publication. Those causes were corrected before the successful final run; it is not final acceptance evidence.
- Toolchain setup used pinned OpenSpec 1.14.3, the exact required .NET 11.0.100-rc.2.26504.105 SDK and restored Kiota 1.36.1. Checks ran on isolated loopback port 3199 with synthetic fixtures; no live household, real AI, deployment, release or merge.
- Actual Home and modal screenshots were inspected. The 912x2048 local captures remain under `/workspace/demo-evidence`. The selected-environment Library uploader failed HTTP 401 during discovery before any write; no retry or bypass occurred. The parent independently materialized the inspected exact-head CI phone pair, saved it through its supported Library flow and delivered both attachments to the user. Delivery is resolved; no duplicate upload was made.
- PR discussion contains downloadable CI preview evidence and exact filenames: https://github.com/AlexandreBrisebois/whats-for-supper/pull/353#issuecomment-6407882443 . Artifact `playwright-household` ID 12626347636 belongs to head adb9c2092d05b1da0c34e12dceb2009ee36a9fc1; its ZIP SHA-256 matched GitHub metadata. The inspected EN phone `band.png` and `context.png` show a synthetic empty-plan household and the approved copy, not production data. CI run https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/40265422411 completed successfully; all 35 reported head checks were terminal (25 success, nine skipped, one neutral).
- This evidence reconciliation changes documentation only after the aggregate run. Its separate scoped Task verification is required before publication; earlier application evidence remains tied to the recorded identity, with no application source change afterward. Final published-head CI is reported in the PR rather than promising a result before it runs.
