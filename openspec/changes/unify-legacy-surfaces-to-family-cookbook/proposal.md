# Proposal

## Why

Even after `refine-mobile-planner-recipes-and-grocery-ux` lands, 40+ Era 1 and Era 2 files across Entry, App Shell, Discovery, Capture, Planner Modals, Profile/Settings, and Recycle Bin still exhibit undefined tokens (`text-indigo`, `bg-indigo`, `text-lavender`, `text-pink`, `red-*`, `ochre-dark`), 2.06:1 white-on-ochre primary CTAs, 8–11px tracked uppercase micro-headings, a 3D card flip in Suggestions, and a blank white bottom slab on `DiscoveryCard` that hides dish context from kids and family members during *"Swipe, Match, Cook!"*.

## Outcome and Scope

Migrate every remaining Era 1 and Era 2 PWA surface to the **Family Cookbook** identity (Era 3) in four bounded waves, reducing `LEGACY_ERA_ALLOWLIST` in `pwa/src/test/visual-contract.test.ts` to zero entries:

1. **Wave A — Entry, App Shell & Global Error Fallbacks:** Align `pwa/src/app/page.tsx`, `pwa/src/app/error.tsx`, `pwa/src/app/not-found.tsx`, `WelcomeForm.tsx`, `onboarding/page.tsx`, `invite/page.tsx`, `Header.tsx`, `Navigation.tsx`, `Modal.tsx`, `LocaleToggle.tsx`, `FormInput.tsx`, `IdentityHint.tsx`, `ToastContainer.tsx`, `SuccessCard.tsx`, and `.solar-earth-bg` -> `.cookbook-bg` usage in `(app)/layout.tsx` and `planner/page.tsx`. Fix all `indigo`/`lavender`/`pink` tokens, render-time navigation `t()` labels, `>= 12px` sentence-case nav labels (`charcoal-600` inactive), readable `ochre-900` on warm gold for the Discover badge, and `>= 4.5:1` primary CTAs.
2. **Wave B — *"Swipe, Match, Cook!"* Family Discovery Upgrade:** Upgrade `DiscoveryCard.tsx`, `discovery/page.tsx`, `FamilyNudgeDialog.tsx`, and `InviteLinkDialog.tsx`. Surface concise recipe descriptions (`line-clamp-2`, omitted cleanly when blank) beneath the Outfit title on `DiscoveryCard` so kids and family members know what each dish is before swiping, while keeping cuisine/meal-type pills absent; replace white-on-ochre buttons, `bg-sage/30` low-contrast overlays, and `bg-sage/15 text-sage` badges with role-locked high-contrast tokens.
3. **Wave C — Capture, Home Legacy Fragments & Planner Sheets:** Align `MinimalCapture.tsx` (plus `CameraView`, `ImageReview`, `NotesField`, `PdfCaptureConfirmation`, `PdfCapturePanel`, `RatingSelector`, `SubmitConfirmation`, `LibraryToast`, `capture/confirm/page.tsx`), `QuickFindModal.tsx` (retire the 3D `rotate-y-180` flip in favor of an accessible inline `aria-expanded` ingredients/description disclosure matching `TonightMenuCard`), `PlanningPivotSheet.tsx`, `SkipRecoveryDialog.tsx`, `HomeSections.tsx`, `HomeGreeting.tsx`, `HomeCommandCenter.tsx`, `RecipesExperience.tsx` spinners, `BrowseAllEmptyState.tsx`, `EndCard.tsx`, `StackActionBar.tsx`, `RecipeFiltersSheet.tsx`, `DiscoveryToggleCard.tsx`, `OriginalPhotosViewer.tsx`, `RecipeDetailSheet.tsx` remaining `10px` headers/`pink`/`red-700`, `RecipeImportIssueBadge.tsx`, `CooksMode.tsx`, and `planner/page.tsx` remaining `9px`/`10px` tabs/pills & `bg-sage text-white` participation CTAs (`Ask the Family`, `Nudge family` -> `bg-sage-700 text-white` or `bg-sage-100 text-sage-900`).
4. **Wave D — Profile, Settings, Recycle Bin, Ratchet Zero & Showcase Screenshots:** Align `SettingsPageContent.tsx`, `FamilyManagement.tsx`, `FamilyMemberList.tsx`, `FailedCapturesSection.tsx` (raising clear button from `40px` to `48px`), `RecycleBinSheet.tsx` (replacing `red-50/500/600/700` with Family Cookbook terracotta destructive tokens and `>= 48px` targets), verify `LEGACY_ERA_ALLOWLIST` in `visual-contract.test.ts` is completely empty (`[]`), and refresh `docs/screenshots/demo-*.png` referenced by `README.md`.

**Exclusions:** Does not alter backend API schemas, stores' concurrency/SSE contracts, or introduce adaptive shell behavior (deferred to `explore-adaptive-hearth-and-cookbook-primitives`).

## What Changes

- Migrate Wave A–D components off Era 1/2 ghost tokens, `white`-on-`ochre`/`sage` contrast violations, and `< 12px` tracked uppercase headers onto Era 3 Family Cookbook classes and `<Button>` variants.
- Render concise trimmed recipe description beneath the title on `DiscoveryCard` when non-empty.
- Replace `QuickFindModal`'s 3D `rotate-y-180` flip with an accessible inline `aria-expanded` description/ingredients disclosure.
- Clear `LEGACY_ERA_ALLOWLIST` in `pwa/src/test/visual-contract.test.ts` to zero entries and update `docs/screenshots/demo-*.png`.

## Capabilities

### New Capabilities

*(None — aligns presentation, contrast, accessibility targets, and card disclosures on existing capabilities.)*

### Modified Capabilities

- `recipe-discovery`: Surface concise recipe description (when non-empty) beneath the card title on Discovery voting cards and enforce readable Family Cookbook contrast on overlays, badges, and empty-state/nudge actions.
- `meal-assignment`: Replace Quick Find's 3D card flip with an accessible inline description/ingredients disclosure (`aria-expanded`) and high-contrast Family Cookbook controls while preserving deck advancement and dismissal.
- `household-identity`: Present Landing, Welcome, Onboarding, and Invite recovery with Family Cookbook typography, terracotta entry actions, and accessible alert styling.
- `capture-recovery`: Present failed-capture rows in Settings with `>= 12 CSS px` sentence-case text and `>= 48 CSS px` Retry and Clear hit targets.
- `recipe-recycle-bin`: Present Recycle Bin and permanent-purge actions with Family Cookbook warm surfaces, terracotta destructive tokens, and `>= 48 CSS px` targets.

## Impact

- **PWA Routes & Components:** ~48 legacy files across `pwa/src/app/` and `pwa/src/components/` listed in `design.md` (`LEGACY_ERA_ALLOWLIST` closure), plus `pwa/src/locales/{en,fr}/common.json`.
- **Tests & Visual Gate:** `pwa/src/test/visual-contract.test.ts`, `pwa/e2e/visual-a11y-contract.ts` assertions across `browse-stack`, `capture-flow`, `install-identity`, `planner`, `profile`, `recipe-detail-layout`, and `tonight-replacement-recovery`, plus `QuickFindModal.test.tsx`, `DiscoveryCard.test.tsx`, `Navigation.test.tsx`, `FailedCapturesSection.test.tsx`, `RecycleBinSheet.test.tsx`.
- **Marketing Assets:** `docs/screenshots/demo-*.png` (referenced in `README.md`).

## Review Checkpoints Before Apply

Before running `/openspec-apply-change unify-legacy-surfaces-to-family-cookbook`, review and adjust these items via `/openspec-explore` or `/openspec-update-change`:
- **Checkpoint 1 — Bottom Navigation Discover Orb Treatment:** Confirm whether the Wave A `Navigation.tsx` Discover circle stays elevated (`bg-ochre text-charcoal ring-4 ring-cream-100`) with `>= 12px` readable `text-ochre-900` label at ~56–64px instead of `h-20 w-20`, or retains `h-20 w-20` until Track 4's adaptive shell experiment.
- **Checkpoint 2 — `DiscoveryCard` Description Density:** Confirm showing up to 2 lines (`line-clamp-2`) of non-empty `description` beneath the recipe name on `DiscoveryCard` (keeping cuisine/meal-type pills absent per existing spec).
- **Checkpoint 3 — `HomeGreeting` & `Header` Alignment:** Confirm removing `"Command Center"` / `"Matchmaking"` and localizing `HomeGreeting` (`Good Morning` / `Bonjour` without hardcoded English fallback `"There"`).
- **Checkpoint 4 — Planner `Ask the Family` / `Nudge family` Solid Sage Pair:** Confirm switching `bg-sage text-white` (`3.06:1`) to `bg-sage-700 text-white` (`7.22:1`) vs soft `bg-sage-100 text-sage-900`.
