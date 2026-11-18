# Proposal

## Why

The designer harness currently points agents to existing components rather than a normative contract (`.agents/skills/designer/visual-identity.md` and `solar-earth-design.md` are 19-line summaries, while `docs/visual-language-reference.md` mixes current rules with 7 chronological session changelogs). At the same time, `pwa/src/app/globals.css` contains an inverted neutral ramp (`--color-charcoal-500` darker than `600`/`700`), cool blue-slate grays that chill against warm cream `#FDFCF0`, a drifted terracotta hex in `tailwind.config.ts`, a 2.06:1 white-on-ochre `danger` variant in `ui/button.tsx`, and zero automated gates preventing Era 1–2 regressions.

## Outcome and Scope

Turn the Era 3 **Family Cookbook** identity into a color-science-grounded, self-enforcing visual contract and automated test ratchet before migrating legacy screens:

1. **Normative Designer Harness & Reference Split:** Archive chronological session notes from `docs/visual-language-reference.md` into `docs/archive/visual-language-session-history.md` so `docs/visual-language-reference.md` owns only current, authoritative visual rules. Replace `.agents/skills/designer/solar-earth-design.md` with `.agents/skills/designer/cookbook-surfaces-and-motion.md` and expand `visual-identity.md` and `SKILL.md` with explicit Do/Do Not token matrices, role-locked color pairings, sheet/card anatomy, and explicit pointers to `modern-web-guidance` and `a11y-debugging`.
2. **Perceptual Color Science Token Repair (`globals.css` & `tailwind.config.ts`):**
   - Repair the inverted `charcoal` ramp (`50 -> 900` strictly monotonic in lightness) and warm the neutral undertone slightly toward espresso-ink so muted text/borders harmonize with `#FDFCF0` cream without simultaneous-contrast chill, preserving `>= 14:1` primary body and `>= 7:1` supporting ink contrast on cream.
   - Synchronize `terracotta` `#B85542` across `globals.css` and `pwa/tailwind.config.ts`, add `.cookbook-bg` alongside compatibility alias `.solar-earth-bg`, and add `CookbookLoader` alongside `SolarLoader` re-export until legacy callers migrate.
   - Formalize role-locked semantic pairings compensating for perceptual lightness asymmetry across brand hues (Terracotta $L \approx 0.56$, Sage $L \approx 0.66$, Ochre $L \approx 0.77$):
     - *Hearth Primary:* `bg-terracotta` (`#B85542`) + `text-cream-100` / `text-white` (`>= 4.61:1`)
     - *Sunlight Voting & Highlight:* `bg-ochre` (`#E1AD01`) + `text-charcoal` / `text-ochre-900` (`>= 7.12:1`), or `bg-ochre-50`/`100` + `text-ochre-800`/`900` (never white text on ochre; never bare `text-ochre` on light surfaces)
     - *Garden Participation & Completion:* `bg-sage-50` / `bg-sage/15` + `text-sage-800`/`900` (`>= 5.5:1`), or `bg-sage-700` (`#525B37`) + `text-white` (`7.22:1`)
     - *Error & Destructive:* `bg-terracotta-50` + `text-terracotta-700` + `border-terracotta-200` (`7.46:1`)
3. **Era 3 `Button` Primitive (`pwa/src/components/ui/button.tsx`):** Align `primary`, `secondary`, `ghost`, and `danger` (replacing `bg-ochre text-white` 2.06:1 with accessible terracotta destructive tokens), enforce `min-h-12` (`>= 48px`) hit targets on `md`/`lg` buttons, and add visible `focus-visible` outlines.
4. **Pulled-Forward Automated Visual Ratchet & Browser A11y Helper:**
   - Create `pwa/src/test/visual-contract.test.ts` running on every `task test:unit` to fail on: (a) off-palette tokens (`indigo`, `lavender`, `pink`, `red-*`, `ochre-dark`), (b) banned contrast pairs (`bg-ochre` with `text-white`, `bg-sage` with `text-white`, bare `text-ochre`/`text-sage` on light surfaces, `text-charcoal/20`–`40` copy), and (c) `< 12px` micro-text (`text-[8px]`..`text-[11px]`).
   - Enforce a strict **ratchet allowlist** (`LEGACY_ERA_ALLOWLIST`) covering only currently unmigrated files—new or un-allowlisted files fail immediately on any violation, and any allowlisted file whose violations hit zero fails until removed from the allowlist.
   - Create `pwa/e2e/visual-a11y-contract.ts` providing reusable Playwright/axe assertions for computed WCAG foreground/background contrast, `>= 48x48 CSS px` interactive targets, and zero horizontal overflow at `320px` / `200%` text.

**Exclusions:** Migrating existing Era 1–2 components off `LEGACY_ERA_ALLOWLIST` belongs to `unify-legacy-surfaces-to-family-cookbook` (and `refine-mobile-planner-recipes-and-grocery-ux` for its already scoped edits). Introducing native OKLCH CSS token refactoring and semantic Cookbook Primitives belongs to `explore-adaptive-hearth-and-cookbook-primitives`.

## What Changes

- Archive historical visual-language logs from `docs/visual-language-reference.md` into `docs/archive/visual-language-session-history.md` and rewrite `docs/visual-language-reference.md` as a concise normative guide.
- Replace `.agents/skills/designer/solar-earth-design.md` with `.agents/skills/designer/cookbook-surfaces-and-motion.md` and expand `.agents/skills/designer/SKILL.md`, `visual-identity.md`, and `.agents/skills/README.md`.
- Repair `--color-charcoal-*` progression/warmth and add `.cookbook-bg` in `pwa/src/app/globals.css`; sync `#B85542` terracotta in `pwa/tailwind.config.ts`; add `CookbookLoader` alias in `pwa/src/components/ui/SolarLoader.tsx`.
- Update `pwa/src/components/ui/button.tsx` variants (`danger` -> terracotta destructive, `min-h-12` targets on `md`/`lg`, `focus-visible` outline) with dedicated unit tests.
- Add `pwa/src/test/visual-contract.test.ts` (static visual contract + shrinking ratchet allowlist) and `pwa/e2e/visual-a11y-contract.ts` (computed browser contrast, 48px target, and reflow helper).

## Capabilities

### New Capabilities

- `visual-design-contract`: Owns Family Cookbook perceptual token scales, role-locked color contrast pairings, typography minimums, `48 CSS px` target standards, shared `Button` semantics, and automated visual-ratchet verification.

### Modified Capabilities

*(None — introduces `visual-design-contract` without changing existing product feature flows.)*

## Impact

- **Harness & Docs:** `docs/visual-language-reference.md`, `docs/archive/visual-language-session-history.md`, `.agents/skills/designer/{SKILL.md,visual-identity.md,cookbook-surfaces-and-motion.md}`, `.agents/skills/README.md`.
- **PWA Styling & UI Primitives:** `pwa/src/app/globals.css`, `pwa/tailwind.config.ts`, `pwa/src/components/ui/button.tsx`, `pwa/src/components/ui/SolarLoader.tsx`, `pwa/src/components/ui/index.ts`.
- **Automated Verification:** `pwa/src/test/visual-contract.test.ts`, `pwa/src/components/ui/button.test.tsx`, `pwa/e2e/visual-a11y-contract.ts`.

## Review Checkpoints Before Apply

Before running `/openspec-apply-change establish-cookbook-design-system-and-visual-ratchet`, review and adjust these items via `/openspec-explore` or `/openspec-update-change`:
- **Checkpoint 1 — Warm Charcoal Neutral Scale:** Confirm shifting `charcoal-50..900` in `globals.css` from cool Tailwind slate (`#1F2937` / `#4B5563` / `#9CA3AF`) to warm espresso-ink neutrals (while keeping `#1F2937` or `#231F1D` >= 14:1 on `#FDFCF0` cream) vs. fixing only the inverted `charcoal-500` step.
- **Checkpoint 2 — Button `danger` Styling:** Confirm `danger` uses soft destructive terracotta (`bg-terracotta-50 text-terracotta-700 border-terracotta-200`) rather than solid `bg-terracotta-700 text-white`, avoiding accidental confusion with primary Hearth CTAs.
- **Checkpoint 3 — Ratchet Rule Strictness:** Review the initial rule list in `design.md` (`indigo`, `pink`, `lavender`, `red-*`, `ochre-dark`, `bg-ochre` + `text-white`, `bg-sage` + `text-white`, bare `text-ochre`/`text-sage` small copy, `text-[8px]`–`text-[11px]`) and verify whether any subtle `11px` utility case (e.g., dense calendar markers) should be promoted to `12px` (`text-xs`) immediately or kept temporarily allowlisted.
