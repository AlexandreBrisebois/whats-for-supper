# Design

## Context and Existing Ownership

Authoritative current owners observed during inspection:
- **Mission & Governance:** [`.agents/core/mission.md`](../../../.agents/core/mission.md) (§2 Product Intent lines 6–7 currently describe WFS strictly as a *"high-performance Meal Planning Progressive Web App"*; §4 line 51 references `"Solar Earth"`).
- **North Star:** [`docs/creative-direction-north-star.md`](../../../docs/creative-direction-north-star.md) (holds the core emotional quote on line 5 and the five principles, but places Capture ahead of Voting in examples without explicitly structuring the Weekly Household Supper Loop or the Four Household Energies, and preserves `"Solar Earth"` on line 49).
- **Designer Harness & Docs:** `"Solar Earth"` appears across [`.agents/prompts/mere-designer.md`](../../../.agents/prompts/mere-designer.md#L68), [`.agents/skills/README.md`](../../../.agents/skills/README.md#L13), [`.agents/skills/designer/SKILL.md`](../../../.agents/skills/designer/SKILL.md#L3), [`docs/agent-designer-identity.md`](../../../docs/agent-designer-identity.md#L64), [`docs/visual-language-reference.md`](../../../docs/visual-language-reference.md#L1), [`docs/visual-language/01-roles-type-states.svg`](../../../docs/visual-language/01-roles-type-states.svg#L2), [`docs/flows/user-flows/sse-discovery-live-updates.md`](../../../docs/flows/user-flows/sse-discovery-live-updates.md#L31), and three capability specifications ([`grocery-shopping`](../../../openspec/specs/grocery-shopping/spec.md#L795), [`member-context`](../../../openspec/specs/member-context/spec.md#L219), [`recipe-library`](../../../openspec/specs/recipe-library/spec.md#L1250)).
- **Marketing & Household Voice:**
  - [`README.md`](../../../README.md#L7) highlights `**Swipe, Match, Cook!**` and [`docs/user-guide.md`](../../../docs/user-guide.md#L17) calls Home `"your command centre"`.
  - [`pwa/src/components/common/Header.tsx`](../../../pwa/src/components/common/Header.tsx#L54-L69) renders `"Supper"` with `8px` uppercase `"Command Center"` or `"Matchmaking"` subtitles.
  - Missing-apostrophe `"Whats for Supper?"` is hardcoded as a literal requirement in [`pwa/src/app/page.tsx`](../../../pwa/src/app/page.tsx#L17), [`pwa/src/app/(auth)/welcome/WelcomeForm.tsx`](../../../pwa/src/app/(auth)/welcome/WelcomeForm.tsx#L58), [`pwa/src/components/identity/DemoExplanation.tsx`](../../../pwa/src/components/identity/DemoExplanation.tsx#L68), [`pwa/src/locales/en/common.json`](../../../pwa/src/locales/en/common.json#L44), [`pwa/src/locales/fr/common.json`](../../../pwa/src/locales/fr/common.json#L44), and tests (`welcome/page.test.tsx`, `install-identity.spec.ts`, `welcome-demo.spec.ts`).
  - [`pwa/src/components/capture/MinimalCapture.tsx`](../../../pwa/src/components/capture/MinimalCapture.tsx#L761) displays `'Synthesizing…'` (and `'Synthesize Recipe'` on line 1532) during describe-recipe capture.
- **PWA Shortcuts:** [`pwa/src/lib/baseManifest.json`](../../../pwa/src/lib/baseManifest.json#L48-L73) advertises `Search` and `Capture Meal` without a `Vote Together` (`/discovery`) shortcut, despite description `"Swipe, Match, Cook!"`.

## Decisions and Tradeoffs

### 1. Retire "Solar Earth" -> Family Cookbook (vs. "Hearth")
- **Choice:** Standardize on **Family Cookbook** across governance, skills, docs, SVG labels, and capability specs.
- **Why:** `"Refined family cookbook"` already anchors [`docs/visual-language-reference.md`](../../../docs/visual-language-reference.md#L37) and [`openspec/changes/archive/2026-10-27-home-meal-card-visual-hierarchy/`](../../../openspec/changes/archive/2026-10-27-home-meal-card-visual-hierarchy/proposal.md). It immediately communicates kitchen warmth, belonging, and printed-recipe legibility to both human designers and AI models.
- **Alternative / Review Checkpoint 1:** **Hearth** (already reflected internally in `h_access` / `setHearthCookie`). Family Cookbook is recommended because it directly prevents SaaS/dashboard visual habits; confirm before apply.

### 2. Preserve "Swipe, Match, Cook!" Within the Weekly Household Loop & Four Energies
- **Choice:** Structure `.agents/core/mission.md` and `docs/creative-direction-north-star.md` around the **Weekly Household Loop** (**1. Vote Together (*Swipe, Match, Cook!*) -> 2. Shape the Week & Shop -> 3. Cook Tonight or Pivot Without Guilt -> 4. Capture & Rotate (*Dreaming*)**) paired with the **Four Household Energies**:
  1. **Playful Convergence (Discovery Voting):** Fast, appetizing, kid- and family-friendly participation that converges and exits cleanly.
  2. **Reflective Curation (Planner & Capture):** Unhurried week-at-a-glance clarity and *"save and forget"* capture.
  3. **In-Motion Utility (Grocery Checklist):** Glare-resistant, one-handed, live partner sync in the store aisle.
  4. **Depleted Execution (5:00 PM Home & Cook's Mode):** Strict visual quietude—one clear dish, one primary action (*Cook*), or one guilt-free pivot (*Change plan* / *Take Out*).
- **Tradeoff:** Resolving the apparent tension between *"playful"* (`Swipe, Match, Cook!`) and *"calm"* (`easing a heavy mind`) by assigning them to distinct household moments prevents future changes from either making Home loud or making Discovery sterile.

### 3. Household Voice Glossary (EN & FR)
| Context | Retired Term | New English Copy | New French Copy | Owner |
|---|---|---|---|---|
| Home header subtitle | `Command Center` | *(Omitted — title stands alone)* | *(Omit — title stands alone)* | `Header.tsx`, `docs/user-guide.md` |
| Discovery header subtitle | `Matchmaking` | `Choose together` (or omitted in shell) | `Choisir ensemble` | `Header.tsx` |
| Brand heading & Beta welcome | `Whats for Supper?` | `What's for Supper?` | `What's for Supper?` | `page.tsx`, `WelcomeForm.tsx`, `DemoExplanation.tsx`, `locales/` |
| Description capture wait | `Synthesizing…` | `Building your recipe…` | `Préparation de votre recette…` | `MinimalCapture.tsx`, `locales/` |
| Description capture CTA | `Synthesize Recipe` | `Save idea & build recipe` | `Enregistrer et préparer la recette` | `MinimalCapture.tsx`, `locales/` |
| Profile welcome heading | `Table's Set!` | `Who's cooking today?` *(or keep `Table's Set!` if preferred — Checkpoint 3)* | `Qui cuisine aujourd'hui ?` | `profile/page.tsx`, `locales/` |
| Tonight recovery header | `Recovery Flow` | `Change tonight's plan` *(visual polish completed in Stream 3B)* | `Changer le plan de ce soir` | `SkipRecoveryDialog.tsx`, `locales/` |

### 4. Manifest Shortcut Addition Without Breaking Existing Consumers
- Append `Vote Together` (`/discovery`, short name `Vote`, description `Vote on supper ideas with your family`, 192px PNG icon) to `pwa/src/lib/baseManifest.json` ahead of or alongside `Search` and `Capture Meal`. Keep `/recipes?focus=search` and `/capture` URLs, descriptions, and short names verbatim so existing shortcut behaviors remain intact.

## First Observable Slice

The smallest behaviorally testable slice in this change is **Slice 2 + Slice 3**: updating `What's for Supper?` across `page.tsx` / `WelcomeForm.tsx` / `DemoExplanation.tsx` / `locales/`, updating `Synthesizing…` -> `capture.buildingRecipe` in `MinimalCapture.tsx`, removing `"Command Center"` / `"Matchmaking"` from `Header.tsx`, and adding `Vote Together` to `baseManifest.json`—exercised directly by `app-identity.test.ts`, `pdfManifest.test.ts`, `welcome/page.test.tsx`, `DemoContext.test.tsx`, `MinimalCapture.test.tsx`, `locale-integrity.test.ts`, and `install-identity.spec.ts`.

## Compatibility, Rollout and Reversal

- **Manifest shortcuts:** Additive entry in `baseManifest.json`; existing installed apps retain OS-cached metadata until refreshed (`app-installation` already notes no OS-cache guarantee).
- **Test impact:** Unit/E2E tests asserting the literal `'Whats for Supper?'` (`welcome/page.test.tsx`, `install-identity.spec.ts`, `welcome-demo.spec.ts`) or exact 2-item `shortcuts` array (`app-identity.test.ts`, `pdfManifest.test.ts`) must be updated in lockstep with the contract changes.
- **CSS alias preservation:** `.solar-earth-bg` and `SolarLoader` symbol renames wait until `establish-cookbook-design-system-and-visual-ratchet` so documentation naming moves cleanly ahead of code/CSS symbol migrations.

## User Experience

- Visitors opening Demo, Beta, Welcome, or `README.md` immediately understand both promises without dissonance: kids/family get a fun, zero-friction way to vote on supper (*Swipe, Match, Cook!*), while the household coordinator sees calm reassurance (*one less thing weighing on you*).
- Eliminating `"Command Center"`, `"Matchmaking"`, and `"Synthesizing…"` removes technical/corporate friction during tired weekday moments while preserving every functional route and recovery guarantee.
