# Proposal

## Why

Nine inline decision menus, conflict/recovery panels, and status banners across the PWA were left in raw wireframe styling (transparent containers with raw `border-terracotta/30`, sharp `rounded-xl` `bg-terracotta` buttons, unstyled underlined triggers, and missing High Contrast AAA semantic role tokens). At the same time, several of those flows insert multi-button confirmation pauses, manual "check/review/reconcile" click gates, or manual dismiss chores instead of saving valid intent automatically and letting busy households move forward.

## Outcome and Scope

All nine Tier 1 wireframe decision and recovery surfaces adopt Era 3 Family Cookbook styling (`bg-white` + `border-chrome-line`, `bg-terracotta-50` + `border-hearth-line`, `bg-sage-50` + `border-garden-line`, shared `<Button>`, `font-heading`, `focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body`, and `>= 48 × 48 CSS px` interactive targets passing Standard AA, High Contrast AAA, and `320 CSS px` / `200%` text reflow) while collapsing into pull-forward, smart-default interactions that remove ~15 redundant buttons and click gates without weakening concurrency, validation, or failure honesty.

**In scope (Tier 1 decision, recovery, and status surfaces):**
1. Portions editor departure guard, conflict review, error/restored banners, and retry controls in `pwa/src/components/planner/useSupperServingsEditor.tsx`.
2. Planner result confirmation/refresh banner in `pwa/src/app/(app)/planner/page.tsx`.
3. Grocery list Portions updating, updated summary, and refresh-failure banners in `pwa/src/components/planner/GroceryList.tsx`.
4. Settings → Usual portions save/conflict/retry panel in `pwa/src/components/profile/UsualPortionsSection.tsx`.
5. Planning day chooser dialog in `pwa/src/components/recipes/PlanningDayChooser.tsx`.
6. Non-cooking replacement confirmation dialog in `pwa/src/components/recipes/NonCookingReplacementConfirmation.tsx`.
7. Recipe detail edit conflict reconciliation, preview/projection/notes/ingredient inline alerts, and action buttons in `pwa/src/components/recipes/RecipeDetailSheet.tsx`.
8. Cook’s Mode remote quantity refresh, preparation-review conflict bar, and inline step/view errors in `pwa/src/components/planner/CooksMode.tsx`.
9. Recipes continuation pagination controls, planning-mode banner, and error/empty/restart boxes in `pwa/src/app/(app)/recipes/RecipesExperience.tsx`.

**Out of scope:**
- Tier 2 structured dialogs/sheets and Settings controls that already have card/modal chrome (`SkipRecoveryDialog`, `PlanningPivotSheet`, `QuickFindModal`, `NonCookingDaySheet`, `RecycleBinSheet`, `RecipeImportIssueSheet`, `RecipeFiltersSheet`, `ActionGearMenu`, `ToastContainer`, `LanguageSwitchProposal`, `FamilyNudgeDialog`, `InviteLinkDialog`, `Modal`, `Demo*`, `PreviewFeaturesSection`, `FailedCapturesSection`) — deferred to a separate visual-token migration change.
- Backend API contracts, endpoints, database schemas, and request/response shapes (no API or schema changes are required).

## What Changes

- **Style Tier 1 inline decision, recovery, and status surfaces with Family Cookbook tokens:** Standardize surfaces (`bg-white` + `border-chrome-line`, Hearth blush alert/recovery cards, Garden soft confirmation notices), shared `<Button>` variants (`primary`, `secondary`, `ghost`, `danger`), `font-heading`, `>= 48 CSS px` targets, and `focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body` across Standard AA and High Contrast AAA.
- **Portions leave-by-saving (`useSupperServingsEditor.tsx`):** Leaving Portions with valid edits automatically saves and continues (matching activating `Recipes`) instead of interrupting with the 3-button `Unsaved portions` gate; stale/uncertain saves automatically read current saved portions and surface a compact Era 3 Hearth recovery card with one primary save/retry action and a quiet discard/leave escape (no manual `Review saved portions` click gate or raw `Retry` button).
- **Grocery list & Usual Portions (`GroceryList.tsx`, `UsualPortionsSection.tsx`):** Automatically clear the Era 3 Garden `Shopping list updated` notice on the next grocery interaction (retaining a `>= 48px` close control); on Settings Usual portions conflict or uncertain save, automatically load the current saved baseline inline so the user only sees updated state and `Save usual portions` (removing `Review current portions`).
- **Planning day chooser & Non-cooking replacement (`PlanningDayChooser.tsx`, `NonCookingReplacementConfirmation.tsx`, `planner/page.tsx`):** Compact `PlanningDayChooser` to `<` / week range / `>` + top-right close control (removing the bottom `Cancel` and bulky week buttons); limit `NonCookingReplacementConfirmation` to one primary pull-forward `<Button>` (`Replace supper plan`, retry, or `Review plan`) plus `Cancel` without extra nested gates before any commit; auto-dismiss routine `planner-planning-confirmation` success banners while rendering refresh/changed failures in Era 3 Hearth alert styling with `<Button>` recovery.
- **Recipe detail conflict auto-reconciliation (`RecipeDetailSheet.tsx`):** When edit recovery or conflict occurs, automatically fetch the saved recipe baseline, merge untouched fields, and pre-select the user's active draft on conflicting fields with Era 3 `aria-pressed` pill toggles directly above `Save changes` / `Cancel` (removing `Check saved recipe`, `Reconcile draft`, `Apply reviewed draft`, and the raw `Original recovered draft` dump unless schema conversion needs a read-only reference).
- **Cook’s Mode & Recipes continuation (`CooksMode.tsx`, `RecipesExperience.tsx`):** Automatically apply remote quantity updates when no ingredients are checked and no steps were advanced or edited; once cooking work is underway, present one unified Era 3 bar with one pull-forward `<Button>` instead of stacking refresh and preparation-review bars. Seamlessly restart once when Search load-more encounters a `409` expired cursor (removing the dead-end `Restart search` button) and render Era 3 `<Button>` `Retry` controls on genuine failures.

## Capabilities

### New Capabilities

### Modified Capabilities

- `visual-design-contract`: Add normative Family Cookbook surface, `<Button>`, contrast (`aa`/`aaa`), and `320 CSS px` / `200%` text reflow rules for inline decision, recovery, and status surfaces.
- `meal-planning`: Auto-save valid Portions drafts on departure and auto-fetch conflict state into a simplified Era 3 recovery card.
- `supper-servings`: Auto-clear Grocery Portions updated notices on interaction and auto-load current saved Usual portions on Settings save conflict/uncertainty.
- `meal-assignment`: Streamline `PlanningDayChooser` navigation/dismissal, constrain `NonCookingReplacementConfirmation` to one primary pull-forward `<Button>` plus `Cancel`, and auto-dismiss routine Planner planning confirmations while distinguishing Hearth refresh failures.
- `recipe-editing`: Automatically fetch saved recipes on edit conflict/recovery and pre-select active-draft conflict defaults for direct `Save changes` / `Cancel`.
- `cooking`: Auto-apply remote quantity updates before cooking progress starts and unify in-progress refresh / preparation-review into one Era 3 bar.
- `recipe-search`: Automatically restart once on `409` expired Search continuation cursors during load-more and retain Era 3 `Retry` recovery for failures.

## Impact

- **Affected PWA Owners:** `pwa/src/components/planner/useSupperServingsEditor.tsx`, `pwa/src/app/(app)/planner/page.tsx`, `pwa/src/components/planner/GroceryList.tsx`, `pwa/src/components/profile/UsualPortionsSection.tsx`, `pwa/src/components/recipes/PlanningDayChooser.tsx`, `pwa/src/components/recipes/NonCookingReplacementConfirmation.tsx`, `pwa/src/components/recipes/RecipeDetailSheet.tsx`, `pwa/src/components/planner/CooksMode.tsx`, `pwa/src/app/(app)/recipes/RecipesExperience.tsx`, `pwa/src/locales/en/common.json`, `pwa/src/locales/fr/common.json`.
- **Verification & Documentation Owners:** `pwa/src/test/visual-contract.test.ts`, affected Vitest unit suites and Playwright E2E suites (`planner-portions-refinement`, `supper-servings`, `recipe-editing`, `meal-assignment`, `cooking`, `recipe-search`), `docs/visual-language-reference.md`.
- **Contracts / Backend / Database:** None (no API, OpenAPI, DTO, or database schema changes).
