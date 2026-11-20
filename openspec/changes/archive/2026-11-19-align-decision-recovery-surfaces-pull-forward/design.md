# Design

Refer to `proposal.md` for motivation, scope, and capability mapping, and to the seven delta specs in `specs/` for normative requirements.

## Context and Existing Ownership

Each affected flow already owns its domain state, concurrency tokens, and API calls inside the PWA; none requires new backend endpoints or OpenAPI changes:

- **Shared Era 3 Primitives & Ratchets (observed):**
  - `pwa/src/components/ui/button.tsx`: exports `Button` (`primary`, `secondary`, `ghost`, `danger`, `min-h-12`/`min-h-14`, `focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body`).
  - `pwa/src/app/globals.css`: defines dual-mode CSS custom properties (`--role-ink-body`, `--role-ink-muted`, `--role-hearth-fill`, `--role-hearth-ink`, `--role-hearth-line`, `--role-garden-fill`, `--role-garden-ink`, `--role-garden-line`, `--role-chrome-line`, `--role-icon-affordance`) switching automatically under `:root[data-contrast='high']`.
  - `pwa/e2e/visual-a11y-contract.ts` & `pwa/src/test/visual-contract.test.ts`: enforce runtime composite contrast (`aa` and `aaa`), `>= 48 × 48 CSS px` targets, zero overflow at `320 CSS px` / `200%` text scaling, and static source token hygiene (`LEGACY_ERA_ALLOWLIST = {}`).

- **Tier 1 Surfaces to Upgrade (observed):**
  1. `pwa/src/components/planner/useSupperServingsEditor.tsx`: owns `portions-mode-strip`, header, `portions-restored`, `portions-review`, `portions-saved-review`, `portions-departure`, and `readSupperServings`/`saveSupperServings` draft/history lifecycle (`save`, `review`, `requestDeparture`, `onBack`).
  2. `pwa/src/app/(app)/planner/page.tsx`: owns `planner-planning-confirmation` banner (`visibleConfirmation`, `planner-confirmation-refresh`, `planner-confirmation-dismiss`).
  3. `pwa/src/components/planner/GroceryList.tsx`: owns `grocery-portions-updating`, refresh-failed alert (`retryPortions`), and `grocery-portions-summary` (`dismissedSummaries`, `noticeKey`).
  4. `pwa/src/components/profile/UsualPortionsSection.tsx`: owns Settings usual-portions editing, `reviewRequired` / `uncertain` / `load-error` states, and `read` / `commit`.
  5. `pwa/src/components/recipes/PlanningDayChooser.tsx`: owns dated week switcher (`planning-week-previous`, `planning-week-next`), schedule read/retry, day list (`planning-day-${index}`), and `planning-day-cancel`.
  6. `pwa/src/components/recipes/NonCookingReplacementConfirmation.tsx`: delegates state transitions to `useReplacementRecovery` (`pwa/src/lib/planner/useReplacementRecovery.ts`) and renders replacement confirmation, retry/review, and abandon steps.
  7. `pwa/src/components/recipes/RecipeDetailSheet.tsx`: owns `previewError`, `projectionError`, `canonicalEditing` ingredient validation error, `notesDraft` error/retry (`recipe-notes-retry`), `editError`, edit conflict/recovery reconciliation (`saveNeedsRead`, `reconcileOpen`, `reconcileChoices`, `editorSession.original`), and bottom planning actions.
  8. `pwa/src/components/planner/CooksMode.tsx`: owns dated projection alerts (`projectionError`), remote `quantitiesAvailable` / `quantityRefreshError`, `preparationReview`, `stepEditError`, `completionError`, and `currentViewSaveState === 'failed'`.
  9. `pwa/src/app/(app)/recipes/RecipesExperience.tsx`: owns `planning-mode-banner`, `browse-request-error`, `historyRestartRequired`, `browse-goto-empty`, `search-request-error`, `search-empty-state`, list/stack pagination `search-load-more-retry`, `search-restart-expired`, and stack `failedNavigation` (`stack-page-retry`).

## Decisions and Tradeoffs

1. **Auto-save valid Portions edits on departure (`useSupperServingsEditor.tsx`) instead of a 2-button pause dialog**
   - *Choice:* Leaving Portions (clicking `Recipes`, switching to `Grocery list`, clicking nav links caught by `registerPortionsDeparture`, or browser Back when `dirty`) immediately invokes `save(next)` when `valid` is true and no unresolved error/conflict fence is active.
   - *Tradeoff vs. simplified 2-button pause:* Eliminates a modal interruption on the common happy path (editing a count and tapping Grocery/nav), matching how other inline editors work and matching `Recipes` click behavior. Only when a count is invalid or `save` fails/conflicts does navigation pause with an Era 3 Hearth card (`Try again` or `Save` + quiet `Discard` / leave). Note: browser `beforeunload` (tab close/refresh) still triggers the native browser confirmation when async save cannot finish synchronously.

2. **Automatic baseline reads + smart-default active draft on conflict (`useSupperServingsEditor.tsx`, `UsualPortionsSection.tsx`, `RecipeDetailSheet.tsx`)**
   - *Choice:* Rather than forcing the user to click `Review saved portions`, `Review current portions`, or `Check saved recipe` -> `Reconcile draft` -> `Apply reviewed draft`, each owner triggers the authoritative GET automatically as soon as recovery/conflict is entered. For `RecipeDetailSheet`, untouched fields adopt the newly fetched saved values immediately and conflicting fields pre-initialize `reconcileChoices[field] = 'draft'` (or `'current'` only when ingredient schema conversion prevents keeping legacy ingredient drafts), so activating `Save changes` merges and submits directly.
   - *Tradeoff:* Saves 1–3 clicks on every conflict without ever silently overwriting concurrent work, because conflicting fields remain visibly flagged with Era 3 `aria-pressed` pill toggles and `Save changes` still submits against the freshly verified baseline/revision. If the automatic baseline read itself fails, a single `>= 48px` `<Button>` `Retry` appears.

3. **Reuse existing semantic CSS tokens & `<Button>` inline rather than creating a new global Alert/Recovery wrapper library**
   - *Choice:* Restyle each Tier 1 component directly with Era 3 Tailwind tokens (`bg-white border-chrome-line`, `bg-terracotta-50 border-hearth-line`, `bg-sage-50 border-garden-line`, `text-ink-body`, `text-ink-muted`, `text-hearth-ink`, `text-garden-ink`, `font-heading`, `focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body`) and `pwa/src/components/ui/button.tsx` (`<Button>`), keeping local surface semantics intact.
   - *Tradeoff:* Zero speculative abstraction (matching `.agents/core/mission.md`) while guaranteeing each component clears static and browser contrast checks directly.

4. **Bounded single auto-restart on Search `409` expired cursors (`RecipesExperience.tsx`) and progress-gated auto-refresh in Cook’s Mode (`CooksMode.tsx`)**
   - *Choice:* When `loadMoreSearch` hits `409` on an active Search generation, it executes at most one automatic fresh `runSearch` (guarded per continuation attempt so repeated `409`s cannot loop infinitely) and surfaces `<Button>` `Retry` only on failure. In `CooksMode`, "no cooking work started" is defined from existing component state (`checkedIngredients.size === 0 && activeStepIndex === 0 && !isEditing && !scrolledPastStart`), auto-applying remote projections cleanly until the user interacts.
   - *Tradeoff:* Removes dead-end `Restart search` and interruptions before cooking begins while guaranteeing in-progress checklists, scroll position, and step drafts are never wiped out silently.

## First Observable Slice

The first vertical slice upgrades **`pwa/src/components/planner/useSupperServingsEditor.tsx`** (alongside `pwa/src/locales/en/common.json` and `pwa/src/locales/fr/common.json`), because the "Unsaved portions" `portions-departure` box triggered this change. Switching tabs or navigating away with valid draft edits persists the batch directly via `PUT /api/schedule/servings` before continuing; simulated conflict/failure automatically invokes `GET /api/schedule/servings` and renders the compact Era 3 Hearth recovery card with `<Button>` actions, verified by Vitest and Playwright (`planner-portions-refinement.spec.ts` & `supper-servings.spec.ts`) in AA, AAA, and `320px/200%`.

## State, Concurrency and Recovery

- **Portions departure concurrency (`useSupperServingsEditor.tsx`):** `save(pendingNext)` sets `uncertainSave = true` before `PUT`. If `PUT` rejects or times out while leaving, `pendingNext` stays captured in component state, the departure proceeds no further, and `review()` auto-runs to reconcile `matchesIntent`:
  - If server state already matches the intended draft, `close()` runs and `pendingNext` completes transparently.
  - Otherwise, if a draft count is valid, the Hearth card offers one primary `<Button>` (`Save mine` / `Try again`) + quiet `<Button variant="ghost">` (`Discard changes`, which calls `close()` and invokes `pendingNext`); if an automatic read fails, one `<Button>` `Retry` recovers.
  - Rapid duplicate navigation taps while `pending` is true are ignored via the existing pending fence (`!pending`).
- **Recipe edit conflict resolution (`RecipeDetailSheet.tsx`):** On recovered draft or `409` conflict (`saveNeedsRead`), `useEffect` triggers one token-guarded `getRecipe(recipeId)` read (`saveVisitRef` / `reconcileReadRef`). Untouched fields adopt `currentSavedRecipe`; conflicting fields pre-populate `reconcileChoices` to `'draft'` (unless schema conversion makes ingredients reference-only). Activating `Save changes` computes merged fields once and submits `PATCH /api/recipes/{id}` against `currentEditorBaseline.revision`.
- **Single-attempt `409` Search restart (`RecipesExperience.tsx`):** Track a boolean/generation ref (`restartedGenerationRef`) per continuation trigger so if a `409` triggers one fresh search and that fresh search fails or returns `409`, Search stops cleanly and displays `<Button>` `Retry` without infinite request recursion.
- **Planner confirmation timer & Grocery interaction clear:** `planner/page.tsx` auto-dismisses non-error/non-spillover routine confirmations (`kind === 'planned'` when simple confirmation, preserving spillover/replacement receipts and `refresh-failed`/`changed` Hearth alerts) using an unmount/week-change-safe `setTimeout`. `GroceryList.tsx` clears `summary` (`noticeKey`) automatically when item check, extra edit/add/toggle, or aisle action handlers run.

## User Experience

| Surface | Removed Controls | Remaining / Pull-Forward Controls (Era 3) |
|---|---|---|
| Portions (`useSupperServingsEditor.tsx`) | 3-button `Unsaved portions` gate on valid leave; manual `Review saved portions` click gate | Auto-save on leave; Hearth recovery card with 1 primary `<Button>` + quiet `Discard` when blocked; Garden restored banner |
| Planner banner (`planner/page.tsx`) | Manual `Close` on routine confirmations; green styling on failures | Auto-dismiss calm Garden confirmations; persistent Hearth card + `<Button>` `Refresh` on failure; accessible close on spillover receipts |
| Grocery (`GroceryList.tsx`) | Mandatory manual dismiss on `Shopping list updated` | Auto-clear calm Garden notice on interaction (+ `48px` icon `×` fallback); Hearth banner + `<Button>` `Retry` on failure |
| Usual portions (`UsualPortionsSection.tsx`) | Manual `Review current portions`; input-styled buttons | Auto-load baseline into inline Hearth card; single `<Button variant="primary">` `Save usual portions` (or `Retry` on read fail) |
| Day chooser (`PlanningDayChooser.tsx`) | Bottom `Cancel`; bulky `Previous week` / `Next week` buttons | Compact `<` / week / `>` header + `48px` `×` button + backdrop/Escape dismiss; `<Button>` `Retry` on week-read fail |
| Non-cooking confirm (`NonCookingReplacementConfirmation.tsx`) | `Review plan` during transient retry; nested `Back`/`Close` before any commit | 1 primary `<Button>` (`Replace supper plan`, `Retry`, or `Review plan`) + `<Button variant="secondary">` `Cancel` |
| Recipe detail (`RecipeDetailSheet.tsx`) | `Check saved recipe`, `Reconcile draft`, `Apply reviewed draft`, raw `Original recovered draft` dump | Auto-loaded saved baseline + active-draft smart-default `aria-pressed` pill toggles directly above `Save changes` / `Cancel`; Hearth inline errors with `>= 48px` `<Button>` retries |
| Cook’s Mode (`CooksMode.tsx`) | Interrupting `Refresh quantities` before cooking starts; stacked refresh + preparation-review strips | Auto-apply before cooking progress; 1 unified Era 3 bar with 1 `<Button>` once cooking started; Hearth `<Button>` retries for step/view/projection errors |
| Recipes search (`RecipesExperience.tsx`) | Dead-end `Restart search` button on `409` cursor; raw unstyled list buttons | Seamless single auto-restart on `409`; `<Button>` `Retry` on real errors; Era 3 `planning-mode-banner` (`bg-terracotta-50 border-hearth-line`) |

All interactive elements enforce `>= 48 × 48 CSS px`, `font-heading` titles in sentence case, zero sub-12px typography, `focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body`, and bilingual EN/FR copy updates in `pwa/src/locales/en/common.json` and `pwa/src/locales/fr/common.json`.

## Risks and Deferrable Questions

- **Existing E2E tests asserting removed manual gates or button test IDs:** Existing specs such as `pwa/e2e/supper-servings.spec.ts`, `pwa/e2e/recipe-editing.spec.ts` / conflict specs, `pwa/e2e/recipe-search.spec.ts`, and `pwa/e2e/prepared-supper.spec.ts` will explicitly click removed triggers (`portions-save-continue`, `Review saved portions`, `Check saved recipe`, `Restart search`, `planning-day-cancel`). Each vertical slice updates those affected tests alongside code changes (red/green first) so tests verify the streamlined pull-forward behavior plus `assertCookbookVisualA11y` (`aa` & `aaa`).
- **Auto-save race on route unmount (Deferrable implementation choice):** Registering departure listeners through `registerPortionsDeparture` / tab switch awaits the `save()` promise before routing, while component unmount cleanup must still safely ignore late state updates via the existing `lifetime` ref.
