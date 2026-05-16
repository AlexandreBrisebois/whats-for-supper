# E2E → Unit Test Migration Map

Generated: 2026-05-16  
Methodology: test-audit skill + manual classification against existing unit test coverage.

---

## Classification key

| Label | Meaning |
|---|---|
| **KEEP** | True integration/navigation seam — needs a real browser and route wiring |
| **MIGRATE** | Logic test dressed as E2E — move body to Vitest, keep one happy-path E2E |
| **ALREADY COVERED** | Unit test already exists; E2E test is fully redundant → delete E2E |
| **MERGE** | Consolidate with another E2E (overlap) |
| **BRITTLE** | Selector or timing issue to fix first |

---

## Summary table

| Spec file | Tests | Keep | Migrate | Already covered | Notes |
|---|---|---|---|---|---|
| `auth-flow.spec.ts` | 4 | 4 | 0 | 0 | Pure navigation seam |
| `onboarding.spec.ts` | 4 | 4 | 0 | 0 | Navigation + store init |
| `identity-persistence.spec.ts` | 2 | 2 | 0 | 0 | Cross-page cookie/store seam |
| `demo-mode.spec.ts` | 2 | 1 | 1 | 0 | welcome pre-fill is component logic |
| `home-recipe.spec.ts` | 13 | 5 | 8 | 0 | Recovery dialog logic duplicated by SkipRecoveryDialog.test.tsx |
| `home-goto.spec.ts` | 14 | 6 | 8 | 0 | GOTO state machine logic; some covered by todayStore.test.ts |
| `home-race.spec.ts` | 3 | 3 | 0 | 0 | Race/timing tests need real browser |
| `cook-mode-steps.spec.ts` | 3 | 1 | 2 | 0 | Step display already in CooksMode.test.tsx |
| `planner.spec.ts` | 10 | 6 | 4 | 0 | Drag reorder, smart defaults UI need browser; week-flip is logic |
| `planner-full-cycle.spec.ts` | 6 | 6 | 0 | 0 | Full voting/locking cycle; SSE seams |
| `discovery.spec.ts` | 9 | 6 | 3 | 0 | Category exhaustion logic → discoveryStore.test.ts |
| `action-pivot.spec.ts` | 5 | 3 | 2 | 0 | Context propagation is logic |
| `recipes.spec.ts` | 15 | 10 | 5 | 0 | Filter logic, agent search → unit; navigation seams keep |
| `search-hardening.spec.ts` | 7 | 7 | 0 | 0 | Error recovery, bin/restore flows — all integration |
| `capture-flow.spec.ts` | 21 | 12 | 9 | 0 | SSE/toast flows keep; form validation logic migrate |
| `settings.spec.ts` | 9 | 2 | 7 | 0 | Mostly duplicated by FailedCapturesSection.test.tsx + FamilyGOTOSettings.test.tsx |
| `grocery.spec.ts` | 2 | 2 | 0 | 0 | PATCH failure + SSE jitter — both need browser |
| `sharing-fidelity.spec.ts` | 2 | 2 | 0 | 0 | File download + import round-trip needs browser |
| `recipe-share.spec.ts` | 5 | 3 | 2 | 0 | Visibility logic for share button |
| `recipe-hero-actions.spec.ts` | 3 | 3 | 0 | 0 | File upload, API integration |
| `recipe-original-viewer.spec.ts` | 3 | 1 | 2 | 0 | Hidden/visible logic is component state ❌ brittle `svg` selector |
| `utility-flows.spec.ts` | 3 | 1 | 2 | 0 | Cook mode steps → CooksMode.test.tsx; grocery load → GroceryList.test.tsx |
| `browse-all-stack.spec.ts` | 26 | 14 | 12 | 0 | Toggle, depth, endless nav logic; keep swipe/entry/overlay seams |
| `browse-stack.spec.ts` | 2 | 2 | 0 | 0 | Navigation smoke tests |
| `profile.spec.ts` | 3 | 3 | 0 | 0 | Navigation seam |
| `bug-condition-exploration.spec.ts` | 4 | 4 | 0 | 0 | Regression guards for specific routing/LIFO bugs |
| **TOTAL** | **180** | **101** | **79** | | |

---

## Per-spec migration details

### `home-recipe.spec.ts` — 8 MIGRATE

These all assert on `SkipRecoveryDialog` state transitions. The component is already unit-tested at `SkipRecoveryDialog.test.tsx`. Keep one seam E2E per vertical slice.

| Test | Action | Target unit file |
|---|---|---|
| `"Order In" with no recipe writes status:3 and hides pivot card` | KEEP (API write + DOM seam) | — |
| `"Order In" with recipe opens SkipRecoveryDialog before committing` | KEEP (dialog open seam) | — |
| `"Pick Something Else" flow opens Quick Find then Step 2` | MIGRATE: dialog step logic | `SkipRecoveryDialog.test.tsx` |
| `"Order In → Move to Tomorrow" sends recipeId and closes dialog` | MIGRATE: recipeId forwarding logic | `SkipRecoveryDialog.test.tsx` |
| `"Order In → Drop Tonight" marks tonight ordered in and navigates to planner` | KEEP (navigation seam) | — |
| `Closing Quick Find after "Pick Something Else" exits without changing tonight` | MIGRATE: modal close state | `SkipRecoveryDialog.test.tsx` |
| `Page reload after "Order In" (no recipe) does not show pivot card` | KEEP (store persistence seam) | — |
| `Page reload after "Order In" (no recipe) does not show pivot card — post-todayStore refactor` | MERGE → consolidate with above (duplicate intent) | — |
| `Quick Find from pivot card shows TonightMenuCard immediately and calls assign API` | KEEP (optimistic UI seam) | — |
| `Completing Cook Mode marks meal as cooked` | KEEP (API write seam) | — |
| `Planner Quick Find for today's slot → navigating to home shows TonightMenuCard` | KEEP (cross-page nav seam) | — |
| `SSE slot_updated for today → TonightMenuCard appears without navigation or poll` | KEEP (SSE seam) | — |
| `Shows tonight menu card when recipe is planned` | KEEP (smoke test) | — |

---

### `home-goto.spec.ts` — 8 MIGRATE

GOTO state machine logic (pending/ready/spinner) is already partially covered by `todayStore.test.ts`. The SSE-triggered transitions and navigation seams stay.

| Test | Action | Target unit file |
|---|---|---|
| `Shows Pivot Card when no recipe is planned` | KEEP (smoke) | — |
| `Confirming GOTO plans the meal` | KEEP (API write seam) | — |
| `Menu card stays after GOTO confirm when schedule re-sync returns empty` | KEEP (race seam) | — |
| `Tapping GOTO on home shows loading state then redirects to planner` | KEEP (navigation seam) | — |
| `Empty state shows correct header and no badge` | MIGRATE: header/badge rendering logic | `pwa/src/components/home/HomeCommandCenter.test.tsx` |
| `GOTO ready state shows Make This Tonight button with ghost secondary buttons` | MIGRATE: button visibility logic | `pwa/src/components/home/HomeCommandCenter.test.tsx` |
| `Empty state (default routes) shows correct header and no badge` | MIGRATE: duplicate of above pattern | `pwa/src/components/home/HomeCommandCenter.test.tsx` |
| `Empty state shows ochre CTA button in footer` | MIGRATE: styling assertion | `pwa/src/components/home/HomeCommandCenter.test.tsx` |
| `GOTO-ready state shows "Make This Tonight" button` | MIGRATE: duplicate of ready-state check | `pwa/src/components/home/HomeCommandCenter.test.tsx` |
| `GOTO-ready state — secondary buttons are ghost/outline style` | MIGRATE: styling assertion | `pwa/src/components/home/HomeCommandCenter.test.tsx` |
| `SSE recipe_ready event makes confirm-goto-btn appear without polling` | KEEP (SSE seam) | — |
| `Pending GOTO transitions to ready via SSE recipe_ready event` | KEEP (SSE state transition seam) | — |
| `"Make This Tonight" shows TonightMenuCard immediately without waiting for network` | KEEP (optimistic UI seam) | — |
| `"Make This Tonight" → navigating to planner shows recipe in today's slot` | KEEP (cross-page nav seam) | — |

---

### `settings.spec.ts` — 7 MIGRATE

The component-level behaviour (failure rows, retry state, clear, GOTO spinner/ready, language toggle) is fully covered by existing unit tests. Only the clipboard integration and name-edit round-trip need the browser.

| Test | Action | Reason |
|---|---|---|
| `Settings page renders failed-captures-section` | **ALREADY COVERED** → delete | `FailedCapturesSection.test.tsx` `it('renders failed-captures-section')` |
| `renders failure row with friendly reason` | **ALREADY COVERED** → delete | `FailedCapturesSection.test.tsx` `it('renders each failure row...')` |
| `retry tap calls retry endpoint and shows in-progress state` | **ALREADY COVERED** → delete | `FailedCapturesSection.test.tsx` `it('shows action-retry-<id>-retrying...')` |
| `clear tap calls clear endpoint and removes row from list` | **ALREADY COVERED** → delete | `FailedCapturesSection.test.tsx` `it('action-clear-<id>...')` |
| `GOTO ready state shows recipe name when status endpoint returns ready` | MIGRATE: GOTO ready rendering | `FamilyGOTOSettings.test.tsx` |
| `GOTO pending state shows subtitle and description echo` | MIGRATE: GOTO pending rendering | `FamilyGOTOSettings.test.tsx` |
| `language toggle selection persists on navigation` | KEEP (localStorage + navigation seam) | — |
| `family member name can be edited from settings` | KEEP (API write + DOM seam) | — |
| `invite dialog can copy the generated link and close cleanly` | KEEP (clipboard API integration) | — |

---

### `cook-mode-steps.spec.ts` — 2 MIGRATE

Step rendering from `HowToSection[]` is already thoroughly covered by `CooksMode.test.tsx`.

| Test | Action | Reason |
|---|---|---|
| `Home page Cook Mode shows real recipe steps for HowToSection[] recipe` | MIGRATE → delete | `CooksMode.test.tsx` `it("keeps check and prep focused on ingredients...")` covers step parsing |
| `Planner Cook Mode shows real recipe steps for HowToSection[] recipe` | MIGRATE → delete | Same — entry point differs but the component under test is identical |
| `completing all steps shows celebration overlay then navigates to /home` | KEEP | Navigation + celebration seam — `done` state + `toHaveURL(/\/home/)` is a real browser seam |

---

### `utility-flows.spec.ts` — 2 MIGRATE

| Test | Action | Reason |
|---|---|---|
| `Planner page loads without crashing and shows day cards` | KEEP (smoke test) | — |
| `Cook's mode shows parsed steps` | MIGRATE → delete | Duplicate of `cook-mode-steps.spec.ts`; step parsing covered by `CooksMode.test.tsx` |
| `Grocery checklist persists state across refresh` | MIGRATE | Persistence is a store concern → `weekStore.test.ts` or `GroceryList.test.tsx` |
| `Grocery list loads from the API` | KEEP | API route → render seam |

---

### `browse-all-stack.spec.ts` — 12 MIGRATE

Entry points, swipe gestures, overlay structure, and empty state need the browser. Toggle state, depth indicator math, and card detail sheet visibility are component logic.

| Test | Action | Target unit file |
|---|---|---|
| `Home page trigger opens Browse All Stack overlay` | KEEP (navigation seam) | — |
| `overlay container is visible` | MIGRATE: smoke render | `browseStackStore.test.ts` or new `BrowseAllStack.test.tsx` |
| `exit button is visible` | MIGRATE: smoke render | same |
| `stack action bar is visible with depth indicator` | MIGRATE: render check | same |
| `saved List preference is restored on entry` | MIGRATE: store restore logic | `browseStackStore.test.ts` |
| `user switches to List, leaves the page, returns, and List is restored` | KEEP (navigation + persistence seam) | — |
| `List infinite scroll loads the next page without a manual button` | KEEP (pagination API seam) | — |
| `exit button dismisses the overlay` | KEEP (navigation seam) | — |
| `swipe left advances to next card` | KEEP (gesture seam) | — |
| `swipe right returns to previous card` | KEEP (gesture seam) | — |
| `first card wraps to last recipe on swipe right` | KEEP (wrap-around seam) | — |
| `swiping left on last card loops to the first card` | KEEP (wrap-around seam) | — |
| `depth indicator shows correct position and total` | MIGRATE: counter logic | `browseStackStore.test.ts` |
| `depth indicator updates when card changes` | MIGRATE: counter update | `browseStackStore.test.ts` |
| `discoverable toggle is visible for the front card` | MIGRATE: visibility logic | new `BrowseAllStack.test.tsx` |
| `tapping discoverable toggle shows loading state` | KEEP (optimistic UI + API seam) | — |
| `discoverable toggle reverts on error` | KEEP (error revert seam) | — |
| `discoverable toggle updates when front card changes` | MIGRATE: card-change reactivity | `browseStackStore.test.ts` |
| `tapping a card opens the Recipe Detail Sheet` | KEEP (sheet open seam) | — |
| `closing the Recipe Detail Sheet returns to the same card` | MIGRATE: close → return-to-card logic | `browseStackStore.test.ts` |
| `shows empty state when library is empty` | MIGRATE: conditional render | new `BrowseAllStack.test.tsx` |
| `empty state CTA navigates to /capture` | KEEP (navigation seam) | — |
| `End Card is not shown when library is empty` | MIGRATE: render condition | new `BrowseAllStack.test.tsx` |
| `non-empty libraries never show the End Card while looping forward` | KEEP (loop behaviour seam) | — |
| `recycle bin entry is visible and opens the trash view` | KEEP (navigation seam) | — |
| `header buttons are ordered correctly` | MIGRATE: layout/ordering assertion | new `BrowseAllStack.test.tsx` |

---

### `recipe-original-viewer.spec.ts` — 2 MIGRATE  ❌ brittle `svg` selector

| Test | Action | Reason |
|---|---|---|
| `View Original is hidden for synthesized description-only recipes` | MIGRATE | Pure conditional-render logic based on `sourceType` |
| `View Original shows ExternalLink icon and opens URL for URL-based recipes` | MIGRATE + fix brittle `svg` selector | Uses `viewButton.locator('svg')` — add `data-testid="view-original-icon"` |
| `View Original shows Images icon and opens viewer for photo-based recipes` | KEEP | Viewer open/close is a DOM interaction seam |

---

### `capture-flow.spec.ts` — 9 MIGRATE

Form validation, error messages, and secondary action visibility are component logic. SSE callbacks, file upload, and navigation seams stay.

| Test | Action | Target unit file |
|---|---|---|
| `user can complete the capture flow and see a success message` | KEEP (full flow seam) | — |
| `large photo uploads show immediate upload feedback and a delayed overlay` | KEEP (SSE/upload seam) | — |
| `after successful capture, user can return to home` | KEEP (navigation seam) | — |
| `capture cancel button returns the user home` | KEEP (navigation seam) | — |
| `navigating with url param allows reviewing and manual saving` | KEEP (URL param seam) | — |
| `navigating with text param containing a URL should show the review form` | KEEP (URL param seam) | — |
| `failed URL capture shows error message` | MIGRATE | Component-level error state | `MinimalCapture.test.tsx` |
| `malformed 202 with missing recipe id shows error message` | MIGRATE | Edge-case error render | `MinimalCapture.test.tsx` |
| `tab switcher is absent and capture controls are visible on load` | MIGRATE | Conditional render | `MinimalCapture.test.tsx` |
| `clicking the link secondary action shows the URL review form` | KEEP (secondary action seam) | — |
| `clicking Back from URL review form returns to capture controls` | KEEP (navigation seam) | — |
| `clicking Describe_Link reveals the form and hides the link` | MIGRATE | Toggle visibility logic | `MinimalCapture.test.tsx` |
| `submitting with empty recipe name shows validation error` | MIGRATE | Validation logic | `MinimalCapture.test.tsx` |
| `Describe it creates a pending GOTO setting` | KEEP (API write seam) | — |
| `Photo capture with intent=goto sets GOTO pending` | KEEP (API write seam) | — |
| `Pending GOTO shows spinner in FamilyGOTOSettings` | KEEP (cross-component seam) | — |
| `photo submit shows recipe queued state and redirects home` | KEEP (navigation seam) | — |
| `SSE recipe_ready → LibraryToast appears with recipe name` | KEEP (SSE seam) | — |
| `LibraryToast drawer actions let the user add a recipe to this week` | KEEP (interaction seam) | — |
| `SSE recipe_failed → RecipeFailureBanner appears with retry CTA` | KEEP (SSE seam) | — |
| `RecipeFailureBanner dismiss action removes the failed notification` | MIGRATE | Dismiss logic covered by `RecipeFailureBanner.test.tsx` |

---

### `discovery.spec.ts` — 3 MIGRATE

Category exhaustion progression is state machine logic already partially in `discoveryStore.test.ts`.

| Test | Action | Target unit file |
|---|---|---|
| `should fetch categories and then fetch the first category stack` | KEEP (API seam) | — |
| `should swipe through all categories and show summary` | KEEP (gesture + summary seam) | — |
| `SSE fill_the_gap_invalidated: recipe card fades out and micro-badge appears` | KEEP (SSE seam) | — |
| `should auto-advance past empty first category to next non-empty category` | MIGRATE | Category-skip logic → `discoveryStore.test.ts` |
| `should skip multiple empty categories before showing first non-empty category` | MIGRATE | Same — duplicate scenario | `discoveryStore.test.ts` |
| `refresh button should be hidden while voting categories are available` | MIGRATE | Conditional render | new `DiscoveryCard.test.tsx` or `discoveryStore.test.ts` |
| `refresh button should appear only after all categories are exhausted` | KEEP (end-of-stack seam) | — |
| `SSE fill_the_gap empties last card in category → auto-advances` | KEEP (SSE seam) | — |
| `SSE vote_updated: ring appears on voted card` | KEEP (SSE seam) | — |

---

### `demo-mode.spec.ts` — 1 MIGRATE

| Test | Action | Target unit file |
|---|---|---|
| `pre-populates the passphrase on the welcome page` | MIGRATE | `demoMode` health response → passphrase pre-fill is a `welcome/page.test.tsx` concern |
| `shows AI notice and prevents agent search on recipes page` | KEEP (feature-flag navigation seam) | — |

---

### `recipes.spec.ts` — 5 MIGRATE

| Test | Action | Target unit file |
|---|---|---|
| `searches on Enter and shows the top pick result` | KEEP (search API seam) | — |
| `planning mode can be cancelled back to the planner` | KEEP (navigation seam) | — |
| `shows the empty state when search returns no matches` | MIGRATE | Conditional render | `pwa/src/app/(app)/recipes/page.test.tsx` |
| `opens and closes the recipe detail sheet without losing the search results` | KEEP (sheet open/close seam) | — |
| `edits notes from the detail sheet and keeps the sheet open` | KEEP (API write + sheet seam) | — |
| `edits recipe card fields from a single edit mode` | KEEP (API write seam) | — |
| `uses planner mode CTA from the detail sheet and returns to the planner success state` | KEEP (navigation seam) | — |
| `tapping a filter pill marks it active and includes the filter in the next search request` | MIGRATE | Filter state logic | `pwa/src/app/(app)/recipes/page.test.tsx` |
| `combining two filter pills sends both filters in the request` | MIGRATE | Filter composition | `pwa/src/app/(app)/recipes/page.test.tsx` |
| `Find Similar fires a new search with similarToRecipeId set` | KEEP (API param seam) | — |
| `agent search trigger opens agent input, submit fires mode:agent search` | KEEP (feature-flag + API seam) | — |
| `agent search close hides the agent input and keeps existing results visible` | MIGRATE | Toggle state | `pwa/src/app/(app)/recipes/page.test.tsx` |
| `camera trigger opens popup; submit fires photo-search` | KEEP (file + API seam) | — |
| `camera cancel closes popup without making any photo-search API call` | MIGRATE | Cancel = toggle state | `pwa/src/app/(app)/recipes/page.test.tsx` |
| `toggling discovery from the detail sheet calls PATCH without navigating` | KEEP (API write seam) | — |

---

### `action-pivot.spec.ts` — 2 MIGRATE

| Test | Action | Target unit file |
|---|---|---|
| `Discovery flow: shows "Cook This" and then the pivot` | KEEP (multi-page navigation seam) | — |
| `Discovery flow: "Cook it tonight" navigates home` | KEEP (navigation seam) | — |
| `Planner flow: shows "Plan for {day}" directly` | KEEP (context propagation seam) | — |
| `Quick Find in Planner: propagates context to Search Library` | MIGRATE | URL param construction | `QuickFindModal.test.tsx` |
| `Discovery flow: "Plan for Later" skips past and current day` | MIGRATE | Day-skip logic | `QuickFindModal.test.tsx` |

---

### `planner.spec.ts` — 4 MIGRATE

| Test | Action | Target unit file |
|---|---|---|
| `should display the planner navigation and segmented control` | MIGRATE | Smoke render | `pwa/src/app/(app)/planner/page.test.tsx` |
| `should display 7 daily cards` | KEEP (API → render seam) | — |
| `should flip weeks when clicking chevrons` | MIGRATE | Week navigation logic | `weekStore.test.ts` |
| `should open the planning pivot sheet when clicking "+"` | KEEP (sheet seam) | — |
| `should complete the search-to-planner round-trip with success feedback` | KEEP (full API round-trip) | — |
| `should trigger Cook Mode from a recipe card and navigate steps` | KEEP (navigation seam) | — |
| `should display smart default recipes merged into the 7-day grid` | KEEP (API merge seam) | — |
| `should allow dragging cards to reorder` | KEEP (gesture seam) | — |
| `should assign pending smart default slots and lock when closing voting` | KEEP (API write seam) | — |
| `should SHOW Cook Mode button and OPEN even if recipe image is missing` | MIGRATE | Conditional button render | `pwa/src/app/(app)/planner/page.test.tsx` |

---

### `recipe-share.spec.ts` — 2 MIGRATE

| Test | Action | Target unit file |
|---|---|---|
| `detail share uses the visible action slot while edit stays in overflow` | KEEP (action slot layout seam) | — |
| `share button is hidden if hero image is missing or recipe is not ready` | MIGRATE | Conditional visibility | `RecipeDetailSheet.test.tsx` |
| `share button is hidden if recipe is not ready` | MIGRATE | Duplicate condition | `RecipeDetailSheet.test.tsx` |
| `share button is hidden if imageUrl is a placeholder` | KEEP (placeholder URL detection seam) | — |
| `manual .recipe import starts on capture, shows review, and exits back home` | KEEP (file import seam) | — |

---

## Migration batches (recommended execution order)

### Batch 1 — Deletions (zero new code, immediate win)

Delete these E2E tests outright because the unit test already covers the identical assertion:

1. `settings.spec.ts` — 4 tests: `renders failed-captures-section`, `renders failure row with friendly reason`, `retry tap calls retry endpoint and shows in-progress state`, `clear tap calls clear endpoint and removes row from list`
2. `cook-mode-steps.spec.ts` — 2 tests: `Home page Cook Mode shows real recipe steps`, `Planner Cook Mode shows real recipe steps` (keep `completing all steps → celebration → /home`)
3. `utility-flows.spec.ts` — 1 test: `Cook's mode shows parsed steps`

**Saves: 7 E2E tests removed. ~3–5 min CI time.**

### Batch 2 — Fix brittle selector, then migrate

1. `recipe-original-viewer.spec.ts`: Add `data-testid="view-original-icon"` to the ExternalLink `<svg>` in source. Then migrate the 2 logic tests to a new `RecipeOriginalViewer.test.tsx`.

### Batch 3 — Migrate to existing unit files (no new files needed)

Target files already exist; just add `it()` blocks:

| Migrate from | Migrate to | Count |
|---|---|---|
| `settings.spec.ts` | `FamilyGOTOSettings.test.tsx` | 2 |
| `home-goto.spec.ts` | `HomeCommandCenter.test.tsx` | 6 |
| `home-recipe.spec.ts` | `SkipRecoveryDialog.test.tsx` | 3 |
| `browse-all-stack.spec.ts` | `browseStackStore.test.ts` | 5 |
| `discovery.spec.ts` | `discoveryStore.test.ts` | 2 |
| `action-pivot.spec.ts` | `QuickFindModal.test.tsx` | 2 |
| `planner.spec.ts` | `weekStore.test.ts` | 1 |
| `recipes.spec.ts` | `recipes/page.test.tsx` | 4 |
| `capture-flow.spec.ts` | `MinimalCapture.test.tsx` | 4 |
| `recipe-share.spec.ts` | `RecipeDetailSheet.test.tsx` | 2 |

### Batch 4 — New unit files needed

| New file | Migrates from |
|---|---|
| `pwa/src/app/(app)/browse-all-stack/BrowseAllStack.test.tsx` | `browse-all-stack.spec.ts` (5 render checks) |
| `pwa/src/components/home/RecipeOriginalViewer.test.tsx` | `recipe-original-viewer.spec.ts` (2 tests) |
| `pwa/src/app/(auth)/welcome/WelcomePageDemoMode.test.tsx` | `demo-mode.spec.ts` (1 test) |
| `pwa/src/components/planner/PlannerPage.test.tsx` | `planner.spec.ts` (1 render check) |
| `pwa/src/components/capture/CaptureFlow.test.tsx` | `capture-flow.spec.ts` (4 form tests) |

---

## Invariants to preserve (do not delete these E2E tests)

These tests must remain as E2E even if they appear logic-heavy, because they verify cross-cutting seams:

- **SSE-driven UI updates** (`slot_updated`, `recipe_ready`, `fill_the_gap_invalidated`, `week_updated`, `vote_updated`) — SSE mocking via `page.route()` is the only way to test this reliably
- **Navigation seams** — `toHaveURL()` assertions that cross page boundaries
- **Optimistic UI** — tests where the UI must update before the API resolves
- **Store persistence across reloads** — `page.reload()` or multi-`goto()` flows
- **File download/upload seams** — `page.waitForEvent('download')` / `setInputFiles()`
- **Gesture seams** — swipe (`page.mouse`) interactions on framer-motion elements
- **Race condition guards** — `home-race.spec.ts`, `bug-condition-exploration.spec.ts`
