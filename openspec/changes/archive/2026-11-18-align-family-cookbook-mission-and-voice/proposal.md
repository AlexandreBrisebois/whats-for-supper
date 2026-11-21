# Proposal

## Why

`.agents/core/mission.md` currently defines product intent solely as building a _"high-performance Meal Planning Progressive Web App"_, omitting both the playful collaborative spark (**Swipe, Match, Cook!** from the October 18 post—where kids and household members want to help decide around recipes they love and a shared grocery list) and the North Star emotional relief anchor (_"That’s one less thing weighing on me. We chose this together, it feels like us, and I’m looking forward to supper."_). Meanwhile, `"Solar Earth"` nomenclature persists across 9 repository guidance/design docs and 3 capability specifications instead of the unified **`Shared Table`** identity paired with its **contemporary family cookbook** visual aesthetic. Finally, borrowed ops, dating, and ML microcopy (`"Command Center"`, `"Matchmaking"`, `"Synthesizing…"`, `"Synthesize Recipe"`, `"AI synthesizes..."`, the stale `'Recovery Flow'` code fallback, and missing-apostrophe `"Whats for Supper?"`) undermines the warm household voice already present in **`Table's Set!`** (`À table !`), **`Menu's In`** (`Le menu est prêt`), and **`Plan B`**.

## Outcome and Scope

Establish one coherent product identity (**`Shared Table`** with a preserved **contemporary family cookbook** visual aesthetic), lean mission/North Star alignment, and EN/FR household voice across repository guidance, capability specifications, public documentation, PWA manifest metadata, and key entry copy:

1. **Retire `"Solar Earth"` in favor of `Shared Table` while preserving the contemporary family cookbook aesthetic:** Replace `"Solar Earth"` naming across `.agents/core/mission.md`, `.agents/prompts/mere-designer.md`, `.agents/skills/README.md`, `.agents/skills/designer/SKILL.md`, `.agents/skills/designer/solar-earth-design.md` (heading only; file rename/expansion stays owned by `establish-cookbook-design-system-and-visual-ratchet`), `docs/agent-designer-identity.md`, `docs/creative-direction-north-star.md`, `docs/visual-language-reference.md`, `docs/flows/user-flows/sse-discovery-live-updates.md`, `docs/visual-language/01-roles-type-states.svg`, and the three owning capability specs (`grocery-shopping`, `member-context`, `recipe-library`). Explicitly retain **contemporary family cookbook** as the visual composition direction within **`Shared Table`** (`"contemporary family cookbook within Shared Table"`).
2. **Lean Single-Owner Mission & North Star Alignment:** Update `.agents/core/mission.md` (§2 Product Intent & §4 Core Design & UX Patterns) with **Swipe, Match, Cook!** collaborative household choice, shared recipes and grocery list, the North Star relief quote, and **`Shared Table`** + **contemporary family cookbook** design. Keep `docs/creative-direction-north-star.md` as the single authoritative owner of emotional direction and principles without duplicating frameworks or adding experimental Track 4 `"Four Energies"` labels (updating only line 49 from `"Solar Earth"` to **`Shared Table`** with a **contemporary family cookbook** feel).
3. **Standardize Brand Naming, `Shared Table` Voice & Entry Pitch:**
   - Preserve signature warm table idioms: **`Table's Set!`** / **`À table !`** (`profile.title`), **`Menu's In`** / **`Le menu est prêt`**, **`Swipe, Match, Cook!`**, and **`Plan B`** (`home.recoveryFlow` in locales, updating only the stale `'Recovery Flow'` fallback in `pwa/src/components/home/SkipRecoveryDialog.tsx`).
   - Replace literal `"Whats for Supper?"` with **`What's for Supper?`** across `pwa/src/app/page.tsx`, `pwa/src/app/(auth)/welcome/WelcomeForm.tsx`, `pwa/src/components/identity/DemoExplanation.tsx`, and `pwa/src/locales/{en,fr}/common.json`.
   - Retire `"Command Center"` and `"Matchmaking"` from `pwa/src/components/common/Header.tsx` and `docs/user-guide.md`, and replace `"Synthesizing…"` / `"Synthesize Recipe"` in `pwa/src/components/capture/MinimalCapture.tsx` plus `"AI synthesizes a full recipe from your description"` in `pwa/src/locales/en/common.json` (`familyGoto.describeDescription`) with localized warm copy (`Building your recipe…` / `Préparation de votre recette…`, non-repetitive readiness-notification subtext, and `Save & build recipe` / `Enregistrer et préparer la recette`).
   - Update `README.md` and `docs/user-guide.md` to pair **Swipe, Match, Cook!** with the North Star household relief promise.
   - Add a `Vote Together` (`/discovery`, short name `Vote`) direct household shortcut to `pwa/src/lib/baseManifest.json`.

**Exclusions:** CSS palette token repairs, `ui/button.tsx` variant changes, designer-skill surface/motion contract expansion, and visual ratchet test creation belong to `establish-cookbook-design-system-and-visual-ratchet`. Layout, contrast, and token cleanups across legacy Era 1–2 screens belong to `unify-legacy-surfaces-to-family-cookbook`. Adaptive shell experiments belong to `explore-adaptive-hearth-and-cookbook-primitives`.

## What Changes

- Update `.agents/core/mission.md` (§2 Product Intent, §4 Core Design & UX Patterns) with **Swipe, Match, Cook!**, the North Star relief quote, and **`Shared Table`** + **contemporary family cookbook** design; update `docs/creative-direction-north-star.md` line 49 from `"Solar Earth"` to **`Shared Table`** with a **contemporary family cookbook** feel while keeping the rest of its prose intact.
- Replace `"Solar Earth"` terminology with **`Shared Table`** across `.agents/` skills/prompts (including `.agents/skills/designer/solar-earth-design.md` heading only), `docs/`, SVG reference metadata, and capability specs (`grocery-shopping`, `member-context`, `recipe-library`), explicitly preserving **contemporary family cookbook** composition phrasing.
- Align `README.md` and `docs/user-guide.md` narrative positioning around **Swipe, Match, Cook!** and household relief, and remove `"Command Center"` / `"Matchmaking"` framing.
- Fix `"Whats for Supper?"` -> `"What's for Supper?"` in `pwa/src/app/page.tsx`, `WelcomeForm.tsx`, `DemoExplanation.tsx`, and `pwa/src/locales/{en,fr}/common.json`.
- Remove `"Command Center"` / `"Matchmaking"` micro-subtitles in `Header.tsx`, update the `'Recovery Flow'` fallback in `SkipRecoveryDialog.tsx` to `'Plan B'`, and replace `"Synthesizing…"` / `"Synthesize Recipe"` in `MinimalCapture.tsx` and `familyGoto.describeDescription` in `en/common.json` with localized `capture.buildingRecipe`, `capture.buildingRecipeSubtext`, and `capture.saveAndBuild` copy.
- Add the `Vote Together` (`/discovery`, short name `Vote`) household shortcut to `pwa/src/lib/baseManifest.json`.

## Capabilities

### New Capabilities

_(None — refines identity, voice, copy, and shortcut declarations across existing capabilities.)_

### Modified Capabilities

- `grocery-shopping`: Replace `"Solar Earth ochre highlight family"` terminology with `"Shared Table ochre highlight family"` in the `Extra` source label requirement.
- `member-context`: Replace `"Solar Earth"` naming with `"Shared Table"` in the Profile household-surface requirement.
- `recipe-library`: Replace `"Solar Earth"` naming with `"Shared Table"` in the cross-viewport recipe detail requirement while explicitly preserving contemporary cookbook composition.
- `demo-household`: Standardize the preserved landing and Welcome branding heading literal from `Whats for Supper?` to `What's for Supper?` across locales.
- `app-installation`: Add the `Vote Together` (`/discovery`) shortcut alongside `Search` and `Capture Meal` in `/manifest.json`, and update the Welcome beta branding literal check to `What's for Supper?`.
- `recipe-capture`: Replace technical `Synthesizing…` description-capture waiting heading and in-flight submit copy with warm localized `Building your recipe…` copy and non-repetitive readiness-notification subtext while retaining countdown, Done, and completion transitions.

## Impact

- **Repository Governance & Docs:** `.agents/core/mission.md`, `.agents/prompts/mere-designer.md`, `.agents/skills/README.md`, `.agents/skills/designer/SKILL.md`, `.agents/skills/designer/solar-earth-design.md` (heading only), `docs/agent-designer-identity.md`, `docs/creative-direction-north-star.md`, `docs/visual-language-reference.md`, `docs/visual-language/01-roles-type-states.svg`, `docs/flows/user-flows/sse-discovery-live-updates.md`, `docs/flows/user-flows/sse-capture-async-feedback.md`, `docs/flows/user-flows/sse-recipe-ready-notification.md`, `README.md`, `docs/user-guide.md`.
- **PWA Copy, Metadata & Components:** `pwa/src/lib/baseManifest.json`, `pwa/src/app/page.tsx`, `pwa/src/app/(auth)/welcome/WelcomeForm.tsx`, `pwa/src/components/identity/DemoExplanation.tsx`, `pwa/src/components/common/Header.tsx`, `pwa/src/components/home/SkipRecoveryDialog.tsx`, `pwa/src/components/capture/MinimalCapture.tsx`, `pwa/src/locales/{en,fr}/common.json`.
- **Tests:** `pwa/src/app/(auth)/welcome/page.test.tsx`, `pwa/src/components/identity/DemoContext.test.tsx`, `pwa/src/components/capture/MinimalCapture.test.tsx`, `pwa/src/locales/locale-integrity.test.ts`, `pwa/e2e/install-identity.spec.ts`, `pwa/e2e/welcome-demo.spec.ts`, `pwa/e2e/capture-flow.spec.ts`, and manifest route tests.

## Confirmed Exploration Decisions

- **Visual System Identity & Aesthetic Pairing:** **`Shared Table`** replaces `"Solar Earth"` as the product-wide design and voice identity, while **contemporary family cookbook** stays explicitly preserved as the card/recipe visual composition direction within **`Shared Table`**.
- **Lean Single-Owner Mission & North Star Split:** `.agents/core/mission.md` updates §2 (with **Swipe, Match, Cook!** collaborative choice, shared recipes and grocery list, and the North Star relief quote) and §4 (`Shared Table` + contemporary family cookbook design); `docs/creative-direction-north-star.md` keeps its existing prose intact and updates only line 49 (`"Solar Earth"` -> **`Shared Table`** with a contemporary family cookbook feel).
- **`Shared Table` Voice Filter & EN/FR Glossary:** Preserve warm table idioms (**`Table's Set!`** / **`À table !`** on Profile, **`Menu's In`** / **`Le menu est prêt`**, **`Swipe, Match, Cook!`**, and **`Plan B`**—fixing only `'Recovery Flow'` in `SkipRecoveryDialog.tsx`) while retiring `"Command Center"`, `"Matchmaking"`, and `"Synthesizing…"` / `"Synthesize Recipe"` / `"AI synthesizes..."`.
- **Public Positioning & Brand Apostrophe:** `README.md` hero retains `**Swipe, Match, Cook!**` paired with the household relief promise; landing, Welcome, and Beta welcome headings standardize on `What's for Supper?` across EN and FR.
