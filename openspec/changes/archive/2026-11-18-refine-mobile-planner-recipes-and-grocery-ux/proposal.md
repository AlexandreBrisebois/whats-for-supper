# Proposal

## Why

Mobile household workflows across Planner, Recipe Detail edit mode, Grocery Checklist, Discovery navigation, and Recipes search currently combine desktop-leftover controls, visual divergence between Planner views, a UTC fallback mismatch in Docker deployments, noisy self-evident toast alerts, and unrepresentative search defaults. On a phone, these rough edges force two-handed reaching, horizontal truncation, manual typing of ingredient units, and misleading alerts or status cues during everyday meal planning and cooking.

## Outcome and Scope

All eight user-reviewed UX, visual-language, and timezone refinements operate cleanly across mobile and desktop viewports while preserving existing API, accessibility, concurrency, and test contracts:

1. **Planner Portions view parity & Cooked status:** Portions mode (`At the table`) uses the same split date column, `Today` divider, card surfaces, spacing, and right-aligned thumb-zone controls as the default Meals view, and replaces whole-row `grayscale` and plain trailing `Cooked` text on read-only cooked days with a calm sage status badge.
2. **Toronto deployment timezone authority:** Repository and Synology Compose templates and local API development defaults pass `Calendar__TimeZone: ${Calendar__TimeZone:-America/Toronto}` so evening Toronto planning aligns with the household civil day, while C# `DeploymentCalendar` retains `UTC` when unconfigured in code, `docker/compose/smoke.env` remains `UTC` for CI determinism, and `RecipeSearchService` browse rediscovery cutoff queries read deployment-local today via `DeploymentCalendar`.
3. **Recipe edit mode mobile UX, standardized unit dropdown & toast noise reduction:** Recipe edit mode replaces the wide default-servings input with a right-aligned joined `- (val) +` stepper, streamlines mobile ingredient/instruction editing cards under `designer` + `mere-designer` Solar Earth standards, converts ingredient and package-capacity unit fields into standardized culinary `<select>` dropdowns (preserving any legacy non-standard saved unit until changed), and removes redundant confirmation toasts for self-evident UI actions (GOTO toggle, Planner day highlight on single-day assignment, photo upload start, import-issue resolution/manual save, and duplicate capture discard) while keeping error toasts, background-work start notices, Home defer-to-next-week feedback, and Grocery extra feedback.
4. **Grocery Checklist row layout & localized extra confirmation:** Grocery item containers remove nested horizontal padding and compact trailing `BookOpen` and `Tag` icons to the right edge for wider ingredient labels, while adding an extra keeps scroll/focus in place and shows a localized `Saved to {{section}}` toast.
5. **Navigation Discover pulse accuracy:** The primary bottom-nav Discover button pulses only when an authoritative voting session is open (`phase === 'collecting'`) with pending categories/cards, eliminating false pulsing when no voting session is active or after convergence.
6. **Recipes default browse view:** New members and unconfigured library entry default to `'list'` instead of `'stack'`.
7. **Single-line Similar & Clear controls:** With Search controls expanded, the removable `Similar ×` chip sits beside `Filters` on one horizontal toolbar row and `Clear search and browse` becomes a compact accessible icon button.
8. **Dynamic influencer-backed search placeholder:** The Recipes search box placeholder displays the top eligible suggestion name from `getFillTheGap` (reflecting household interest/influencers, not on the target-week planner, and not on rotation cooldown), falling back cleanly to a localized default string when unavailable.

Exclusions: No server-side backfill rewriting existing stored household members' saved `browseViewMode` preferences, and no automatic conversion or mutation of historical saved ingredient strings or legacy unit tokens beyond preserving them in the edit dropdown until changed.

## What Changes

- **Planner Portions editor (`useSupperServingsEditor.tsx`, `planner/page.tsx`):** Match Meals view `.planner-date` left column and `Today` divider, right-align the joined `- (val) +` stepper and reset control in the right thumb zone, align card styling and spacing with `.planner-meal`, and replace read-only cooked row `grayscale` and raw trailing text with a calm sage `Cooked` badge.
- **Deployment timezone & browse cutoff (`docker/`, `release-template/`, `Taskfile.yml`, `RecipeSearchService.cs`):** Default `Calendar__TimeZone` to `America/Toronto` across Compose/env templates and `dev:api`, and inject `DeploymentCalendar` into `RecipeSearchService.GetBrowseRankedRecipesAsync`.
- **Recipe edit mode (`RecipeDetailSheet.tsx`, `ingredient-draft.ts`):** Replace servings text input with `- (val) +` stepper, refine mobile ingredient/instruction edit cards and labels (`designer` / `mere-designer`), and switch ingredient/package unit inputs to standardized unit `<select>` dropdowns with legacy unit fallback preservation.
- **Toast noise cleanup & Grocery localization (`RecipeDetailSheet.tsx`, `planner/page.tsx`, `MinimalCapture.tsx`, `GroceryList.tsx`, `locales/`):** Remove redundant success/info toasts for GOTO toggle, single-day recipe-planned navigation, photo upload start, manual import-issue status updates, and duplicate discard; localize section names in `Saved to {{section}}` Grocery extra toasts.
- **Grocery list row density (`GroceryList.tsx`):** Remove redundant container/row horizontal padding (`@min-[18rem]:p-4` duplication) and keep `BookOpen` and `Tag` controls tightly anchored to the right edge.
- **Discover nav pulse (`Navigation.tsx`, `discoveryStore.ts`):** Gate `hasPendingCards` pulsing strictly on `session?.phase === 'collecting'` alongside pending discovery cards/categories.
- **Recipes defaults, single-line filter bar & dynamic placeholder (`RecipesExperience.tsx`, `FamilyMember.cs`, `RecipeDbContext.cs`, `schema.sql`, `compatibility.sql`):** Default `browseViewMode` to `list`; place `Similar ×` next to `Filters` and convert `Clear search and browse` to a compact icon button on the same row; source search placeholder text from eligible `getFillTheGap` suggestions with localized fallback.

## Capabilities

### New Capabilities

_(None — all changes refine existing household capabilities.)_

### Modified Capabilities

- `meal-planning`: Match Planner Portions view date column, `Today` divider, card styling, right-aligned thumb-zone stepper, and calm sage `Cooked` status badge to Meals view.
- `deployment-calendar`: Default `Calendar__TimeZone` to `America/Toronto` across shipped Docker/Synology Compose and repository env templates (keeping C# unconfigured fallback and CI `smoke.env` at `UTC`).
- `recipe-editing`: Replace the servings text box with a right-aligned joined `- (val) +` stepper, adopt compact mobile ingredient/instruction edit cards, and replace free-text unit fields with standardized culinary `<select>` dropdowns (preserving legacy values).
- `recipe-library`: Change fallback default library browse presentation from `stack` to `list`.
- `member-preferences`: Default new family members and unconfigured library initialization to `list` browse mode instead of `stack`.
- `meal-assignment`: Omit redundant confirmation toast on single-day Planner assignment navigation while preserving target-day scroll, highlight ring, replacement banners, and error recovery.
- `grocery-shopping`: Remove nested horizontal row padding and right-align `BookOpen`/`Tag` controls to maximize ingredient label width; localize section names in the `Saved to {{section}}` extra toast.
- `recipe-discovery`: Restrict navigation Discover button pulsing to active `collecting` voting sessions with pending categories/cards.
- `recipe-search`: Render the removable `Similar ×` chip and icon-only `Clear search and browse` control inline beside `Filters`, drive the search placeholder from eligible `fill-the-gap` suggestions, and compute browse rediscovery cutoffs using `DeploymentCalendar` instead of UTC date.
- `tonight-meal-decisions`: Omit GOTO add/remove success toast while keeping inline star/pressed feedback and failure error toast.
- `recipe-media`: Omit intermediate `Uploading photo...` toast on detail photo upload while retaining `Regenerating hero image...` and error feedback.
- `recipe-quality`: Omit `Marked for review`, `Changes saved`, and `Marked as resolved` confirmation toasts while retaining `Reimporting in background` and failure feedback.
- `recipe-capture`: Omit `Duplicate recipe discarded.` toast on confirmed duplicate discard navigation to `/`.

## Impact

- **PWA UI & Stores:** `pwa/src/components/planner/useSupperServingsEditor.tsx`, `pwa/src/app/(app)/planner/page.tsx`, `pwa/src/components/recipes/RecipeDetailSheet.tsx`, `pwa/src/lib/recipes/ingredient-draft.ts`, `pwa/src/components/capture/MinimalCapture.tsx`, `pwa/src/components/planner/GroceryList.tsx`, `pwa/src/components/common/Navigation.tsx`, `pwa/src/store/discoveryStore.ts`, `pwa/src/app/(app)/recipes/RecipesExperience.tsx`, `pwa/src/locales/{en,fr}/common.json`.
- **API & Persistence:** `api/src/RecipeApi/Services/RecipeSearchService.cs`, `api/src/RecipeApi/Models/FamilyMember.cs`, `api/src/RecipeApi/Data/RecipeDbContext.cs`, `api/database/schema.sql`, `api/database/compatibility.sql`.
- **Deployment & Tooling:** `docker/compose/apps.yml`, `docker/compose/production.yml`, `docker/compose/production-overrides.yml`, `docker/docker-compose.prod.yml`, `docker/docker-compose.nas.yml`, `release-template/synology/compose.yaml`, `docker/.env.example`, `docker/.env`, `Taskfile.yml` (`dev:api`).
- **Tests:** Existing Vitest and xUnit suites for Planner servings, RecipeDetailSheet, GroceryList, Navigation/discoveryStore, RecipesExperience, MinimalCapture, FamilyService/FamilyController, RecipeSearchService, and Compose template identity checks will require test updates alongside new behavior specs.
