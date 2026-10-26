# Tasks

## 1. Quiet demo presentation and approved copy

**Outcome and scenarios:** Offer a reopenable demo context explanation: quiet visual weight, matching exploration action, approved subscription explanation, responsive accessible control and preserved existing scenarios.
**Owners and boundaries:** DemoContext presentation and EN/FR demo-reset locale copy; existing DemoDialog, visit store and reset boundary remain behavior owners. No API changes.
**Dependencies and prerequisites:** Reviewed proposal/design/delta and explicit user approval; current main d34af7b. Isolated loopback browser with synthetic builders and setupCommonRoutes from e2e/mock-api.ts; no live API or AI.
**Acceptance boundary:** Real rendered CSS/DOM, focus and local state with schema-compliant browser API fixtures; no backend changes requiring live database acceptance.

- [x] 1.1 Add EN/FR exact-copy unit acceptance and browser geometry/inner-surface contrast checks before implementation; observe intended failure with `task test:unit -- src/components/identity/DemoContext.test.tsx`.
- [x] 1.2 Implement the approved local presentation/copy and pass `task test:unit -- src/components/identity/DemoContext.test.tsx src/components/demo/DemoResetBoundary.test.tsx`.
- [ ] 1.3 Run `task test:e2e -- demo-mode.spec.ts demo-reset.spec.ts` against isolated loopback with synthetic fixtures. Verify EN/FR phone/iPad, 320px text growth, normal/hover/pressed inner-strip and CTA contrast, 44px targets, first visit, close/reopen and reset behavior. Inspect actual Home/modal screenshots.

## 2. Final Integration and Verification

- [ ] 2.1 Run Task preparation on the complete changed path set, review scope, and run `task verify` on those paths. Record actual pass/fail/blocked statuses and evidence identity before publishing a draft PR; no merge or deployment.

## Evidence

- Red: focused DemoContext command failed on the two new exact-copy expectations; 13 existing tests passed.
- Green: focused DemoContext and DemoResetBoundary command passed 16 tests.
- Browser: initial hover assertion incorrectly expected hover-only CSS in touch emulation; corrected using actual hover capability and a dedicated pointer case. Subsequent demo-mode/demo-reset run passed 29 tests on loopback port 3199 with synthetic fixtures.
- Inspected Home/modal screenshots (EN/FR phone/tablet) and 320px expanded band; pale sage presentation, wrapping and reachable modal actions observed. No live household or AI traffic.
- Reference screenshots materialized to consumer-local /workspace/demo-reference and inspected. Base source tree matched GitHub main d34af7b and tree a48b2315.
- Full unit suite passed 1,021 tests. With the exact pinned SDK installed separately, API formatting passed and API tests passed 1,249 with 153 database-dependent tests skipped (no test database configured). Static route/schema/mock checks passed.
- Latest focused browser run: 21 passed, 8 failed solely because a new focus assertion required exactly 2px while the app supplied a stronger 3px outline. The assertion now accepts visible outlines at least 2px; rerun pending. Production presentation is unchanged by that test correction.
- Full Task verification is still running on the pre-correction test identity. Initial failures: local empty archived-change directory left by source synchronization; SDK mismatch before installing the pinned version. Broad E2E selected 371 cases and has exceeded 230 completed cases. A final run on the corrected test/toolchain identity remains required.
- Draft PR is being published for visibility at the user’s explicit request while verification continues. Tasks 1.3 and 2.1 remain open; no merge/deployment authorization.
