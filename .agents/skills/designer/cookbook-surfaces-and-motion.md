# Family Cookbook Surfaces, Layout, and Motion

Normative surface, card/sheet anatomy, touch-target, focus, and motion rules for What's For Supper (WFS). Load alongside [visual-identity.md](visual-identity.md) and the [visual language reference](../../../docs/visual-language-reference.md).

## 1. Canvas & Opaque Surface Ladder

- **Canvas:** Warm cream `#FDFCF0` via `.cookbook-bg` in [globals.css](../../../pwa/src/app/globals.css) (retain `.solar-earth-bg` only on legacy surfaces until migrated).
- **Tier 1 · Hero cards (`TonightCardBase`):** Crisp opaque white `#FFFFFF` frames (`rounded-[3rem]` on Home hero cards, `rounded-[2.5rem]` on Browse/Discovery cards), soft warm shadow, generous padding (`p-6`), and normal-flow layout rather than fixed card heights or 3D flip dependencies ([TonightMenuCard.tsx](../../../pwa/src/components/home/TonightMenuCard.tsx)).
- **Tier 2 · Section panels & active rows:** Crisp opaque `#FFFFFF` with a subtle warm hairline border (`1px` `border-charcoal-200`, `rounded-3xl` Settings/Profile panels, `rounded-2xl` active Planner day rows).
- **Tier 3 · Muted / past rows & recessed wells:** Flat `bg-cream` (`#FDFCF0`, `shadow-none`) for past Planner days and icon wells inside white cards.
- **Action hierarchy:** Keep at most **one** primary `bg-terracotta text-cream-100` CTA per card or dialog footer. Secondary actions use crisp white `1px` `border-terracotta-200 text-terracotta-700` outlines (`rounded-[1.5rem]`, `min-h-14` on hero cards) or left-aligned `ChevronDown` text disclosures; never stack competing equal-weight solids.

## 2. Sheets, Dialogs & Narrow Viewports

- **Shell & scrim:** Opaque `bg-cream` (`#FDFCF0`) sheet/dialog over a **warm dark scrim (`bg-charcoal/45 backdrop-blur-sm`)**—full-screen on phones (`320 px`–`767 px`) and bounded rounded dialogs on tablets/desktops (`>= 768 px`), keeping the reading region scrollable between sticky header and safe-area bottom dock.
- **Safe areas & keyboards:** Apply `.safe-top` / `.safe-bottom` utilities so titles, inline validation, and recovery actions stay clear of bottom navigation, home indicators, and mobile software keyboards.
- **Reflow & text growth:** Verify zero horizontal overflow (`scrollWidth <= clientWidth`) at `320 CSS px` and `200%` root font scaling in both English and French; allow button labels to wrap naturally using `min-h-12` / `min-h-14` rather than fixed heights.

## 3. Restricted Translucency & Composite Contrast

- Restrict frosted translucency strictly to floating bottom navigation (`.glass-nav`) and translucent hero-photo capsules (`bg-cream/80 backdrop-blur-md` `View Original`); keep card/row surfaces opaque `#FFFFFF` or `#FDFCF0`.
- Measure rendered foreground-over-composite contrast in Chromium (both bright and dark photo fixtures) using `assertCookbookVisualA11y` in [visual-a11y-contract.ts](../../../pwa/e2e/visual-a11y-contract.ts): `>= 4.5:1` for normal text and `>= 3.0:1` for large text (`>= 24 px` or `>= 18.67 px` bold) and meaningful control boundaries/icons.

## 4. Switches, Checkboxes, Touch Targets & Focus

- **Binary control grammar:**
  - *Immediate binary switches (`role="switch"`):* `>= 48 CSS px` full-row interactive target with a `56 × 32 px` rounded pill track (`bg-sage-700` or `bg-terracotta` active + white thumb; `bg-charcoal-200` inactive)—used for `Ask the Family` and `Preview features`.
  - *Explicit-save form checkboxes:* `22–24 px` rounded checkbox (`accent-terracotta`) inside a `>= 48 CSS px` label row—used for `Usual portions: Use family size` and ingredient scaling flags.
- **Touch targets:** Interactive controls (primary, secondary, icon-only toolbar actions, disclosures) require `>= 48 × 48 CSS px` (`min-h-12` / `min-h-14` on `<Button>` in [button.tsx](../../../pwa/src/components/ui/button.tsx); transparent hit padding around `20–24 px` icons where compact visually). Inline prose links inside running paragraphs remain exempt.
- **Keyboard focus:** Standardize `:focus-visible` on **`focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal` (`#28231F`)** across all controls (`>= 3:1` against cream, white, and terracotta, and preserved in Forced Colors Mode). Never suppress outlines without an equally visible replacement.

## 5. Motion & Asynchronous Stability

- **Purposeful & reduced-motion aware:** Motion must explain an interaction or state change, use compositor properties (`transform`, `opacity`), and respect `prefers-reduced-motion: reduce`. Do not add list staggering or animations merely for decoration.
- **Loading stability:** Use [CookbookLoader](../../../pwa/src/components/ui/SolarLoader.tsx) (legacy `SolarLoader` alias) or stable inline busy states (`aria-busy`, preserved button width/height) so async updates never shift nearby controls under a finger.
