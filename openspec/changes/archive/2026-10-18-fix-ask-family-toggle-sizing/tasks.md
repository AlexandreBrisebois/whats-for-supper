# Tasks

## 1. Restore discoverability presentation

**Outcome and scenarios:** Recipe-editing: initialize loaded-detail discoverability; submit inverse state; disable while pending; restore after rejection. Track remains 56 by 32 CSS pixels with its 24-pixel thumb contained in both states at 320, 390 and 1280 viewport widths, including longer text.
**Owners and boundaries:** DiscoveryToggleCard and StackActionBar; recipe detail PATCH /api/recipes/{id} through existing client. No business-rule changes.
**Prerequisites:** Verified main 2a5ff0b62484993c14d551aac6e035cf72caec29; local Task, browser and PWA dependencies.
**Acceptance boundary:** Render real app components/CSS in Chromium with synthetic recipe fixtures and mocked API. Component tests cover localization, callbacks and pending state. Existing shared-consumer tests cover optimistic state and rejection. No database claims from browser mocks.

- [x] 1.1 Add geometry/containment and exact false → true → false request/state regressions to recipes.spec.ts; run `task test:e2e -- recipes.spec.ts --grep "discovery geometry" --workers=1` before production edits and observe the intended visual failure. Add localized component tests and observe subtitle failures with `task test:unit -- src/components/recipes/DiscoveryToggleCard.test.tsx`.
- [x] 1.2 Restore localized subtitle and robust flex sizing; rerun the focused commands to green, checking native and long translated text in both states. Preserve the verified accurate explanation in docs/user-guide.md.
- [x] 1.3 Verify shared StackActionBar geometry and run its existing optimistic/loading/error tests plus recipe/detail and browse-all-stack browser suites. Record actual results, failures and retries in evidence.md.

## 2. Compact regular Search cards

**Outcome and scenarios:** recipe-search compact regular cards, results with/without Top Pick, long names and issue badges, return from detail with retained results.
**Owners and boundaries:** Search ordinary-result markup; compare rendered geometry with unchanged Browse list cards. No shared shell required for this bounded markup alignment.
**Acceptance boundary:** Real Chromium layout at 360/390/430 px, synthetic recipe fixtures, method-sensitive API mocks, existing Search behavior tests.

- [x] 2.1 Add browser geometry comparison to Browse (4:3 image, edge-to-edge placement, 12px content inset, 8px corners, readable time, two-line names and 12px mobile grid gap) with Top Pick present/absent, issue badges and detail return. Run `task test:e2e -- recipes.spec.ts --grep "compact search" --workers=1` against unchanged Search markup and observe intended failures.
- [x] 2.2 Align only regular Search card presentation to Browse and run the focused browser tests to green. Preserve Top Pick reason/Surprise Me and all state/event handlers.
- [x] 2.3 Run recipes, search-hardening, search-invalidation-recovery and browse-all-stack browser acceptance plus relevant component tests; review actual test selection and results. Capture synthetic-data geometry/screenshot proof.

## 3. Final Integration and Verification

- [x] 3.1 Reconcile acceptance/evidence, prepare all changed application paths, review scope and run `task verify -- <complete-task-paths>`; report the invocation record and actual results. A blocked required check remains incomplete.

## Workflow follow-up

- Archive only once acceptance and required verification pass; sync the recipe-search presentation delta. Validate and verify archival writes.
- Publish a focused PR using the GitHub connector and check CI on its final head. Leave merge to Alex.
