# Proposal

## Why

Even after `refine-mobile-planner-recipes-and-grocery-ux` lands, 52 allowlisted Era 1 and Era 2 files across Entry, App Shell, Shared Notifications, Discovery, Capture, Planner Modals, Profile/Settings, and Recycle Bin (281 static baseline violations in `LEGACY_ERA_ALLOWLIST`) still exhibit undefined tokens (`text-indigo`, `bg-indigo`, `text-lavender`, `text-pink`, `red-*`, `ochre-dark`), 2.06:1 white-on-ochre primary CTAs, 8–11px tracked uppercase micro-headings, a 3D card flip in Suggestions, mid-tone `bg-sage` celebration cards, and a blank white bottom slab on `DiscoveryCard` that hides dish context from kids and family members during *"Swipe, Match, Cook!"*.

## Outcome and Scope

Apply `refine-mobile-planner-recipes-and-grocery-ux` **first**, then migrate every remaining Era 1 and Era 2 PWA surface to the **Family Cookbook** identity (Era 3) in four bounded waves, reducing `LEGACY_ERA_ALLOWLIST` in `pwa/src/test/visual-contract.test.ts` to zero entries:

1. **Wave A — Entry, App Shell, Shared UI & Global Notifications:** Align all 16 Wave A allowlisted files (`pwa/src/app/page.tsx`, `pwa/src/app/error.tsx`, `pwa/src/app/not-found.tsx`, `WelcomeForm.tsx`, `onboarding/page.tsx`, `invite/page.tsx`, `Navigation.tsx`, `Modal.tsx`, `LocaleToggle.tsx`, `FormInput.tsx`, `LanguageSwitchProposal.tsx`, `RecipeFailureBanner.tsx`, `IdentityHint.tsx`, `ToastContainer.tsx`, `SuccessCard.tsx`, `spinner.tsx`) plus `Header.tsx` (strip dead `getGreeting()`/`useFamilyStore` greeting plumbing and unused `Sparkles` import without adding unused greeting locale keys), `.solar-earth-bg` -> `.cookbook-bg` usage in `(app)/layout.tsx`, and `common/loading.tsx` (`text-charcoal-400` -> `text-charcoal-600`). Pin `Navigation.tsx` Discover orb to `h-16 w-16` (`64px`, `-top-3`) tonal sunlit medallion (`bg-ochre-100 text-ochre-800 border border-ochre-300 ring-4 ring-cream-100`) and `text-ochre-800` label, with render-time `useLocale()`, `>= 12px` sentence-case nav labels (`charcoal-600` inactive), `>= 48px` targets, and `>= 4.5:1` primary CTAs. Upgrade shared `SuccessCard.tsx` to Option A Deep Herb (`from-sage-600 to-sage-700`, white/cream ink, `bg-white text-sage-700` `text-xs` action) across both Discovery and Home while preserving Home's cooked copy and dismiss behavior.
2. **Wave B — *"Swipe, Match, Cook!"* Family Discovery Upgrade:** Upgrade `DiscoveryCard.tsx`, `discovery/page.tsx`, `FamilyNudgeDialog.tsx`, and `InviteLinkDialog.tsx`. Surface concise recipe descriptions (`line-clamp-2`, omitted cleanly when blank, reducing hero image height to `h-[58%]` only when description is shown) beneath the Outfit title on `DiscoveryCard` so kids and family members know what each dish is before swiping while keeping cuisine/meal-type pills absent; switch the on-photo `Ready in` pill to solid warm cream (`bg-cream text-charcoal`, preserving existing `common.readyIn` copy); and replace white-on-ochre buttons, `bg-sage/30` low-contrast overlays, and `bg-sage/15 text-sage` badges with role-locked high-contrast tokens.
3. **Wave C — Capture, Home Legacy Fragments & Planner/Recipes Surfaces:** Align `MinimalCapture.tsx` (plus `CameraView`, `ImageReview`, `NotesField`, `PdfCaptureConfirmation`, `PdfCapturePanel`, `RatingSelector`, `SubmitConfirmation`, `LibraryToast`, and `capture/confirm/page.tsx` updated or retired if unreferenced), `QuickFindModal.tsx` (retire the 3D `rotate-y-180` flip in favor of an accessible inline `aria-expanded` ingredients/description disclosure matching `TonightMenuCard`), `PlanningPivotSheet.tsx`, `SkipRecoveryDialog.tsx`, `HomeSections.tsx` (including migrating `VotingNudgeCard` off solid `bg-ochre text-charcoal` onto a `bg-ochre-50 border-ochre-200` sunlit card with a crisp `bg-white text-ochre-800 border-ochre-300` CTA at `7.91:1`), `HomeCommandCenter.tsx`, `RecipesExperience.tsx` spinners, `RecipeStackCard.tsx` (mirroring solid `bg-cream text-charcoal` on-photo `Ready in` pill parity with `DiscoveryCard`), `BrowseAllEmptyState.tsx`, `EndCard.tsx`, `StackActionBar.tsx`, `RecipeFiltersSheet.tsx`, `DiscoveryToggleCard.tsx`, `OriginalPhotosViewer.tsx`, `RecipeDetailSheet.tsx` remaining `10px` headers/`pink`/`red-700`, `RecipeImportIssueBadge.tsx`, `CooksMode.tsx`, `GroceryList.tsx`, and `planner/page.tsx` (`.cookbook-bg`, remaining `9px`/`10px` tabs/pills, and Option A Deep Herb `bg-sage-700 text-white` participation CTAs `Ask the Family` / `Nudge family` at `7.22:1` with `text-xs font-semibold`, sentence case, `min-h-12`). Verify `HomeGreeting.tsx` has zero remaining imports and delete it (removing its allowlist entry) rather than localizing dead code.
4. **Wave D — Profile, Settings, Recycle Bin, Ratchet Zero & Showcase Screenshots:** Align `SettingsPageContent.tsx`, `FamilyManagement.tsx`, `FamilyMemberList.tsx`, `FailedCapturesSection.tsx` (raising clear button from `40px` to `48px`), `RecycleBinSheet.tsx` (replacing `red-50/500/600/700` with Family Cookbook terracotta destructive tokens and `>= 48px` targets), verify `LEGACY_ERA_ALLOWLIST` in `visual-contract.test.ts` is completely empty (`[]`), and refresh `docs/screenshots/demo-*.png` referenced by `README.md`.

**Exclusions:** Does not alter backend API schemas, stores' concurrency/SSE contracts, or introduce adaptive shell behavior (deferred to `explore-adaptive-hearth-and-cookbook-primitives`).

## What Changes

- Migrate all 52 allowlisted Wave A–D files and non-allowlisted parity/cleanup companions off Era 1/2 ghost tokens, `white`-on-`ochre`/`sage` contrast violations, and `< 12px` tracked uppercase headers onto Era 3 Family Cookbook classes and `<Button>` variants.
- Upgrade shared `SuccessCard` to Option A Deep Herb across Discovery and Home while preserving Home's cooked copy and dismiss behavior.
- Render concise trimmed recipe description beneath the title on `DiscoveryCard` when non-empty and standardize on-photo `Ready in` pills on solid `bg-cream text-charcoal` across `DiscoveryCard` and `RecipeStackCard`.
- Strip dead greeting plumbing from `Header.tsx` and delete unused `HomeGreeting.tsx` rather than adding unused greeting locale keys.
- Replace `QuickFindModal`'s 3D `rotate-y-180` flip with an accessible inline `aria-expanded` description/ingredients disclosure.
- Clear `LEGACY_ERA_ALLOWLIST` in `pwa/src/test/visual-contract.test.ts` to zero entries and update `docs/screenshots/demo-*.png`.

## Capabilities

### New Capabilities

*(None — aligns presentation, contrast, accessibility targets, and card disclosures on existing capabilities.)*

### Modified Capabilities

- `recipe-discovery`: Surface concise recipe description (when non-empty) beneath the card title on Discovery voting cards, display the usable on-photo Ready in badge on a solid high-contrast warm-cream surface, enforce readable Family Cookbook contrast on overlays, badges, and empty-state/nudge actions, and align Home's cooked-success card with the shared accessible Deep Herb celebration contrast while preserving Home's existing cooked copy and dismiss behavior.
- `meal-assignment`: Replace Quick Find's 3D card flip with an accessible inline description/ingredients disclosure (`aria-expanded`) and high-contrast Family Cookbook controls while preserving deck advancement and dismissal.
- `household-identity`: Present Landing, Welcome, Onboarding, and Invite recovery with Family Cookbook typography, terracotta entry actions, and accessible alert styling.
- `capture-recovery`: Present failed-capture rows in Settings with `>= 12 CSS px` sentence-case text and `>= 48 CSS px` Retry and Clear hit targets.
- `recipe-recycle-bin`: Present Recycle Bin and permanent-purge actions with Family Cookbook warm surfaces, terracotta destructive tokens, and `>= 48 CSS px` targets.

## Impact

- **PWA Routes & Components:** 52 allowlisted legacy files across `pwa/src/app/` and `pwa/src/components/` listed in `design.md` (`LEGACY_ERA_ALLOWLIST` closure), plus non-allowlisted parity/cleanup in `Header.tsx`, `(app)/layout.tsx`, `common/loading.tsx`, `DiscoveryCard.tsx`, and `RecipeStackCard.tsx`, and `pwa/src/locales/{en,fr}/common.json`.
- **Tests & Visual Gate:** `pwa/src/test/visual-contract.test.ts`, `pwa/e2e/visual-a11y-contract.ts` assertions across `browse-stack`, `capture-flow`, `install-identity`, `planner`, `profile`, `recipe-detail-layout`, and `tonight-replacement-recovery`, plus `QuickFindModal.test.tsx`, `DiscoveryCard.test.tsx`, `Navigation.test.tsx`, `FailedCapturesSection.test.tsx`, `RecycleBinSheet.test.tsx`.
- **Marketing Assets:** `docs/screenshots/demo-*.png` (referenced in `README.md`).

## Resolved Decisions

All explore checkpoints before apply are settled:
- **Sequencing:** `refine-mobile-planner-recipes-and-grocery-ux` applies **first** before this change runs so the 6 shared files do not suffer double churn.
- **Checkpoint 1 — Bottom Navigation Discover Orb:** Option A — `h-16 w-16` (`64px`, `-top-3`) tonal sunlit medallion (`bg-ochre-100 text-ochre-800 border border-ochre-300 ring-4 ring-cream-100`) with `>= 12px` sentence-case `text-ochre-800` label, `text-charcoal-600` inactive tabs, `min-h-12` targets, and render-time `useLocale()`.
- **Checkpoint 2 — `DiscoveryCard` Description & Photo Pill Parity:** Render trimmed `description` (`line-clamp-2`, omitted when blank, `h-[58%]` photo when shown, cuisine/meal-type pills absent); switch on-photo `Ready in` pill to solid `bg-cream text-charcoal` on `DiscoveryCard` (Wave B) and mirror on `RecipeStackCard` (Wave C), keeping `common.readyIn` locale copy as-is.
- **Checkpoint 3 — `HomeGreeting` & `Header` Alignment:** Pure subtraction — delete unimported `HomeGreeting.tsx` (after confirming zero imports at apply time) and strip the dead `getGreeting()` / `useFamilyStore` greeting branch + unused `Sparkles` import from `Header.tsx` without adding unused greeting locale keys.
- **Checkpoint 4 — Planner `Ask the Family` / `Nudge family` Solid Sage Pair:** Option A — Deep Herb `bg-sage-700 text-white` (`7.22:1`, `text-xs font-semibold`, sentence case, `min-h-12`), matching Board 03.
- **Scope Closure — Shared `SuccessCard` & Missing Allowlist Files:** Upgrade shared `SuccessCard.tsx` to Option A Deep Herb (`from-sage-600 to-sage-700`, `bg-white text-sage-700` `text-xs`) across both Discovery and Home (preserving Home's cooked copy and dismiss behavior), and fold the 3 previously uncatalogued allowlist entries (`LanguageSwitchProposal.tsx`, `RecipeFailureBanner.tsx`, `spinner.tsx` + `common/loading.tsx`) into Wave A so all 52 allowlisted files reach zero.
