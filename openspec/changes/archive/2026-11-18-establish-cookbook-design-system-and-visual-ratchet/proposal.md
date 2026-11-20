# Proposal

## Why

The designer harness currently points agents to existing components rather than a normative contract (`.agents/skills/designer/visual-identity.md` and `solar-earth-design.md` are 19-line summaries, while `docs/visual-language-reference.md` mixes current rules with 7 chronological session changelogs). At the same time, `pwa/src/app/globals.css` contains an inverted neutral ramp (`--color-charcoal-500` darker than `600`/`700`), cool blue-slate grays that chill against warm cream `#FDFCF0`, a drifted terracotta hex in `tailwind.config.ts`, a 2.06:1 white-on-ochre `danger` variant in `ui/button.tsx`, and zero automated gates preventing Era 1–2 regressions.

## Outcome and Scope

Turn the Era 3 **Family Cookbook** identity into a color-science-grounded, self-enforcing visual contract and automated test ratchet before migrating legacy screens:

1. **Normative Designer Harness & Reference Split:** Archive chronological session notes from `docs/visual-language-reference.md` into `docs/archive/visual-language-session-history.md` and archive the 25 Oct originals of `docs/visual-language/01-roles-type-states.svg` and `docs/visual-language/02-home-state-map.svg` under `docs/archive/visual-language/`. Establish the 4-board layered SVG reference suite in `docs/visual-language/` (`01-foundations-roles-and-type.svg`, `02-surfaces-controls-and-recovery.svg`, `03-domain-supper-plan-and-week.svg`, `04-domain-recipe-cards-and-detail.svg`), update `docs/visual-language-reference.md` (removing the stale Board 2 checkpoint disclaimer so it owns only current, authoritative visual and functional coherence rules), and update leftover `"Ordered In"` references in `docs/flows/user-flows/order-in-flow.md` to Era 3 warm tokens, tonal ochre swatches, Option A deep-herb celebrations, and current shipped Home/Planner/Recipes/Settings compositions (`Take Out` / `À emporter` recording a plan including takeout and delivery rather than placing an external order, `Search` / `Suggestions`, `Recipes` in bottom nav, white `TonightCardBase` non-cooking card, and retired Home `Browse your library` tile). Replace `.agents/skills/designer/solar-earth-design.md` with `.agents/skills/designer/cookbook-surfaces-and-motion.md` and expand `visual-identity.md` and `SKILL.md` with explicit Do/Do Not token matrices, role-locked color pairings, sheet/card anatomy, and explicit pointers to `modern-web-guidance` and `a11y-debugging`.
2. **Perceptual Color Science Token Repair (`globals.css` & `tailwind.config.ts`):**
   - Repair the inverted `charcoal` ramp (`50 -> 900` strictly monotonic in lightness) and warm the neutral undertone slightly toward espresso-ink so muted text/borders harmonize with `#FDFCF0` cream without simultaneous-contrast chill, preserving `>= 14:1` primary body and `>= 7:1` supporting ink contrast on cream.
   - Synchronize `terracotta` `#B85542` across `globals.css` and `pwa/tailwind.config.ts`, add `.cookbook-bg` alongside compatibility alias `.solar-earth-bg`, and add `CookbookLoader` alongside `SolarLoader` re-export until legacy callers migrate.
   - Formalize role-locked semantic pairings compensating for perceptual lightness asymmetry across brand hues (Terracotta $L \approx 0.56$, Sage $L \approx 0.66$, Ochre $L \approx 0.77$):
     - _Hearth Primary:_ `bg-terracotta` (`#B85542`) + `text-cream-100` / `text-white` (`>= 4.61:1`)
     - _Sunlight Voting & Highlight:_ Tonal sunlit parchment `bg-ochre-50` (`#FFFBE6`) / `bg-ochre-100` (`#FFF7CC`, hover `bg-ochre-200` `#FFEE99`) + warm golden-umber `text-ochre-800` (`#664E01`, `7.61:1` / `7.32:1`), or raised `bg-white text-ochre-800 border-ochre-300` (`7.91:1`) inside an `ochre-50` callout. Reserve saturated `#E1AD01` strictly for non-text accents (star glyph fill, pulse halo, ambient warmth) and ban solid `bg-ochre` behind text/icons with either light or dark/black ink (and never bare `text-ochre` on light surfaces)
     - _Garden Two-Pole Sage (Option A):_ Tonal botanical `bg-sage-50`/`100` + `text-sage-700`/`800` (`>= 5.5:1`), or Deep Herb solid/celebration `bg-sage-600`/`700` (`#6E7A49` / `#525B37`) + `text-white` / `text-cream-100` (`>= 4.62:1` / `7.22:1`); ban both white-on-mid-sage (`#8A9A5B`) and dark-ink-on-mid-sage
     - _Error & Destructive:_ `bg-terracotta-50` + `text-terracotta-700` + `border-terracotta-200` (`7.46:1`)
3. **Era 3 `Button` Primitive (`pwa/src/components/ui/button.tsx`):** Align `primary`, `secondary`, `ghost`, and `danger` (replacing `bg-ochre text-white` 2.06:1 with accessible terracotta destructive tokens), enforce `min-h-12` (`>= 48px`) hit targets on `md`/`lg` buttons, and standardize on `focus-visible:outline-charcoal` (`#28231F`).
4. **Pulled-Forward Automated Visual Ratchet & Browser A11y Helper:**
   - Create `pwa/src/test/visual-contract.test.ts` running on every `task test:unit` to fail on: (a) off-palette tokens (`indigo`, `lavender`, `pink`, `red-*`, `ochre-dark`), (b) banned contrast pairs (opaque `bg-ochre` / `bg-ochre-400` / `bg-ochre-500` behind text/icons regardless of ink color — catching both `text-white` and `text-charcoal`/`text-ochre-900`, `bg-sage` with `text-white`, bare `text-ochre`/`text-sage` on light surfaces, `text-charcoal/20`–`40` copy), and (c) `< 12px` micro-text (`text-[8px]`..`text-[11px]`).
   - Enforce a strict **ratchet allowlist** (`LEGACY_ERA_ALLOWLIST`) covering only currently unmigrated files—new or un-allowlisted files fail immediately on any violation, and any allowlisted file whose violations hit zero fails until removed from the allowlist.
   - Create `pwa/e2e/visual-a11y-contract.ts` providing reusable Playwright/axe assertions for computed WCAG foreground/background contrast, `>= 48x48 CSS px` interactive targets, and zero horizontal overflow at `320px` / `200%` text.

**Exclusions:** Migrating existing Era 1–2 components off `LEGACY_ERA_ALLOWLIST` belongs to `unify-legacy-surfaces-to-family-cookbook` (and `refine-mobile-planner-recipes-and-grocery-ux` for its already scoped edits). Introducing native OKLCH CSS token refactoring and semantic Cookbook Primitives belongs to `explore-adaptive-hearth-and-cookbook-primitives`.

## What Changes

- Archive historical visual-language logs from `docs/visual-language-reference.md` into `docs/archive/visual-language-session-history.md` and the 25 Oct SVG boards into `docs/archive/visual-language/`; rewrite `docs/visual-language-reference.md` as a concise normative guide, establish the 4-board layered suite `docs/visual-language/{01-foundations-roles-and-type,02-surfaces-controls-and-recovery,03-domain-supper-plan-and-week,04-domain-recipe-cards-and-detail}.svg` with Era 3 warm tokens, Option A two-pole sage, tonal ochre, and protected Home/Planner/Recipes/Settings compositions, and clean up leftover `"Ordered In"` references in `docs/flows/user-flows/order-in-flow.md`.
- Replace `.agents/skills/designer/solar-earth-design.md` with `.agents/skills/designer/cookbook-surfaces-and-motion.md` and expand `.agents/skills/designer/SKILL.md`, `visual-identity.md`, and `.agents/skills/README.md`.
- Repair `--color-charcoal-*` progression/warmth and add `.cookbook-bg` in `pwa/src/app/globals.css`; sync `#B85542` terracotta in `pwa/tailwind.config.ts`; add `CookbookLoader` alias in `pwa/src/components/ui/SolarLoader.tsx`.
- Update `pwa/src/components/ui/button.tsx` variants (`danger` -> terracotta destructive, `min-h-12` targets on `md`/`lg`, `focus-visible:outline-charcoal` outline) with dedicated unit tests.
- Add `pwa/src/test/visual-contract.test.ts` (static visual contract + shrinking ratchet allowlist) and `pwa/e2e/visual-a11y-contract.ts` (computed browser contrast, 48px target, and reflow helper).

## Capabilities

### New Capabilities

- `visual-design-contract`: Owns Family Cookbook perceptual token scales, role-locked color contrast pairings, typography minimums, `48 CSS px` target standards, shared `Button` semantics, and automated visual-ratchet verification.

### Modified Capabilities

_(None — introduces `visual-design-contract` without changing existing product feature flows.)_

## Impact

- **Harness & Docs:** `docs/visual-language-reference.md`, `docs/visual-language/{01-foundations-roles-and-type,02-surfaces-controls-and-recovery,03-domain-supper-plan-and-week,04-domain-recipe-cards-and-detail}.svg`, `docs/archive/visual-language-session-history.md`, `docs/archive/visual-language/`, `docs/flows/user-flows/order-in-flow.md`, `.agents/skills/designer/{SKILL.md,visual-identity.md,cookbook-surfaces-and-motion.md}`, `.agents/skills/README.md`.
- **PWA Styling & UI Primitives:** `pwa/src/app/globals.css`, `pwa/tailwind.config.ts`, `pwa/src/components/ui/button.tsx`, `pwa/src/components/ui/SolarLoader.tsx`, `pwa/src/components/ui/index.ts`.
- **Automated Verification:** `pwa/src/test/visual-contract.test.ts`, `pwa/src/components/ui/button.test.tsx`, `pwa/e2e/visual-a11y-contract.ts`.

## Review Checkpoints Before Apply

Before running `/openspec-apply-change establish-cookbook-design-system-and-visual-ratchet`, review and adjust these items via `/openspec-explore` or `/openspec-update-change`:

- **Checkpoint 1 — Warm Charcoal Neutral Scale:** Confirm shifting `charcoal-50..900` in `globals.css` from cool Tailwind slate (`#1F2937` / `#4B5563` / `#9CA3AF`) to warm espresso-ink neutrals (while keeping `#1F2937` or `#231F1D` >= 14:1 on `#FDFCF0` cream) vs. fixing only the inverted `charcoal-500` step.
- **Checkpoint 2 — Button `danger` Styling:** Confirm `danger` uses soft destructive terracotta (`bg-terracotta-50 text-terracotta-700 border-terracotta-200`) rather than solid `bg-terracotta-700 text-white`, avoiding accidental confusion with primary Hearth CTAs.
- **Checkpoint 3 — Ratchet Rule Strictness:** Review the initial rule list in `design.md` (`indigo`, `pink`, `lavender`, `red-*`, `ochre-dark`, opaque `bg-ochre` (`DEFAULT`/`400`/`500`) control fills banned across both light and dark ink, `bg-sage` + `text-white`, bare `text-ochre`/`text-sage` small copy, `text-[8px]`–`text-[11px]`) and verify whether any subtle `11px` utility case (e.g., dense calendar markers) should be promoted to `12px` (`text-xs`) immediately or kept temporarily allowlisted.
