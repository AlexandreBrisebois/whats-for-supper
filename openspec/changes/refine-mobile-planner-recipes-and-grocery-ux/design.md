# Design

## Context and Existing Ownership

This change spans eight coordinated UX, configuration, and temporal refinements across existing household capabilities (see [proposal.md](./proposal.md) for scope and the delta specs under `specs/` for normalized requirements). Observed source ownership and current behavior:

1. **Planner Portions view & Today rendering (`pwa/src/components/planner/useSupperServingsEditor.tsx`, `pwa/src/app/(app)/planner/page.tsx`):**
   - Meals view (`PlannerDayCard` in `pwa/src/app/(app)/planner/page.tsx`) renders each day with a compact `Today` label + hairline divider (`planner-today-label`, `planner-today-separator`) above today's row, a `w-10` left-hand `.planner-date` column (`planner-date-marker` stacking weekday, day number, month), and a trailing `.planner-meal` surface (`bg-cream` for past days, `glass` for current/future days).
   - Portions view (`useSupperServingsEditor.tsx`) currently renders a flat flex-wrap card (`portion-row-${key}`) with an inline date string, left-aligned `- (val) +` stepper, full-row `grayscale` on read-only days, and an unstyled `Cooked` text span (`portion-cooked-${key}`).

2. **Deployment calendar timezone & browse cutoff (`api/src/RecipeApi/Services/DeploymentCalendar.cs`, `api/src/RecipeApi/Services/RecipeSearchService.cs`, `docker/`, `release-template/`, `Taskfile.yml`):**
   - `DeploymentCalendar` resolves `IConfiguration["Calendar:TimeZone"] ?? "UTC"` and projects instants via `Capture(DateTimeOffset instant, DateOnly? reference = null).Today`.
   - `release-template/synology/.env.example` and `docs/install/timezones.md` already specify `America/Toronto`, whereas `docker/compose/apps.yml`, `docker/compose/production.yml`, `release-template/synology/compose.yaml`, and `docker/.env.example` fall back to `UTC`, and `docker/compose/production-overrides.yml`, `docker/docker-compose.prod.yml`, `docker/docker-compose.nas.yml`, `docker/.env`, and `Taskfile.yml` (`dev:api`) omit `Calendar__TimeZone`.
   - `docker/compose/smoke.env` intentionally pins `Calendar__TimeZone=UTC`.
   - `RecipeSearchService.GetBrowseRankedRecipesAsync` (`api/src/RecipeApi/Services/RecipeSearchService.cs`) currently computes `today = DateOnly.FromDateTime(_clock.UtcNow.UtcDateTime)` rather than consulting `DeploymentCalendar`.

3. **Recipe edit mode & unit options (`pwa/src/components/recipes/RecipeDetailSheet.tsx`, `pwa/src/lib/recipes/ingredient-draft.ts`):**
   - Edit mode renders a full-width `<input data-testid="recipe-edit-servings-input">` beside `Servings`/`Portions`, free-text `<input>` fields for `recipe-edit-unit-${index}` and `recipe-edit-package-unit-${index}`, unstyled/micro-10px section labels (`text-[10px]`), full-width text buttons for `Remove ingredient` / `Remove step`, and a redundant `SAVE RECIPE EDITS` mobile footer caption.

4. **Toast feedback callers (`RecipeDetailSheet.tsx`, `planner/page.tsx`, `MinimalCapture.tsx`, `GroceryList.tsx`):**
   - `RecipeDetailSheet.tsx` fires info/success toasts on GOTO toggle, photo upload start (`Uploading photo...`), and manual import-issue actions (`Marked for review`, `Changes saved`, `Marked as resolved`).
   - `planner/page.tsx` fires a `toast` (`planner.recipePlanned`) alongside scrolling to `day-card-${result.dayIndex}`, applying the highlight ring, and clearing the `success` URL param.
   - `MinimalCapture.tsx` fires `Duplicate recipe discarded.` before `router.push('/')`.
   - `GroceryList.tsx` fires `Saved to {{section}}` using raw English `extra.grocerySection ?? 'Grocery'`.

5. **Grocery row spacing (`pwa/src/components/planner/GroceryList.tsx`):**
   - `#itemsRegionId` applies `p-[8px] @min-[18rem]:p-4` and every item row applies `p-[8px] @min-[18rem]:p-4`, compounding horizontal insets (`32px` total horizontal inset per side at `@min-[18rem]`), while `Tag` carries `@min-[18rem]:ml-2` inside a wrapping flex container with a `48px` `BookOpen` button and checkbox row.

6. **Discover nav pulsing (`pwa/src/components/common/Navigation.tsx`, `pwa/src/store/discoveryStore.ts`):**
   - `Navigation.tsx` sets `hasPendingCards` from `getCategories().length > 0` on mount, and `discoveryStore.setHasPendingCards` only checks `get().session?.phase !== 'converged'`. When no voting round is open (`phase === 'unowned'` or `session === null`), any unvoted catalog recipe causes the Discover orb to pulse on Home and every other tab.

7. **Recipes defaults, single-line controls & search placeholder (`pwa/src/app/(app)/recipes/RecipesExperience.tsx`, `api/src/RecipeApi/Models/FamilyMember.cs`, `RecipeDbContext.cs`, `api/database/schema.sql`, `api/database/compatibility.sql`):**
   - `FamilyMember.BrowseViewMode`, `RecipeDbContext`, `api/database/schema.sql`, and `RecipesExperience.tsx` currently default to `'stack'`.
   - In `RecipesExperience.tsx`, when Search controls expand with an active `similarToRecipeId` and/or `searchActive`, `Filters`, `Clear search and browse` (full text pill), and `Similar ×` appear together without a dedicated single-line flex row, wrapping awkwardly on mobile.
   - The search input placeholder uses static `recipes.searchPlaceholder` (`"Something spicy for 4..."`).

## Decisions and Tradeoffs

- **Planner Portions visual alignment (Item 1):** Reuse the exact `PlannerDayCard` outer structure (`day-card` temporal data attributes, compact `Today` divider, `w-10` `.planner-date` left column, `.planner-meal` `glass` / `bg-cream` card surface, `py-2.5 min-h-[72px]`) directly inside `useSupperServingsEditor.tsx` rows, passing `todayDate` (`useWeekStore((s) => s.calendar?.today)`) alongside `schedule`. On read-only cooked days (`meal?.status === 2 && !day.editable`), drop `grayscale` and move the status into a quiet sage badge (`bg-sage/15 text-sage-800` with check icon and read-only count) right-aligned in the thumb zone alongside the disabled/static count.
  - *Tradeoff:* Keeping `data-testid="portion-row-${key}"`, `portion-input-${key}`, and `reset-portions-${key}` intact avoids breaking existing state/aria contracts while unifying visual geometry across Meals and Portions tabs.

- **Toronto default in templates, UTC retained in code & smoke tests (Item 2):** Default `Calendar__TimeZone: ${Calendar__TimeZone:-America/Toronto}` across Compose/env deployment templates (`docker/compose/apps.yml`, `docker/compose/production.yml`, `docker/compose/production-overrides.yml`, `docker/docker-compose.prod.yml`, `docker/docker-compose.nas.yml`, `release-template/synology/compose.yaml`, `docker/.env.example`, `docker/.env`) and `Taskfile.yml` `dev:api`, while **preserving** `UTC` as the unconfigured in-process default in `DeploymentCalendar` and in `docker/compose/smoke.env`. Inject `DeploymentCalendar` into `RecipeSearchService` (optional or constructor parameter; fall back gracefully or resolve `DeploymentCalendar.Capture(_clock.UtcNow).Today`) so browse rediscovery cutoff and active/cooked calendar blocking follow the same deployment timezone as Planner.
  - *Alternative rejected:* Changing `DeploymentCalendar`'s C# fallback from `"UTC"` to `"America/Toronto"` was rejected because unit tests explicitly verify unconfigured `DeploymentCalendar` falls back to `UTC` (`Resolve supper dates through the deployment calendar`).

- **Standardized unit dropdown with legacy fallback (Item 3d):** Extract a shared constant list of standard culinary units in `pwa/src/lib/recipes/ingredient-draft.ts`:
  - Blank option `""` (none / unitless count),
  - Volume: `tsp`, `tbsp`, `cup`, `ml`, `cl`, `dl`, `l`,
  - Weight: `mg`, `g`, `kg`,
  - Count/packaging: `piece`, `clove`, `pinch`, `slice`, `can`, `jar`, `pkg`, `bunch`, `head`, `sprig`, `stalk`, `leaf`.
  Render both `recipe-edit-unit-${index}` and `recipe-edit-package-unit-${index}` as styled `<select>` elements (`min-h-12`). When a loaded draft carries a non-empty unit not in the standard set (legacy data such as `"Gousses"` or `"dash"`), prepend that legacy value as a labeled option so loading/editing never silently erases existing data before the user picks a standard unit.
  - *Alternative rejected:* Free-text `<datalist>` leaves typos and arbitrary strings submittable, whereas a strict `<select>` enforces standardized units for future scaling and unit conversion without losing existing values on open.

- **Servings `- (val) +` stepper & mobile edit layout (Items 3a–3c):** Replace `<input data-testid="recipe-edit-servings-input">` standalone box with the joined `[-] [input] [+]` stepper group (`ml-auto`, keeping `data-testid="recipe-edit-servings-input"`, numeric keyboard entry, `aria-invalid`, and `aria-describedby="recipe-servings-error"` below the row). Refactor structured ingredient rows so `[Amount]` (`w-20`), `[Unit <select>]` (`flex-1`), and an icon-only `Trash2` remove button (`h-12 w-12`) occupy a single compact top row above `[Description]` (`w-full`), fold `Shopping and scaling` quietly below, replace `text-[10px] uppercase tracking-[...]` edit headings with Solar Earth `text-sm font-semibold text-charcoal`, convert `Remove section` / `Remove step` to compact icon buttons with full localized `aria-label`s, and remove the redundant `SAVE RECIPE EDITS` mobile caption above Save/Cancel.

- **Toast noise hygiene vs. informative notifications (Items 3e & 4a):** Establish an explicit rule across callers: self-evident inline UI mutations or direct navigations MUST NOT fire success/info toasts (GOTO toggle, Planner empty-slot highlight navigation, `Uploading photo...`, manual `Marked for review` / `Changes saved` / `Marked as resolved`, `Duplicate recipe discarded.`). Retain toasts for: (a) all error/failure states, (b) asynchronous background starts where UI doesn't immediately show completion (`Regenerating hero image...`, `Reimporting in background`, `Preparing recipe file…`), (c) Home `Save for Next Week` (where the slot moves out of view), and (d) Grocery extra `Saved to {{section}}` (where the item inserts out of scroll view, now using localized `t(\`grocery.aisles.${section}\`, section)` plus complete EN/FR aisle translations).

- **Grocery row padding & right-aligned icons (Item 4):** Keep `#itemsRegionId` horizontal padding compact (`px-2 py-2 sm:px-3`) and remove nested `@min-[18rem]:p-4` inside individual rows (`px-1 py-2` on row cards), pinning trailing `BookOpen` and `Tag` buttons together inside an `ml-auto flex shrink-0 items-center gap-0.5` container so horizontal width flows cleanly to the ingredient label.

- **Navigation Discover pulse gated on collecting session (Item 5):** Derive nav pulsing exclusively from `session?.phase === 'collecting'` AND available discovery work (`categories.length > 0` / `discoveryStack.length > 0`). Update `useDiscoveryStore`: ensure `setHasPendingCards` and `applySession` only enable `hasPendingCards` when `session?.phase === 'collecting'`; have `Navigation.tsx` call `refreshSession()` alongside `getCategories()` (and avoid overriding `hasPendingCards` to `true` when session is `unowned`, `converged`, or unresolved). Re-evaluate when SSE `voting_session_updated` arrives.

- **Default `'list'` browse view & single-line toolbar & dynamic search placeholder (Items 6–8):**
  - Default `FamilyMember.BrowseViewMode`, `RecipeDbContext`, `api/database/schema.sql`, and `api/database/compatibility.sql` to `"list"`, and update `RecipesExperience.tsx` `savedBrowseViewMode` to `selectedMember?.browseViewMode === 'stack' ? 'stack' : 'list'`. Existing DB rows with `'stack'` are preserved (no destructive rewrite migration of user-chosen or legacy rows).
  - In `RecipesExperience.tsx`, wrap `[Filters]`, optional `[Similar ×]`, and compact icon-only `[Clear search and browse]` (`ml-auto`) in one flex row (`flex items-center gap-1.5 flex-nowrap` with `shrink-0` pill styling and tooltip/aria-label on Clear). If space tightens at large accessibility scales (`320px` + 200% text), allow `flex-wrap` gracefully without clipping while staying single-line on standard phones (`360–430px`).
  - Fetch/reuse target-week suggestions via `getFillTheGap(0)` (when `searchControlsExpanded` opens or on mount in Recipes if unset) to set the search input `placeholder` to the top returned suggestion's `name` (since `/api/schedule/fill-the-gap` already encapsulates household live-liked / influencer + 4-week historical interest ordering, excludes target-week planned recipes, and excludes cooled-down recipes). Fall back to localized `t('recipes.searchPlaceholderFallback', "Try 'Chicken' or 'Quick'…")` when empty or unavailable.

## First Observable Slice

The smallest end-to-end slice validating backend + deployment + frontend seams together is **Slice 1 (Toronto Timezone & Default List Browse Mode)** paired immediately with **Slice 2 (Navigation Discover Pulse & Planner Portions Parity)**:
- Updating Compose templates + `RecipeSearchService` (`DeploymentCalendar.Capture(_clock.UtcNow).Today`) + `FamilyMember` default `'list'` exercises Compose config rendering, `.NET` xUnit/Postgres integration tests, and PWA `RecipesExperience` defaults across API and browser boundaries before UI refinements proceed.

## State, Concurrency and Recovery

- **Portions editor draft recovery:** `useSupperServingsEditor.tsx` preserves existing `sessionStorage` draft persistence, baseline version conflict review, and explicit navigation departure prompt (`portions-discard` / `Save and continue`) unchanged while adopting the split `.planner-date` layout and thumb-zone stepper.
- **Discovery session freshness:** `useDiscoveryStore.refreshSession()` dedupes in-flight session reads and ignores superseded generations; gating `hasPendingCards` on `session?.phase === 'collecting'` guarantees stale background `getCategories()` responses cannot flash a false pulse after session convergence or close.
- **Legacy unit fallback in dirty drafts:** Retaining unknown legacy `unit` strings inside the `<select>` option list ensures opening Edit and hitting Save without touching ingredients preserves existing data and revision concurrency checks cleanly without unexpected validation errors.
- **Dynamic search placeholder safety:** `getFillTheGap` failure or empty response never blocks Search input rendering, focus, typing, or submission; stale suggestion responses on unmount are ignored cleanly.

## Compatibility, Rollout and Reversal

- **Existing household members:** Updating `FamilyMember.BrowseViewMode` default to `'list'` and database `DEFAULT 'list'` affects newly created members and fallback behavior when no member is selected; existing database rows with explicit preferences keep their stored value (switching `'stack'`/`'list'` remains 100% bidirectional and reversible).
- **Compose timezone default:** Setting `Calendar__TimeZone: ${Calendar__TimeZone:-America/Toronto}` is non-breaking and reversible via `.env` override (`Calendar__TimeZone=UTC` or any valid IANA zone). `docker/compose/smoke.env` retains `UTC` so CI pipelines remain deterministic.
- **Grocery localization fallback:** Adding missing EN/FR keys under `grocery.aisles` (`Produce`, `Deli`, `Bakery`, `Meat`, `Seafood`, `Dairy & Eggs`, `Frozen`, `Pantry`, `Beverages`, `Grocery`) retains the section string itself as `t()` fallback if a custom section is configured.

## User Experience

Guided by Solar Earth tokens and the `designer` + `mere-designer` principles ("calm, tactile kitchen prep tool; reduce decisions and thumb strain"):
- **One-handed thumb ergonomics:** Planner Portions aligns steppers (`- val +`) and usual-reset pills to the right trailing edge matching Meals cards; Recipe edit mode puts Servings stepper on the right and condenses ingredient `[Amount] [Unit <select>] [Trash]` onto a single scannable header row above the description; Recipes places `[Filters] [Similar ×] [Clear icon]` in one compact horizontal row; Grocery rows reclaim horizontal padding so long ingredient names don't prematurely wrap beside right-aligned `BookOpen`/`Tag` icons.
- **Calm status hierarchy:** Replaced harsh full-row `grayscale` and plain `Cooked` text with a gentle `bg-sage/15 text-sage-800` badge; removed jarring `10px uppercase` caps on edit section headings and redundant footer captions; silenced 6 self-evident toasts (`GOTO`, single-day `Planner` arrival, `Uploading photo...`, `Marked for review`/`Changes saved`/`Marked as resolved`, `Duplicate recipe discarded.`) so toasts regain signal value for errors, background work, and out-of-view Grocery aisle confirmation.
- **Accessible targets & focus:** Every stepper button, unit select, clear-search icon, Grocery `BookOpen`/`Tag` button, and ingredient remove icon preserves `>= 48px` (`min-h-12` / `min-w-12` or `min-h-11` where established in Grocery extra controls) tap targets, explicit `aria-label`s, visible focus rings, and EN/FR translations.
