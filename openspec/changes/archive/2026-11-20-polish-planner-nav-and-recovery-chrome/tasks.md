# Tasks

## 1. CI green: root-cause the three red jobs

**Outcome and scenarios:** A new `CI` run on the change's head is green: `API — test`, `PWA — E2E (planning)` and `Cooking steps … (cooking)` pass, `PWA — build & E2E` passes as the aggregate, and `Analyze validated source` runs. No retries needed to pass. No spec scenarios change unless 1.2-1.4 show a behavior gap (then stop and extend the specs).
**Owners and boundaries:** Portions stepper in `pwa/src/components/planner/` and `pwa/e2e/planner-portions-refinement.spec.ts`; `pwa/e2e/planner.spec.ts:1460`; `api/src/RecipeApi.Tests/` servings and API tests. Do not touch `.github/workflows/validate.yml`, skip tests, or loosen assertions.
**Dependencies and prerequisites:** Failed-job logs are retrievable with `gh run view --job <id> --log-failed -R AlexandreBrisebois/whats-for-supper` (`API — test` is job 136066557357, cooking is job 136065938261). Docker/PostgreSQL are needed for the live servings test and the Playwright browsers must be installed.
**Acceptance boundary:** Playwright against the real PWA (mocked API via `page.route()`) and the xUnit tests against real PostgreSQL. _Revised by the owner: the canonical/cooking live browser tests and their `cooking-step-live` CI job were removed because the mocked suites cover the same behavior; the `LiveBrowser_*` owners listed below no longer exist._

- [ ] 1.1 _(partial: servings failure reproduced locally; API failure confirmed from CI log and verified fixed in a clean worktree; the planning stepper failure did NOT reproduce locally in dev, production, UTC, or Linux Chromium)_ Reproduce each failure locally with the commands below, and confirm it matches the CI evidence: `task test:api -- --filter "FullyQualifiedName~DeploymentCalendarTests"` after temporarily making the ignored `docker/.env`, `docker-compose.prod.yml` and `docker-compose.nas.yml` unavailable (for example in a fresh `git clone` or `git worktree`, where they are absent), and `task test:api -- --filter "FullyQualifiedName=RecipeApi.Tests.Integration.SupperServingsPostgresTests.LiveBrowser_SupperServingsGeneratedClientAndTwoClientUpdates"`. Done when each failure reproduces in a clean checkout.
- [x] 1.2 _(Evidence: CI run 44780581890 screencast shows the Planner content stuck mid entrance-slide (opacity 0, `x: ±50` spring) while the test measured. Root cause: the fixture's `page.clock.setFixedTime` replaces performance/RAF, so framer-motion's timeline stalls in CI; no product layout defect. Fix: the geometry describe uses the existing `dateOnlyClock: true` option and takes its baseline only after the boxes are identical on consecutive frames; the < 1 px assertions are unchanged. Local production run: 50/50 with `--repeat-each=5 --retries=0`.)_ Planning E2E: run `task test:e2e:ci -- e2e/planner-portions-refinement.spec.ts --workers=1 --retries=0` and observe the stepper shifting 8-10 px (at 390 and 375 px, EN and FR). Compare with `27b3a3c1` to identify the change that made the stepper move, then fix the stepper/row layout so x, y, width and height of the stepper and plus button and the next row's y stay within 1 px when stepping 4→5→4. Re-run and expect green in EN and FR. Start from the CI evidence: the failure screenshot shows an empty Planner (no strip, no rows) at measurement time, so run with `--trace on` and check whether plus triggers a reload or remount before touching CSS. Download the CI artifacts with `gh run download 44669197408 -n playwright-planning` for comparison.
- [x] 1.3 API tests: in `api/src/RecipeApi.Tests/Services/DeploymentCalendarTests.cs` remove the `[InlineData("docker/docker-compose.prod.yml")]` and `[InlineData("docker/docker-compose.nas.yml")]` rows (lines 58-59) and the `docker/.env` assertion (line 73); keep every tracked-file assertion. Do not commit the ignored files. Verify in a clean worktree with `task test:api -- --filter "FullyQualifiedName~DeploymentCalendarTests"`: all remaining cases green and no `FileNotFoundException`. Then run the full `task test:api` to confirm the job's 3,769 passes are unchanged and 0 fail. _Evidence: red = CI job 136066557357 (same code); green = clean `git worktree` run, 14/14 `DeploymentCalendarTests` passed with the ignored files absent._
- [x] 1.3b Servings live test: from the 1.1 repro, run `supper-servings-live.spec.ts` and find why `cooking-quantities-available` is not in the viewport on the planner and `recipes?addToDay` pages. Decide from the evidence whether it is a product layout regression from the redesign (fix the UI) or a stale assumption in the live spec (fix the spec, with the reason recorded). Re-run the servings test and expect green, then the other 12 cooking live cases and the prepared-supper live test to confirm no regression. Run `task gen:client:check` and `task check:contracts` if a contract or generated client is touched. Start from the CI evidence: after the other client saves 5 portions, the sheet shows `5 portions` / `500 g pasta` but `cooking-quantities-available` (rendered only when `quantitiesAvailable` is true, `CooksMode.tsx:1169`) never appears (spec lines 507 and 519). Run `CooksMode.test.tsx` and `CooksMode.sse.test.tsx` first, since they assert this banner; then diff `CooksMode.tsx` against `dff5c97d`. Also check the `Oct 28` vs `Oct 21` date in the sheet. Artifact: `gh run download 44669197408 -n cooking-live-results-cooking`. _Evidence: reproduced locally against a real Postgres + production PWA build. Root cause: the live spec was stale against the approved `cooking` spec (remote update before cooking progress applies silently), and once progress exists the update bar was not pinned, so it scrolled out of view. Fixed by making the spec create progress (checking an ingredient) and pinning the bar (`sticky top-0`); live servings test now passes 1/1, `CooksMode` unit tests 97/97._
- [x] 1.4 Flaky hold-to-move: run `task test:e2e:ci -- e2e/planner.spec.ts -g "always-on hold-to-move" --repeat-each=20 --workers=4 --retries=0`. If it fails intermittently, make the test wait for the hold to activate before asserting `data-grabbed`, without changing product behavior or timeouts for users. Expect 20/20. _Evidence: 20/20 passed with `--retries=0`; no change needed._
- [ ] 1.5 Full-suite acceptance (live canonical/cooking job removed): run `task check:push:pwa SUITES='tonight planning recipes household'` and the API suite with retries off; then push and confirm the GitHub `CI` run is green with no retry-masked passes (`flaky` count 0 in the Playwright summary).

## 2. Planner ring fades after planning

**Outcome and scenarios:** The new-meal ring appears, then fades and is removed. `meal-assignment` scenarios "Highlight ring fades after planning", "Highlight is superseded or abandoned" and "Replacement receipt outlives the ring".
**Owners and boundaries:** `pwa/src/app/(app)/planner/page.tsx` (`successDay` state, `PlannerDayCard` classes). PWA only.
**Dependencies and prerequisites:** Design decision 4 (two-phase local state, ~2.5 s fade start and ~3 s removal).
**Acceptance boundary:** Unit tests with fake timers against the real `PlannerPage`; the Playwright check in `pwa/e2e/planner.spec.ts` (~line 1141) runs against the real UI.

- [x] 2.1 Add tests in `pwa/src/app/(app)/planner/page.test.tsx` for: ring present at 0 s and 2 s; fade class at ~2.5 s; neither ring nor fade class after 3.1 s; a week change or newer `successDay` clears the old timer; reduced motion removes without a transition class; the receipt stays after the ring clears. Run the file and observe the failure (the ring persists).
- [x] 2.2 Implement the timer and `ringFading` state in `PlannerPage` and fade classes in `PlannerDayCard` (constant ring width, transparent color swap, `motion-reduce:transition-none`). Re-run the file and expect green.
- [x] 2.3 Update `pwa/e2e/planner.spec.ts` so it asserts `ring-sage` is present after planning and absent after the fade, then run that spec. Expect green.

## 3. Voting actions stay on one line

**Outcome and scenarios:** `meal-planning` requirement "Preserve visible Swipe Match Cook voting controls", scenario "Collecting week shows both voting actions on one line".
**Owners and boundaries:** `planner-action-row` markup in `pwa/src/app/(app)/planner/page.tsx` (~984-1040). No change to voting logic, labels or locales.
**Dependencies and prerequisites:** Design decision 2. Confirm the Portions-above assumption with the user before implementing.
**Acceptance boundary:** Real-browser layout check; jsdom cannot measure wrapping.

- [x] 3.1 Add a Playwright test (extend `pwa/e2e/planner.spec.ts` or the voting spec that already covers `nudge-family-cta`) that opens collecting `VotingOpen` at 320 px and 390 px, in EN and FR, with Portions open and closed, and asserts `nudge-family-cta` and `close-voting-btn` have equal vertical centers (same line) and that each label's height is a single line. Run it and observe the wrap failure.
- [x] 3.2 Restructure the action row so it takes the full line when both buttons render, with no wrap and no shrinking below 48 px; keep the side-by-side layout with Portions when only one button renders. Re-run 2.1 and the existing `page.test.tsx` voting cases, which should pass unchanged.
- [x] 3.3 Verify the converged state (Nudge hidden, `Save menu & close voting`) and the Ask the Family alone layout against their existing scenarios; no visual regression. Run `pwa/e2e/planner-voting-identity.spec.ts` and `voting-session-live.spec.ts`.

## 4. Plan B Go back is styled properly

**Outcome and scenarios:** `tonight-meal-decisions` requirement "Cancel Home recovery before mutation", scenarios "Back is presented as a secondary control", "Return to backup choice" and "Back is unavailable while saving".
**Owners and boundaries:** `pwa/src/components/home/SkipRecoveryDialog.tsx` step 2 only, using the existing `pwa/src/components/ui/button.tsx` `ghost` variant. No behavior, label or locale change.
**Dependencies and prerequisites:** None.
**Acceptance boundary:** Component tests; a Playwright check for focus and size in both contrast modes.

- [x] 4.1 Extend `SkipRecoveryDialog.test.tsx` (existing Go back tests at lines ~51, ~75 must keep passing): assert the Go back button renders an arrow icon, comes after the three options, is disabled while pending, still returns to step 1 without calling `onAction`, and uses the `ghost` Button styling (no leftover one-off `text-xs text-charcoal-600` classes). Run it and observe the new assertions fail.
- [x] 4.2 Replace the raw `<button>` with `<Button variant="ghost">` plus `ArrowLeft`, `text-sm`, full width, min height 48 px, keeping `disabled={pending}`, `onClick={onBack}` and `t('home.goBack', 'Go back')`. Re-run the dialog tests plus the Home and Planner tests that open Plan B; expect green.
- [x] 4.3 Check the rendered result at 390 px in EN and FR, Standard and High Contrast: target at least 48 px (`getBoundingClientRect`), visible keyboard focus ring, AA contrast for text and hover state. Add this as a Playwright assertion in the spec that already opens Plan B (`pwa/e2e/` search for `recovery-action-`), and expect green.

## 5. Discovery nav dot removed

**Outcome and scenarios:** `recipe-discovery` requirement "Pulse navigation Discover control only during an open collecting session", scenarios "No voting session open…" and "Open collecting voting session…".
**Owners and boundaries:** `pwa/src/components/common/Navigation.tsx` only; the pulse, `aria-label` and converged styling stay.
**Dependencies and prerequisites:** None.
**Acceptance boundary:** Component tests in jsdom; e2e checks for the pip testid.

- [x] 5.1 Update `Navigation.test.tsx` (lines ~174-207): assert no `nav-discovery-pip` in unowned, collecting, reduced-motion and converged states, and that the collecting pulse class and the accessible label remain. Run it and observe the failure.
- [x] 5.2 Remove the pip element from `Navigation.tsx`, then re-run `Navigation.test.tsx`. Search `pwa/e2e` and `pwa/src` for any other `nav-discovery-pip` reference and fix it. Expect green.

## 6. Final Integration and Verification

- [ ] 6.1 Reconcile each scenario above with its test evidence, review the whole diff against this change's scope (no voting, API or Plan B step 1 edits), run `openspec validate polish-planner-nav-and-recovery-chrome --strict`, then the preparation and `task verify` steps from `.agents/core/execution-harness.md` with the full changed-path set. Report the actual statuses and record path. No completion while required acceptance is blocked or missing.

## Workflow follow-up

- Sync deltas to `openspec/specs/` and archive the change after review.
