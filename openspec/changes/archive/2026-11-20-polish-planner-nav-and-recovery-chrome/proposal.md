# Proposal

## Why

Recent Family Cookbook / design-system work introduced four visible regressions or unwanted additions on the mobile Planner and Plan B surfaces:

1. The bottom-nav Discovery button carries a small dot (pip) in addition to its pulse (observed: screenshot 3, top-right of the medallion).
2. `Nudge family` and `Close Voting` render on two stacked lines instead of one row (observed: screenshot 3).
3. The Plan B disposition step shows a bottom "Go back" link plus the top-right X. The link is kept, but it is currently an unstyled `text-xs` text button (`mt-2`, no icon, grey-on-cream) that does not match the dialog's option cards or the design system's Hearth buttons (observed: screenshot 2 / `SkipRecoveryDialog`).
4. After planning a meal, the green ring on the new day card never goes away (observed: screenshot 1).
5. CI run 44669197408 (workflow `CI`, branch `recipe-view-redesign`, commit `afdb801a`) is red. Observed from the public jobs API: 3 of 19 jobs fail, and the aggregate `PWA — build & E2E` gate fails because of them.
   - `PWA — E2E (planning)`: `e2e/planner-portions-refinement.spec.ts:67` (EN and FR) fails because the Portions stepper moves 8-10 px after pressing plus (expected < 1 px). `e2e/planner.spec.ts:1460` (hold-to-move) failed once and passed on retry, so it is flaky, not a gate failure.
   - `API — test`: 3 of 3,822 tests fail, all in `DeploymentCalendarTests`. They read `docker/docker-compose.prod.yml`, `docker/docker-compose.nas.yml` and `docker/.env`, which are gitignored and absent in CI (`FileNotFoundException`).
   - `Cooking steps — real API & PostgreSQL browser (cooking)`: step `Run required servings context live` exits 1 (`SupperServingsPostgresTests.LiveBrowser_SupperServingsGeneratedClientAndTwoClientUpdates`): its Playwright child `supper-servings-live.spec.ts` exits 1, with `cooking-quantities-available` never in the viewport within 5 s. Cause not yet established.
   - All other jobs pass, including OpenSpec validate, contract parity, PWA validate, and the household, recipes and tonight E2E suites.
   - The run predates this change, so none of these failures come from items 1-4.

## Outcome and Scope

Success means, on a ~390 px phone viewport:

- The Discovery nav button has no pip in any state.
- `Nudge family` and `Close Voting` sit side by side on one line, never stacked.
- Plan B step 2 keeps its "Go back" link, restyled as a proper secondary control: Hearth `ghost` button with a leading back arrow, `text-sm`, at least 48 px tall, visible focus ring, AA contrast in Standard and High Contrast modes. The top-right X stays.
- The new-meal highlight ring appears after planning, then fades out by itself.
- A CI run on the resulting commit is fully green: every job in the `CI` workflow succeeds, with no job relying on a retry to pass.

CI scope boundary: fix the root causes of the three failures. Do not weaken, skip or delete tests to get green, and do not widen into unrelated warnings (the nullable-reference warnings in `RecipeFilePublicationStore*`, `CookingStepRelationshipProducer.PerItem.cs` and `CanonicalRecipeMigrationReceipt.cs` do not fail the build).

Out of scope: Go back behavior (it still returns to the Take Out / Suggestions / Search choice), voting logic, convergence rules, the Discovery pulse and converged "Menu's in" states, Plan B step 1, replacement/recovery phases, and any API or data change. This is PWA-only.

## What Changes

- Remove the `nav-discovery-pip` element from the primary nav control. The pulse animation and the localized accessible label (`navigation.discoverVotingAria`) stay.
- Fix the Planner voting action row so the Nudge and Close buttons cannot wrap (root cause in design.md).
- Restyle the "Go back" button in `SkipRecoveryDialog` step 2 using the existing Hearth `Button` `ghost` variant and a back arrow. Behavior, label and locale key (`home.goBack`) are unchanged.
- Diagnose and fix the three CI failures above at their root cause (design.md, tasks group 1). If a root cause is a defect against behavior existing specs already describe (for example Portions stepper stability or the servings live contract), the fix restores that behavior with no spec change. If it needs new or changed behavior, stop and extend this change's specs first.
- Make the day-card success ring transient: it is cleared after a short delay and fades rather than snapping off, with an instant clear under `prefers-reduced-motion`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-discovery`: the "Pulse navigation Discover control" requirement drops the static status pip; the pulse and accessible label remain.
- `meal-planning`: "Preserve visible Swipe Match Cook voting controls" gains a single-line, non-wrapping guarantee for `Nudge family` + `Close Voting`.
- `tonight-meal-decisions`: "Cancel Home recovery before mutation" keeps Back and adds how it is presented (secondary Hearth control, 48 px target, focus and contrast).
- `meal-assignment`: "Return targeted Search assignment to Planner" defines the highlight ring's lifetime and fade.

## Impact

- `pwa/src/components/common/Navigation.tsx` and `Navigation.test.tsx`
- `pwa/src/app/(app)/planner/page.tsx` and `page.test.tsx`
- `pwa/src/components/home/SkipRecoveryDialog.tsx` and `SkipRecoveryDialog.test.tsx`
- `home.goBack` locale key stays.
- E2E: `pwa/e2e/planner.spec.ts` (asserts `ring-sage`, around line 1141); check `pwa/e2e/discovery.spec.ts` and voting specs for pip or nudge-row assumptions
- No OpenAPI, backend or persistence impact from items 1-4. CI items may touch `api/src/RecipeApi.Tests/` and `api/src/RecipeApi/` (servings and the failing API test), `pwa/e2e/planner-portions-refinement.spec.ts`, the Portions stepper in `pwa/src/components/planner/`, and `pwa/e2e/planner.spec.ts` (hold-to-move flake). `.github/workflows/validate.yml` should not need changes.

## Assumptions to confirm

- "Go back link" means the `home.goBack` button at the bottom of step 2. "Properly" means matching the design system's secondary/ghost button, not a new visual treatment.
- The ring should fade for every planned meal, including replacement/spillover receipts. The receipt message persists as today; only the decorative ring is transient.
- Ring lifetime of about 3 s. The routine receipt already auto-clears at 5 s, so this is a design choice.
