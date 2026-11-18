# Design

## Context and Existing Ownership

Observed owners and issues in the current repository:
- **CSS & Tailwind theme:** [`pwa/src/app/globals.css`](../../../pwa/src/app/globals.css#L3-L63) defines `@theme` variables (`--color-terracotta: #b85542`, `--color-ochre: #e1ad01`, `--color-sage: #8a9a5b`, `--color-cream: #fdfcf0`), while [`pwa/tailwind.config.ts`](../../../pwa/tailwind.config.ts#L13-L73) still carries stale `terracotta: { DEFAULT: '#CD5D45', 500: '#CD5D45' }`. Both files define `--color-charcoal-500: #1f2937` (identical to `charcoal-800` and darker than `600: #4b5563` and `700: #374151`) and use cool Tailwind blue-slate gray (`hue ~255deg`) on warm `#fdfcf0` cream.
- **Shared Button Primitive:** [`pwa/src/components/ui/button.tsx`](../../../pwa/src/components/ui/button.tsx#L6-L18) maps `danger` to `'bg-ochre text-white ...'` (`2.06:1` contrast) and `md`/`lg` sizes without `min-h-12`, causing Era 3 components (`TonightMenuCard`, `TonightPivotCard`, `RecipeDetailSheet`) to bypass `<Button>`.
- **Background & Loader Nomenclature:** `globals.css:210` defines `.solar-earth-bg` and [`pwa/src/components/ui/SolarLoader.tsx`](../../../pwa/src/components/ui/SolarLoader.tsx) exports `SolarLoader`.
- **Designer Harness:** [`docs/visual-language-reference.md`](../../../docs/visual-language-reference.md) mixes 7 chronological session logs with normative guidelines; [`.agents/skills/designer/visual-identity.md`](../../../.agents/skills/designer/visual-identity.md) and [`.agents/skills/designer/solar-earth-design.md`](../../../.agents/skills/designer/solar-earth-design.md) are 19-line pointers that leave agents copying Era 1–2 files.

## Decisions and Tradeoffs

### 1. Perceptual Color Science: Warm Espresso-Ink Neutral Scale & Asymmetric Brand Anchors
- **Neutral Scale Repair (`charcoal-50`..`900`):** Replace the broken cool-slate scale (where `500` was `#1f2937`) with a monotonically darkening **warm espresso-ink** neutral ramp (subtle warm umber hue ~50deg, low chroma) so muted borders, captions, and secondary ink harmonize with `#FDFCF0` cream instead of turning cold via simultaneous chromatic contrast:
  - `50`: `#FAF8F5` | `100`: `#F3EFEA` | `200`: `#E5DFD7` | `300`: `#CFC6BC` | `400`: `#9B9085` | `500`: `#6E645B` | `600`: `#524A43` | `700`: `#3D3630` | `800`: `#28231F` | `900`: `#191512` (DEFAULT: `#28231F`, passing > 13.5:1 on cream and > 15:1 on white; `600` `#524A43` passing > 8.0:1 on cream).
  - *Alternative (Review Checkpoint 1):* Keep cool `#1F2937` / `#4B5563` and fix only `charcoal-500` -> `#6B7280`. Recommended: adopt warm espresso-ink neutrals while keeping semantic variable names (`--color-charcoal-*`) unchanged so zero class renames are needed.
- **Compensating for Perceptual Lightness Asymmetry across Brand Hues:**
  Because `#B85542` terracotta (sRGB $Y = 0.171$, OKLCH $L \approx 0.56$), `#8A9A5B` sage ($Y = 0.293$, $L \approx 0.66$), and `#E1AD01` ochre ($Y = 0.459$, $L \approx 0.77$) sit in completely different luminance bands, a single `"bg-<hue> text-white"` pattern mathematically fails for ochre and base sage. Define and enforce four **Role-Locked Pair Families**:
  1. **Hearth Primary Action:** `bg-terracotta text-cream-100` (`4.61:1`) or `bg-terracotta text-white` (`4.75:1`), hover `bg-terracotta-600` (`5.81:1`), active `bg-terracotta-700` (`8.61:1`).
  2. **Sunlight / Voting Highlight:** `bg-ochre text-charcoal` (`7.12:1`+ on `#E1AD01`), `bg-ochre-100 text-ochre-900`, or `bg-ochre-50 text-ochre-800` for small badges (`>= 4.5:1`). **Banned:** `bg-ochre` + `text-white`, and bare `text-ochre` on light backgrounds.
  3. **Garden Participation & Completion:** `bg-sage-50`/`bg-sage/15` + `text-sage-800`/`text-sage-900` (`>= 5.5:1`), or `bg-sage-700 text-white` (`7.22:1`) for solid green pills/actions. **Banned:** `bg-sage` + `text-white` on small text, and bare `text-sage` on light backgrounds.
  4. **Error & Destructive:** `bg-terracotta-50 text-terracotta-700 border border-terracotta-200` (`7.46:1`).

### 2. Shared `Button` Variant Alignment (`pwa/src/components/ui/button.tsx`)
- `primary`: `bg-terracotta text-cream-100 hover:bg-terracotta-600 active:bg-terracotta-700 ...`
- `secondary`: `bg-white text-terracotta-700 border border-terracotta-200 hover:bg-terracotta-50 active:bg-terracotta-100`
- `ghost`: `text-terracotta-700 hover:bg-terracotta-50 active:bg-terracotta-100`
- `danger`: `bg-terracotta-50 text-terracotta-700 border border-terracotta-200 hover:bg-terracotta-100 active:bg-terracotta-200` (Review Checkpoint 2)
- Enforce `min-h-12` on `md` (`px-6 py-3 text-base rounded-2xl min-h-12`) and `lg` (`px-8 py-4 text-lg rounded-2xl min-h-14`), `min-h-11` on `sm`, and `focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta-700`.

### 3. Static Visual Contract Ratchet (`pwa/src/test/visual-contract.test.ts`)
- Scan every `.ts`/`.tsx` source file under `pwa/src/app` and `pwa/src/components` (excluding `*.test.*` / `*.spec.*`) against five static checks:
  1. **Off-palette colors:** `\b(?:text|bg|border|ring|fill)-(?:indigo|lavender|pink|red-\d+|ochre-dark)\b`
  2. **White-on-ochre:** class expressions combining `\bbg-ochre(?:-500)?\b` and `\btext-white\b`
  3. **White-on-base-sage:** class expressions combining `\bbg-sage(?:-500)?\b` and `\btext-white\b`
  4. **Low-contrast bare ochre/sage text:** `\btext-(?:ochre|sage)(?!-\d+)\b` (allows `text-ochre-800`, `text-sage-700`, `text-sage-900`, etc.)
  5. **Micro-typography below 12px:** `\btext-\[(?:[1-9]|10|11)px\]\b`
- **Ratchet mechanism:** Maintain an explicit `LEGACY_ERA_ALLOWLIST` map (`path -> max violation count` or exact file set) seeded from the observed Era 1–2 files (`page.tsx`, `error.tsx`, `not-found.tsx`, `WelcomeForm.tsx`, `onboarding/page.tsx`, `invite/page.tsx`, `capture/confirm/page.tsx`, `discovery/page.tsx`, `planner/page.tsx`, `profile/settings/SettingsPageContent.tsx`, `Navigation.tsx`, `Header.tsx`, `Modal.tsx`, `LocaleToggle.tsx`, `FormInput.tsx`, `InviteLinkDialog.tsx`, `MinimalCapture.tsx`, `CameraView.tsx`, `ImageReview.tsx`, `NotesField.tsx`, `PdfCaptureConfirmation.tsx`, `PdfCapturePanel.tsx`, `RatingSelector.tsx`, `SubmitConfirmation.tsx`, `LibraryToast.tsx`, `FamilyNudgeDialog.tsx`, `HomeCommandCenter.tsx`, `HomeGreeting.tsx`, `HomeSections.tsx`, `SkipRecoveryDialog.tsx`, `IdentityHint.tsx`, `FamilyMemberList.tsx`, `GroceryList.tsx`, `PlanningPivotSheet.tsx`, `QuickFindModal.tsx`, `CooksMode.tsx`, `FailedCapturesSection.tsx`, `FamilyManagement.tsx`, `BrowseAllEmptyState.tsx`, `DiscoveryToggleCard.tsx`, `EndCard.tsx`, `OriginalPhotosViewer.tsx`, `RecipeDetailSheet.tsx`, `RecipeFiltersSheet.tsx`, `RecipeImportIssueBadge.tsx`, `RecycleBinSheet.tsx`, `StackActionBar.tsx`, `SuccessCard.tsx`, `ToastContainer.tsx`, and any untouched files in `RecipesExperience.tsx` depending on `refine-mobile-planner-recipes-and-grocery-ux` ordering).
- Whenever a file is removed from the allowlist or has fewer violations than recorded, the test requires tightening/removing the allowlist entry—making regressions mathematically impossible without touching the ratchet file.

### 4. Reusable Browser Visual & A11y Helper (`pwa/e2e/visual-a11y-contract.ts`)
- Export `assertCookbookVisualA11y(page, options)` to:
  1. Walk visible text-bearing elements within the selected root/dialog, sample computed foreground and resolved opaque background (walking ancestors when `transparent`, flagging semi-transparent backdrops), and assert WCAG 2.2 AA contrast (`4.5:1` normal, `3.0:1` large `>= 24px` or `>= 18.67px` bold).
  2. Assert all visible interactive controls (`button`, `a[href]`, `input`, `select`, `[role="button"]`) outside prose links meet `>= 48 × 48` CSS px (or configurable exemption list for narrow legacy controls).
  3. Assert `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `320px` and `200%` text scaling.

### 5. Designer Harness Refactor & Reference Split
- Move lines 161–454 (chronological Oct/Nov session logs and historical snapshots) from `docs/visual-language-reference.md` into `docs/archive/visual-language-session-history.md`, keeping `docs/visual-language-reference.md` focused purely on the 7 decision principles, current type/color pair table, icon semantics, and mobile review expectations.
- Replace `.agents/skills/designer/solar-earth-design.md` with `.agents/skills/designer/cookbook-surfaces-and-motion.md` and rewrite `.agents/skills/designer/visual-identity.md` and `SKILL.md` so agents have concrete Do/Do Not token rules and know to load `modern-web-guidance` and `a11y-debugging` when designing or verifying UI.

## First Observable Slice

Implement Slice 1 (`globals.css` + `tailwind.config.ts` + `ui/button.tsx` + `ui/button.test.tsx`) paired immediately with `visual-contract.test.ts` (Slice 2) so both the fixed neutral/button tokens and the automated ratchet gate execute together in `cd pwa && npm run test:unit`.

## Compatibility, Rollout and Reversal

- Retaining `.solar-earth-bg` as a CSS alias alongside `.cookbook-bg` and re-exporting `SolarLoader` alongside `CookbookLoader` guarantees zero runtime/test breakage for callers migrating in `unify-legacy-surfaces-to-family-cookbook`.
- Using `LEGACY_ERA_ALLOWLIST` avoids breaking CI while Era 1–2 files are migrated over subsequent changes, while strictly locking every new file and newly cleaned file to Era 3.

## User Experience

- Fixing `charcoal-500` inversion and warming neutral undertones eliminates cold gray text on warm cream paper across the entire app immediately.
- Fixing `Button` `danger` and `min-h-12` makes shared `<Button>` trustworthy for Era 3 components again instead of forcing inline button duplication.
