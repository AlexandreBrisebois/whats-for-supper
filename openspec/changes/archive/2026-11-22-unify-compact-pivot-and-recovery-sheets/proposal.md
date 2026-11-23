# Proposal

## Why

On a Pixel 10 phone (`412 × 915 CSS px`), the Plan B recovery dialog (`pwa/src/components/home/SkipRecoveryDialog.tsx`) expands past `808px` in height due to `p-8` outer padding, a 5-line `text-3xl` recipe+date heading, redundant right-side icons that squeeze button text onto two lines, and a bottom-positioned `Go back` button—pushing `Go back` below the fold and forcing users to scroll just to reverse a choice. Sibling sheets (`pwa/src/components/planner/PlanningPivotSheet.tsx` and `pwa/src/components/planner/NonCookingDaySheet.tsx`) share the same oversized vertical chrome (with `NonCookingDaySheet` still using an Era 2 translucent shell and `44px` close button).

In addition, Plan B Step 1 creates a product dead end: when a household's supper plan changes to **Eating out** or **We made plans** (e.g., *"Supper at Grandma's"*), Step 1 only offers `Take Out`, `Suggestions`, and `Search`, forcing users to abandon Plan B and make multiple edits in Planner.

## Outcome and Scope

- **Pixel 10 zero-scroll recovery & pivot sheets:** All three sheets (`SkipRecoveryDialog` Steps 1–2 and replacement recovery views, `PlanningPivotSheet` with up to 5 actions, and `NonCookingDaySheet` with note input) fit comfortably inside a `412 × 915` viewport (`~496–584px` tall, `>= 245px` spare room) in both English and French without scrolling, while degrading gracefully with internal body scroll at `320 CSS px` / `200%` text scaling.
- **Zero-jump locked headers & honest visual affordance:** A shared compact Era 3 sheet shell locks the left-aligned title stack (`0px` X/Y shift across Step 1 ↔ Step 2 and Planner ↔ Other plans), places `[← Back]` cleanly beside `[×]` at top-right (`>= 48 × 48px`), displays a slim `4px` 2-step progress strip on multi-step Plan B, renders read-only meal context directly on warm cream beside a `3.5px` terracotta editorial bar (never inside a clickable-looking white card), highlights `Move to <date>` with subtle Hearth blush as the suggested next action, and uses concise localized dates (`Sun, Nov 22` / `Sat, Nov 21`, `dim. 22 nov.` / `sam. 21 nov.`) inside disposition buttons while keeping the full date in the header context.
- **Zero-extra-menu Plan B resolution:** Step 1 groups **Not cooking tonight** (`Take Out`, `Eating out`, `Made plans`) in a 3-up quick-tap row above **Cook something else** (`Suggestions`, `Search`). `Take Out` and `Eating out` advance in 1 tap; `Made plans` expands an inline `"Tell the family the plan"` input (1–80 chars) + `Next →` directly inside Step 1. Step 2 persists any of the three non-cooking kinds atomically with `Move to tomorrow` (`MoveScheduleDto.sourceNonCooking`), `Save for Next Week` (`DeferScheduleDto.sourceNonCooking`), or `Remove` (`ValidationDto.replaceRecipe`) and adapts its subtitle to name the chosen backup plan.
- **Visual design references:** Captured in `docs/visual-language/designs/pivot-recovery-sheet-suite.svg` and `docs/visual-language/designs/pivot-recovery-journeys.svg`, indexed from `docs/visual-language-reference.md`.
- **Exclusions:** Does not change Quick Find card deck behavior, Library Search filtering, Cook's Mode, or non-cooking Home card illustrations (`NonCookingVignette`). Does not remove `sourceDisposition: 'order_in'` API compatibility.

## What Changes

- Unify `SkipRecoveryDialog`, `PlanningPivotSheet`, and `NonCookingDaySheet` on a compact Era 3 opaque sheet shell with locked top-left title, top-right `[← Back] [×]` controls (`>= 48px`), and `0px` horizontal/vertical title shift across steps.
- Upgrade `SkipRecoveryDialog` Step 1 to include `Eating out` (1 tap) and `Made plans` (inline 1–80 char family note + `Next →`) alongside `Take Out`, `Suggestions`, and `Search`, without adding an extra screen or menu.
- Redesign `SkipRecoveryDialog` Step 2 to render the original meal and full date directly on warm cream with a terracotta left accent bar above a `1px` divider, use concise localized action dates (`Move to Sun, Nov 22`, `Remove from Sat, Nov 21`), gently highlight following-day movement with Hearth blush, remove duplicate right-side icons, and tailor the prompt subtitle to the selected backup plan.
- Hide the duplicate `← Back` control on direct-to-Step-2 entry (Planner / Recipes replacement confirmation) where `×` already dismisses the dialog without a prior step.
- Extend `MoveScheduleDto` and `DeferScheduleDto` with optional `sourceNonCooking` (`NonCookingPlanDto`) and `ValidationDto` with optional `replaceRecipe` in `specs/openapi.yaml` (and backend `ScheduleService` / Kiota client / E2E stateful mock API) so `Move to tomorrow`, `Save for Next Week`, and `Remove` each atomically replace tonight's planned meal with `order_in`, `eating_out`, or `custom` (trimmed 1–80 char `customLabel`) in a single commit while preserving legacy `sourceDisposition: 'order_in'` and the 409 recipe-protection guard whenever `replaceRecipe` is omitted.
- Add the same non-clickable terracotta-accented meal headline to `PlanningPivotSheet` when a recipe is planned and upgrade `NonCookingDaySheet` from Era 2 translucency and a `44px` close button to the Era 3 opaque shell with `48px` controls and top-right `← Back` when entered from Planner options.

## Capabilities

### New Capabilities

_(None — all behaviors belong cleanly to existing capability owners.)_

### Modified Capabilities

- `tonight-meal-decisions`: Expand planned Tonight Plan B Step 1 with `Eating out` and inline `Made plans` (zero extra menu), relocate Back to the locked top-right header cluster beside Close, and persist all three non-cooking backup kinds through Step 2 disposition.
- `meal-rescheduling`: Extend atomic Tomorrow source disposition to accept optional `sourceNonCooking` (`order_in`, `eating_out`, `custom` + validated label) alongside legacy `sourceDisposition: 'order_in'`, and refine disposition choice presentation (non-clickable terracotta-bar headline with full source date, concise localized button dates, suggested following-day Hearth emphasis, and intent-aware prompt copy).
- `visual-design-contract`: Establish unified Era 3 compact sheet shell geometry, locked header stability, non-clickable cream context vs. clickable card affordances, Pixel 10 zero-scroll verification, and Era 3 upgrade for `NonCookingDaySheet` and `PlanningPivotSheet`.

## Impact

- **Visual design boards:** `docs/visual-language/designs/pivot-recovery-sheet-suite.svg`, `docs/visual-language/designs/pivot-recovery-journeys.svg`, `docs/visual-language-reference.md`.
- **OpenAPI & backend:** `specs/openapi.yaml` (`MoveScheduleDto`, `DeferScheduleDto`, `ValidationDto`), `api/src/RecipeApi/Controllers/ScheduleController.cs`, `api/src/RecipeApi/Services/ScheduleService.cs`, `api/src/RecipeApi/Services/ScheduleService.Tomorrow.cs`, backend unit/Postgres integration tests.
- **PWA client, mocks & UI:** generated Kiota client (`pwa/src/lib/api/generated/`), `pwa/src/lib/planner/slotAssignment.ts`, `pwa/src/lib/planner/nonCooking.ts`, `pwa/src/lib/api/planner.ts`, `pwa/e2e/mock-api.ts`, `pwa/src/components/ui/PivotSheetShell.tsx`, `pwa/src/components/home/SkipRecoveryDialog.tsx`, `pwa/src/components/home/HomeCommandCenter.tsx`, `pwa/src/components/planner/PlanningPivotSheet.tsx`, `pwa/src/components/planner/NonCookingDaySheet.tsx`, `pwa/src/app/(app)/planner/page.tsx`, `pwa/src/app/(app)/recipes/RecipesExperience.tsx`, `pwa/src/locales/en/common.json`, `pwa/src/locales/fr/common.json`.
- **Verification:** Vitest component/contract suites, xUnit schedule move/defer/non-cooking tests (including PostgreSQL integration), and Playwright E2E specs (`pwa/e2e/tomorrow-push.spec.ts`, `pwa/e2e/tonight-replacement-recovery.spec.ts`, `pwa/e2e/planner-non-cooking-days.spec.ts`, `pwa/e2e/home-recipe.spec.ts`) with `assertCookbookVisualA11y` in Standard AA and High Contrast AAA.
