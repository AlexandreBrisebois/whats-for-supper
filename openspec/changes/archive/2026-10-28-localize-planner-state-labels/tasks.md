# Tasks

## 1. Localized Planner row badges

**Outcome and scenarios:** Both added requirements in `specs/meal-planning/spec.md`, including French/English chosen text, singular/plural counts, pending-versus-assigned preservation, zero/missing handling and narrow-layout readability.

**Owners and boundaries:** Planner recipe-row rendering and English/French `planner` locale entries; reuse `t`/`tWithVars`. Preserve `weekStore` composition and assignment ownership. No API, generated-client, database or dependency changes.

**Dependencies and prerequisites:** Approved delta; installed PWA test dependencies and Playwright browser; an isolated PWA test server as configured by Playwright. Use `pwa/e2e/fixtures.ts` `appLocale`, `MOCK_IDS` and schema-compliant builders. Mock owner is `pwa/e2e/mock-api.ts`; reuse its method-sensitive `GET /api/schedule?weekOffset=...` and `GET /api/schedule/{weekOffset}/smart-defaults` enveloped responses without altering their contract. Monitor `POST /api/schedule/assign` for unintended writes.

**Acceptance boundary:** Real translation tables/helpers and Planner rendering, with existing API boundary doubles. Browser assertions establish fixture-based presentation and absence of assignment submissions; they do not qualify live backend persistence. Backend/API/database tests and client regeneration are not applicable to this localization-only change.

- [x] 1.1 Add a focused `Planner state labels` regression group in `pwa/e2e/planner.spec.ts`: a French assigned recipe with zero votes alongside an unassigned pending suggestion with two votes must show “Choisie” and “2 votes”. Run `task test:e2e -- planner.spec.ts --grep 'Planner state labels'` before production edits and record failure on the hardcoded English copy, not on setup or tooling.
- [x] 1.2 Replace the two hardcoded badge strings using `planner.chosen`, `planner.votedOne` and `planner.votedOther` in both `common.json` tables and the existing helpers. Preserve count precedence, positive-count selection, pending metadata, styling and actions. Run the same focused E2E command and record green for the first scenario.
- [x] 1.3 Extend the existing Planner unit suite before any further production adjustment to cover both locales, counts 1/2/12, zero and absent count, and an assigned recipe with positive votes. Use real locale tables through its existing controlled-locale mocks. Run `task test:unit -- 'src/app/(app)/planner/page.test.tsx'`; all added delta examples must pass with exact copy and no unresolved token/key.
- [x] 1.4 Extend the focused browser group to verify singular/plural forms in both locales; confirm that rendering sends no assignment POST and a schedule reread keeps the suggestion slot empty. Cover 320px width with 200% text size: complete badges, no overlap and existing row controls reachable. Retain saved-row actions and non-cooking/empty-row presentation. Run `task test:e2e -- planner.spec.ts --grep 'Planner state labels'` and the full `task test:e2e -- planner.spec.ts`; record results and any environment limits against the named scenarios.

## 2. Final Integration and Verification

- [ ] 2.1 Reconcile all scenario results and red/green evidence here, validate with `openspec validate localize-planner-state-labels --strict --no-interactive`, run applicable `task prepare -- <complete-reviewed-changed-paths>`, review the complete scoped diff, and run `task verify -- <complete-reviewed-changed-paths>` once for final checks. Include the new planning files and affected implementation/tests in the explicit path set; report the returned record path and passed/failed/blocked/not-run/not-applicable evidence. Do not mark implementation verified with missing required acceptance.

## Implementation checkpoint

Localization and named acceptance scenarios are implemented and passed. Final repository verification failed its identity guard; task 2.1 remains incomplete. After the verification warning, the user explicitly requested spec synchronization and archival. Archival preserves the incomplete verification task; it does not establish implementation verification.

## Implementation evidence

- 1.1: focused browser command failed on expected `Choisie`, received `Chosen` before production edits. Earlier profile-setup failure was corrected and does not count as red.
- 1.2: same focused browser command passed (1 test); fixture now supplies the matching voting session as required by existing suggestion ownership. Chosen and pending vote labels both verified.
- 1.3: focused Planner unit suite passed, 76 tests including both locales, counts 1/2/12/0/absent on saved and pending rows, count precedence, and saved-only action preservation.
- 1.4: expanded focused browser command passed (6 tests), then full `task test:e2e -- planner.spec.ts` passed (114 tests). Both locales cover counts 1/2/12, zero/missing saved counts, positive-vote saved rows, pending suggestion without saved-only change control, non-cooking and empty rows. At 320px each element uses twice its computed font size; badges are complete, within the viewport and disjoint from names/controls, drag/change controls pass trial clicks, and the saved change action opens Quick Find. No assignment POST occurs; a page fetch through the same schedule boundary confirms the pending slot is empty and saved recipes retained. This qualifies browser fixtures, not live persistence. Initial expanded-run failures were a nonexistent test ID, corrected to the existing non-cooking indicator without production changes.
- Strict OpenSpec validation and `git diff --check` passed before preparation. Backend/live API/database acceptance and client regeneration are not applicable: no affected contract or server behavior. Final harness results belong to its immutable record; any broad automated API/static checks are separate from browser acceptance.
- Preparation passed and formatted only the new browser group; other selected application files were unchanged. Scope review accounts for the three production files, two test files and the five existing planning files. No API/client/store/layout changes or unrelated edits were introduced. Matching fixture session requiredSlots is three (three saved recipes and one non-cooking slot leave three voting slots). Final repository verification is pending below.

## Final verification checkpoint

- `task verify -- <all ten selected paths>` ran once. Record: `.task/agent-finish/runs/c979430d99ac4fda9395798bbaff2ecc.json`; starting identity `8bf7f5b01597c3006a89ac18a2755b4a15248e16d25c8c5fea21342daec60821`.
- Passed at the recorded starting identity: documentation, all 35 OpenSpec items, lint, formatting, types and all 1,233 unit tests.
- Failed: `agent:test:impact` and final content identity. Playwright reported 493 passed / 47 skipped, but its runner rejected success due to content/config/runtime mutation during tests. Those browser observations do not establish a successful final gate.
- A new unrelated untracked `openspec/changes/adapt-tonight-card-to-viewport/` package appeared during verification; it was absent at initial scope review. It is preserved and excluded from this task's edits. This is consistent with the identity failure; the record does not identify individual changed inputs.
- Not run after the identity failure: `test:api`, `review:contracts`. Not applicable: test:agent, live endpoint parity and database behavior for this localization scope. No independent environment-blocked acceptance checks; final completion is blocked by unstable verification identity.
- All four implementation/acceptance tasks are complete. Task 2.1 remains unchecked because required final verification did not pass. This evidence/checkpoint update occurs after the recorded failure and is not covered by its starting digest. Next action: run final verification with the same ten reviewed paths after concurrent writes settle. Do not modify or remove the unrelated change to obtain a green result.

## Archive disposition

User requested “sync and archive spec” after the final verification warning. Both localized Planner requirements are synced to the meal-planning main spec. Archive with task 2.1 still unchecked and all failure/not-run evidence above preserved. No application edits or verification rerun are part of this archival operation.
