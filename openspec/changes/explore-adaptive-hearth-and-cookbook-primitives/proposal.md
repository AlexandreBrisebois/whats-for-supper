# Proposal

## Why

Tracks 1–3 (`align-family-cookbook-mission-and-voice`, `establish-cookbook-design-system-and-visual-ratchet`, `refine-mobile-planner-recipes-and-grocery-ux`, `unify-legacy-surfaces-to-family-cookbook`) and follow-up Family Cookbook changes (`add-profile-contrast-mode`, `align-capture-ui-family-cookbook-and-contrast`, `align-decision-recovery-surfaces-pull-forward`, `nav-voting-signal-and-deterministic-matches`, `polish-planner-nav-and-recovery-chrome`) are already implemented and archived on `main`, establishing a zero-allowlist visual ratchet and dual-mode Standard AA / High Contrast AAA (`data-contrast="high"`) tokens. However, the current five-tab shell still treats most moments identically—whether kids are joyfully swiping meal ideas on Sunday morning or an exhausted cook is trying to get supper on the table at 5:15 PM Tuesday—and per-page utility classes still rely on developer discipline and post-hoc lint rules rather than making visual drift structurally impossible.

## Outcome and Scope

Prototype and evaluate a next-generation **Adaptive Family Cookbook** experience on a dedicated exploration branch (`explore/adaptive-family-cookbook`) branched from stabilized `main`, preserving 100% of backend API contracts, stores, and concurrency guarantees while re-imagining the UI and shell around five pillars:

1. **"Swipe, Match, Cook!" as the Hero Weekly Catalyst (Energy 1 — Playful Convergence):** Keep family voting unmistakably at the front of the weekly journey for kids and household members. Add a non-shaming **Family Table Progress** cue showing how close consensus candidates are to filling the week's open nights, tactile heirloom-card swipe physics with kid-friendly appetite cues, and a smooth **Match-to-Menu Bridge** when the family converges (complementing `Navigation.tsx`'s existing converged `"Menu's in"` Planner link).
2. **Adaptive 4-Energy Shell & State-Responsive Chrome (`adaptive-energy-shell`):** Adapt navigation prominence, cognitive density, and visual rhythm to the household's actual moment across four distinct energies:
   - _Energy 1 — Playful Convergence (Discovery Voting):_ Warm-sunlight ochre `Vote` prominence when a voting round is `collecting` or the week needs suppers (preserving `main`'s pip-free nav treatment).
   - _Energy 2 — Reflective Curation (Weekly Menu & Calm Capture):_ Editorial weekly menu spread plus non-blocking background capture status ribbon instead of full-screen countdown lock-in.
   - _Energy 3 — In-Motion Utility (Aisle Shop Mode):_ Glare-resistant high-contrast grocery rows (`>= 7.0:1` / high `APCA Lc` across both Standard AA and High Contrast AAA modes) with one-handed checkoffs and quiet partner sync.
   - _Energy 4 — Depleted Execution (5:00 PM Home & Cook's Mode):_ Strict cognitive budget (`<= 2` top-level focal groups on Home: Capture a Recipe followed by Tonight's Supper/Pivot card, with global voting kept on bottom navigation and no below-the-fold voting card or Home Browse tile per `tonight-meal-decisions`), level low-salience navigation once tonight is set, full chrome recession inside Cook's Mode, and a unified guilt-free `<CookbookSheet>` pivot sheet.
3. **Native CSS Perceptual Color Science (`oklch(L C H)`) & Paper Materiality:** Replace ad-hoc hex/opacity utilities and heavy reading-card `backdrop-blur` with perceptually uniform dual-mode OKLCH surface, ink, and brand contracts (`:root` Standard AA and `:root[data-contrast="high"]` High Contrast AAA, preserving `main`'s cooled herb Garden `#4E6E52` / `#324D36`, Hearth `#B85542` / `#7B3829`, and Sunlight ink `#856400` / `#664E01` roles) paired with warm layered paper and ambient umber shadows.
4. **Six Locked Semantic Cookbook Primitives (`cookbook-primitives-and-lab`):** Build `EnergyShell`, `CookbookCard`, `CookbookSheet` (native HTML `<dialog>` top layer), `Typography`, `Action`, and `StatusBadge` under `pwa/src/components/cookbook/` so exploration routes compose by _semantic intent and household energy_ rather than raw color, font-size, or border-radius classes.
5. **Living Specimen Lab (`/dev/cookbook-lab`) & Graduation Protocol:** Build a non-production specimen route rendering all 4 Energies side-by-side in EN/FR across Standard AA and High Contrast AAA (`data-contrast="high"`) at `320px`/200%, `390px`, and `834px` viewports with interactive household-state toggles and live contrast/touch-target checks for physical-phone review with the family, enabling selective graduation back to `main`.

**Exclusions:** No backend schema, OpenAPI contract, or `.NET` persistence changes; exploration work stays isolated on `explore/adaptive-family-cookbook` until proven slices are promoted through separate follow-up OpenSpec changes on `main`.

## What Changes

- Define dual-mode native CSS `oklch(L C H)` perceptual token contracts (`:root` Standard AA and `:root[data-contrast="high"]` High Contrast AAA, with sRGB fallbacks preserving cooled herb Garden and warm paper surfaces) and tactile paper elevation in `pwa/src/app/globals.css`.
- Author six locked Cookbook Primitives (`EnergyShell`, `CookbookCard`, `CookbookSheet`, `Typography`, `Action`, `StatusBadge`) under `pwa/src/components/cookbook/` and extend `pwa/src/test/visual-contract.test.ts` (whose `LEGACY_ERA_ALLOWLIST` is already `{}`) to forbid raw color/type/radius classes in prototype routes.
- Build `/dev/cookbook-lab` (guarded to return `404` outside development/exploration mode) rendering all 4 Household Energies in EN/FR and Standard/High Contrast across phone and tablet viewports.
- Prototype Energy 1 (_"Swipe, Match, Cook!"_ Family Table Progress + Match-to-Menu Bridge), Energy 4 (5:00 PM Quiet Home within `<= 2` focal groups + `<CookbookSheet>` Pivot + Chrome-Receded Cook's Mode), Energy 2 (Editorial Planner + Non-Blocking Capture Ribbon), and Energy 3 (Glare-Proof Aisle Shop Mode) on `explore/adaptive-family-cookbook`.

## Capabilities

### New Capabilities

- `adaptive-energy-shell`: State-responsive household shell, adaptive navigation voting salience, Home cognitive-load budgets, chrome-receded Cook's Mode, non-blocking capture progress, and glare-resistant aisle shopping focus across the Four Household Energies.
- `cookbook-primitives-and-lab`: Locked semantic UI primitives (`EnergyShell`, `CookbookCard`, `CookbookSheet` on `<dialog>`, `Typography`, `Action`, `StatusBadge`), dual-mode perceptual OKLCH color contracts, and the non-production `/dev/cookbook-lab` EN/FR specimen and accessibility harness.

### Modified Capabilities

- `recipe-discovery`: Add non-shaming Family Table Progress cues during open voting and a structured Match-to-Menu convergence bridge keeping _"Swipe, Match, Cook!"_ effortless for kids and family members without individual shaming or premature week locking.

## Impact

- **Branch Isolation:** Git branch `explore/adaptive-family-cookbook` branched from stabilized `main`.
- **PWA Prototype Architecture:** `pwa/src/app/globals.css` (dual-mode OKLCH layer), `pwa/src/components/cookbook/*`, `pwa/src/app/dev/cookbook-lab/page.tsx`, and exploratory route adaptations for `(app)/layout.tsx`, `(app)/home/`, `(app)/discovery/`, `(app)/planner/`, `(app)/capture/`, and `CooksMode.tsx`.
- **Verification:** `pwa/src/test/visual-contract.test.ts` (strict primitive-only rule for prototype directories building on `LEGACY_ERA_ALLOWLIST = {}`), `pwa/src/test/tokens.test.ts` and Vitest component/dialog/OKLCH unit suites, plus `pwa/e2e/cookbook-lab.spec.ts` and mocked Playwright suites reusing `pwa/e2e/visual-a11y-contract.ts` (live Postgres browser test suites were intentionally removed on `main`, so exploration verification uses Vitest + mocked Playwright suites).

## Review Checkpoints Before Apply

Before creating `explore/adaptive-family-cookbook` and starting `/openspec-apply-change explore-adaptive-hearth-and-cookbook-primitives`, review and shape these creative exploration questions:

- **Checkpoint 1 — Top-Level Navigation Structure:** Keep 5 items (`Home`, `Recipes`, `Vote`, `Planner`, `Profile`) with adaptive `Vote` prominence, OR test promoting `Shop` (Groceries) directly into the primary bar while folding `Recipes` + `Vote` under a clearer household rhythm?
- **Checkpoint 2 — Family Table Progress Language:** For Energy 1 (_"Swipe, Match, Cook!"_), prefer playful milestone phrasing for kids (_"3 of 5 nights matched — 2 more to go!"_) vs. quiet numeric pills, ensuring zero tracking of who hasn't voted?
- **Checkpoint 3 — Paper Warmth & Tactility:** Decide during `/dev/cookbook-lab` physical-phone inspection whether cream `#FDFCF0` (`oklch(0.99 0.015 100)`) vs. slightly warmer cookbook stock (`oklch(0.975 0.02 90)`) feels calmer under kitchen evening lighting and bright store fluorescent lighting.
- **Checkpoint 4 — Capture Ribbon vs. Confirmation Page:** Confirm keeping the non-blocking background capture status ribbon inside `EnergyShell` for quick multi-recipe cookbook additions while retaining `/capture`'s full-screen camera/PDF workspace.
