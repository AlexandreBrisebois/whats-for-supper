# Proposal

## Why

`.agents/core/mission.md` currently defines product intent solely as building a *"high-performance Meal Planning Progressive Web App"*, omitting the emotional relief of easing a heavy mind and the family-voting spark (*"Swipe, Match, Cook!"*) that brings kids and household members to the table. Meanwhile, `"Solar Earth"` nomenclature persists across 8 repository guidance/design docs and 3 capability specifications despite Era 3 (*Family Cookbook*) being the desired identity, and operational/dating-style microcopy (`"Command Center"`, `"Matchmaking"`, `"Synthesizing…"`, `"Table's Set!"`, and missing-apostrophe `"Whats for Supper?"`) undermines a warm, unified kitchen-table voice.

## Outcome and Scope

Establish one coherent product identity (**Family Cookbook**), mission, North Star, and EN/FR brand voice across repository guidance, capability specifications, public documentation, PWA manifest metadata, and key entry copy:

1. **Retire `"Solar Earth"` nomenclature:** Replace `"Solar Earth"` naming across `.agents/core/mission.md`, `.agents/prompts/mere-designer.md`, `.agents/skills/README.md`, `.agents/skills/designer/SKILL.md`, `docs/agent-designer-identity.md`, `docs/creative-direction-north-star.md`, `docs/visual-language-reference.md`, `docs/flows/user-flows/sse-discovery-live-updates.md`, `docs/visual-language/01-roles-type-states.svg`, and the three owning capability specs (`grocery-shopping`, `member-context`, `recipe-library`) with **Family Cookbook** *(subject to Review Checkpoint 1 confirmation of `"Family Cookbook"` vs `"Hearth"` before apply)*.
2. **Embed Cognitive Relief, the Weekly Household Loop, and the Four Household Energies:** Update `.agents/core/mission.md` (§2 & §4) and `docs/creative-direction-north-star.md` so every task understands:
   - Core anchor: *"That’s one less thing weighing on me. We chose this together, it feels like us, and I’m looking forward to supper."*
   - Weekly Household Supper Loop starting with playful voting: **1. Vote Together (*Swipe, Match, Cook!*) -> 2. Shape the Week & Shop -> 3. Cook Tonight or Pivot Without Guilt -> 4. Capture & Rotate (*Dreaming*)**.
   - **Four Household Energies:** *Energy 1: Playful Convergence* (Discovery Voting for kids & family), *Energy 2: Reflective Curation* (Planner & Capture), *Energy 3: In-Motion Utility* (Grocery Checklist), and *Energy 4: Depleted Execution* (5:00 PM Home & Cook's Mode) governed by **Visual Quietude**.
3. **Standardize Brand Naming, Voice & Entry Pitch:**
   - Replace literal `"Whats for Supper?"` with **`What's for Supper?`** across `pwa/src/app/page.tsx`, `pwa/src/app/(auth)/welcome/WelcomeForm.tsx`, `pwa/src/components/identity/DemoExplanation.tsx`, and `pwa/src/locales/{en,fr}/common.json`.
   - Retire `"Command Center"` and `"Matchmaking"` from `pwa/src/components/common/Header.tsx` and `docs/user-guide.md`, replace `"Synthesizing…"` in `pwa/src/components/capture/MinimalCapture.tsx` with warm localized copy (`"Building your recipe…"` / `"Préparation de votre recette…"`), and align `"Table's Set!"` / `"Recovery Flow"` terminology in the EN/FR Household Voice Glossary.
   - Update `README.md` and `docs/user-guide.md` to pair *"Swipe, Match, Cook!"* (the playful family kickoff) with *"one less thing weighing on you"* (coordinator relief).
   - Add a `Vote Together` (`/discovery`) direct household shortcut to `pwa/src/lib/baseManifest.json`.

**Exclusions:** CSS palette token repairs, `ui/button.tsx` variant changes, designer-skill surface/motion contract expansion, and visual ratchet test creation belong to `establish-cookbook-design-system-and-visual-ratchet`. Layout, contrast, and token cleanups across legacy Era 1–2 screens belong to `unify-legacy-surfaces-to-family-cookbook`.

## What Changes

- Update `.agents/core/mission.md` (§2 Product Intent, §4 Core Design & UX Patterns) and `docs/creative-direction-north-star.md` to formalize cognitive relief, the Weekly Household Loop, the Four Household Energies, Visual Quietude, and Family Cookbook identity.
- Replace `"Solar Earth"` terminology across `.agents/` skills/prompts, `docs/`, SVG reference metadata, and capability specs (`grocery-shopping`, `member-context`, `recipe-library`).
- Align `README.md` and `docs/user-guide.md` narrative positioning and remove `"Command Center"` / `"Matchmaking"` framing.
- Fix `"Whats for Supper?"` -> `"What's for Supper?"` in `pwa/src/app/page.tsx`, `WelcomeForm.tsx`, `DemoExplanation.tsx`, and `pwa/src/locales/{en,fr}/common.json`.
- Remove `"Command Center"` / `"Matchmaking"` micro-subtitles in `Header.tsx` and replace `"Synthesizing…"` in `MinimalCapture.tsx` with localized `capture.buildingRecipe` copy.
- Add the `Vote Together` (`/discovery`, short name `Vote`) household shortcut to `pwa/src/lib/baseManifest.json`.

## Capabilities

### New Capabilities

*(None — refines identity, copy, and shortcut declarations across existing capabilities.)*

### Modified Capabilities

- `grocery-shopping`: Replace `"Solar Earth ochre highlight family"` terminology with `"Family Cookbook ochre highlight family"` in the `Extra` source label requirement.
- `member-context`: Replace `"Solar Earth"` naming with `"Family Cookbook"` in the Profile household-surface requirement.
- `recipe-library`: Replace `"Solar Earth"` naming with `"Family Cookbook"` in the cross-viewport recipe detail requirement.
- `demo-household`: Standardize the preserved landing and Welcome branding heading literal from `Whats for Supper?` to `What's for Supper?` across locales.
- `app-installation`: Add the `Vote Together` (`/discovery`) shortcut alongside `Search` and `Capture Meal` in `/manifest.json`, and update the Welcome beta branding literal check to `What's for Supper?`.
- `recipe-capture`: Replace technical `Synthesizing…` description-capture waiting heading with warm localized `Building your recipe…` copy while retaining countdown, Done, and completion transitions.

## Impact

- **Repository Governance & Docs:** `.agents/core/mission.md`, `.agents/prompts/mere-designer.md`, `.agents/skills/README.md`, `.agents/skills/designer/SKILL.md`, `docs/agent-designer-identity.md`, `docs/creative-direction-north-star.md`, `docs/visual-language-reference.md`, `docs/visual-language/01-roles-type-states.svg`, `docs/flows/user-flows/sse-discovery-live-updates.md`, `docs/flows/user-flows/sse-capture-async-feedback.md`, `docs/flows/user-flows/sse-recipe-ready-notification.md`, `README.md`, `docs/user-guide.md`.
- **PWA Copy, Metadata & Components:** `pwa/src/lib/baseManifest.json`, `pwa/src/app/page.tsx`, `pwa/src/app/(auth)/welcome/WelcomeForm.tsx`, `pwa/src/components/identity/DemoExplanation.tsx`, `pwa/src/components/common/Header.tsx`, `pwa/src/components/capture/MinimalCapture.tsx`, `pwa/src/locales/{en,fr}/common.json`.
- **Tests:** `pwa/src/app/(auth)/welcome/page.test.tsx`, `pwa/src/components/identity/DemoContext.test.tsx`, `pwa/src/components/capture/MinimalCapture.test.tsx`, `pwa/src/locales/locale-integrity.test.ts`, `pwa/e2e/install-identity.spec.ts`, `pwa/e2e/welcome-demo.spec.ts`, `pwa/e2e/capture-flow.spec.ts`, and manifest route tests.

## Review Checkpoints Before Apply

Before running `/openspec-apply-change align-family-cookbook-mission-and-voice`, review and adjust these items via `/openspec-explore` or `/openspec-update-change`:
- **Checkpoint 1 — Visual System Name:** Confirm **Family Cookbook** as the replacement for `"Solar Earth"` (alternative: **Hearth**).
- **Checkpoint 2 — Apostrophe Fix Scope:** Confirm updating `"Whats for Supper?"` -> `"What's for Supper?"` in both English and French welcome/landing headings and updating affected Playwright/Vitest assertions (`welcome-demo.spec.ts`, `install-identity.spec.ts`).
- **Checkpoint 3 — Household Voice Glossary:** Review the EN/FR replacement pairs in `design.md` (`Command Center` -> removed/contextual day title; `Matchmaking` -> `Choose together` / `Choisir ensemble`; `Synthesizing…` -> `Building your recipe…` / `Préparation de votre recette…`; `Table's Set!` -> `Who's cooking today?` or `Household` / `Famille`; `Recovery Flow` -> `Change tonight's plan` / `Changer le plan de ce soir`).
- **Checkpoint 4 — Public Marketing Balance:** Review whether `README.md` hero section keeps `**Swipe, Match, Cook!**` as the sub-headline followed immediately by the cognitive-relief promise (*"One less thing weighing on you..."*).
