# Tasks

## 1. Exploration Branch Setup and Perceptual OKLCH Token Layer

**Outcome and scenarios:** Isolated branch `explore/adaptive-family-cookbook` is created from stabilized `main`, and `globals.css` provides native CSS `oklch(L C H)` surface, warm-umber ink, Hearth, Sunlight, and Garden tokens with sRGB fallbacks clearing WCAG 2.2 AA contrast ratios. Covers `cookbook-primitives-and-lab` ("Define perceptual OKLCH lightness and warm-ink token contracts").
**Owners and boundaries:** Git branch `explore/adaptive-family-cookbook`, `pwa/src/app/globals.css`, `pwa/src/test/oklch-tokens.test.ts`. Do NOT commit exploratory changes to `main`.
**Dependencies and prerequisites:** Tracks 1–3 (`align-family-cookbook-mission-and-voice`, `establish-cookbook-design-system-and-visual-ratchet`, `refine-mobile-planner-recipes-and-grocery-ux`, `unify-legacy-surfaces-to-family-cookbook`) defined/stabilized on `main`; Review Checkpoints 1–4 reviewed.
**Acceptance boundary:** Unit tests verifying `oklch()` declarations, sRGB fallbacks, and computed contrast ratios across every permitted token pair.

- [ ] 1.1 Create branch `explore/adaptive-family-cookbook` from `main` and write failing contrast/token unit tests in `pwa/src/test/oklch-tokens.test.ts` asserting all `--paper-*`, `--ink-*`, `--hearth-*`, `--sunlight-*`, and `--garden-*` CSS variables exist with valid `oklch(...)` values and contrast-verified pairings. Run `cd pwa && npm run test:unit -- src/test/oklch-tokens.test.ts` to observe expected failure.
- [ ] 1.2 Add the OKLCH token layer and tactile paper elevation utilities to `pwa/src/app/globals.css` (retaining sRGB fallbacks). Rerun `cd pwa && npm run test:unit -- src/test/oklch-tokens.test.ts` and confirm green.

## 2. Six Locked Cookbook Primitives and Native Dialog Sheet

**Outcome and scenarios:** `EnergyShell`, `CookbookCard`, `CookbookSheet` (native HTML `<dialog>` top layer), `Typography`, `Action`, and `StatusBadge` exist under `pwa/src/components/cookbook/` with accessible keyboard/focus/backdrop contracts, `>= 48px` targets, and strict primitive-only enforcement in `visual-contract.test.ts` for prototype paths. Covers `cookbook-primitives-and-lab` ("Compose screens through the six semantic Cookbook Primitives", "Implement CookbookSheet on native modal dialog semantics").
**Owners and boundaries:** `pwa/src/components/cookbook/{EnergyShell,CookbookCard,CookbookSheet,Typography,Action,StatusBadge,index}.tsx`, `pwa/src/components/cookbook/cookbook.test.tsx`, `pwa/src/test/visual-contract.test.ts`. Consult `modern-web-guidance` (`modal dialog` / `popover`) before implementing `CookbookSheet`.
**Dependencies and prerequisites:** Slice 1 green.
**Acceptance boundary:** Vitest unit/interaction tests covering `CookbookSheet` `showModal()`, `Escape` + backdrop dismissal, `guardDismiss` interception, focus return, `Action` `>= 48px`/pending states, and `visual-contract.test.ts` rejecting raw Tailwind color/size utilities inside prototype directories.

- [ ] 2.1 Write failing unit tests in `pwa/src/components/cookbook/cookbook.test.tsx` (testing `<dialog>` `showModal()`, `Escape`, backdrop click, `guardDismiss` prevention, focus return, `Action` intent contrast & pending stability, `Typography` 12px floor) and add a strict prototype-directory rule to `pwa/src/test/visual-contract.test.ts`. Run `cd pwa && npm run test:unit -- src/components/cookbook/cookbook.test.tsx src/test/visual-contract.test.ts` to observe failure.
- [ ] 2.2 Consult `modern-web-guidance` for native `<dialog>` top-layer/backdrop guidance and implement all six primitives in `pwa/src/components/cookbook/`. Rerun `cd pwa && npm run test:unit -- src/components/cookbook/cookbook.test.tsx src/test/visual-contract.test.ts` and verify pass.

## 3. Living Bilingual Four-Energy Specimen Lab (`/dev/cookbook-lab`)

**Outcome and scenarios:** `/dev/cookbook-lab` renders all 4 Household Energies in English and French across `320px`/200% text, `390px`, and `834px` viewports with interactive state toggles in development/exploration mode, and returns `404` under standard production builds. Covers `cookbook-primitives-and-lab` ("Expose a development-only four-energy bilingual specimen lab").
**Owners and boundaries:** `pwa/src/app/dev/cookbook-lab/page.tsx`, `pwa/src/app/dev/cookbook-lab/CookbookLabClient.tsx`, `pwa/src/app/dev/cookbook-lab/page.test.tsx`, `pwa/e2e/cookbook-lab.spec.ts`, `pwa/src/locales/{en,fr}/common.json`.
**Dependencies and prerequisites:** Slice 2 green; `pwa/e2e/visual-a11y-contract.ts` available from `establish-cookbook-design-system-and-visual-ratchet`.
**Acceptance boundary:** Vitest production `404` gate test + Playwright `cookbook-lab.spec.ts` executing `assertCookbookVisualA11y` across all 4 Energies in EN and FR at `320px` (200% text), `390px`, and `834px`.

- [ ] 3.1 Add failing tests in `pwa/src/app/dev/cookbook-lab/page.test.tsx` (asserting `notFound()` when `NODE_ENV === 'production'` without explicit lab opt-in, and interactive 4-Energy rendering in dev mode) plus `pwa/e2e/cookbook-lab.spec.ts` checking `320px`/200%, `390px`, `834px` EN/FR rendering via `assertCookbookVisualA11y`. Run unit and E2E tests to observe failure.
- [ ] 3.2 Implement `/dev/cookbook-lab` strictly using the 6 Cookbook Primitives and localized specimen fixtures. Rerun `cd pwa && npm run test:unit -- src/app/dev/cookbook-lab/page.test.tsx src/test/visual-contract.test.ts src/locales/locale-integrity.test.ts` and `task test:e2e -- e2e/cookbook-lab.spec.ts` until green.

## 4. Energy 1 Prototype — "Swipe, Match, Cook!" Family Table Progress & Match Bridge

**Outcome and scenarios:** Exploratory Discovery showcases heirloom card swipe physics, appetizing dish cues, non-shaming collective **Family Table Progress** (`X of Y nights matched` without naming pending voters), early review exit, and the converged **Match-to-Menu Bridge** into Planner. Covers `recipe-discovery` ("Display non-shaming Family Table progress during open voting", "Bridge converged family matches into weekly menu review").
**Owners and boundaries:** Exploratory updates on `explore/adaptive-family-cookbook` in `pwa/src/app/(app)/discovery/page.tsx`, `pwa/src/components/discovery/DiscoveryCard.tsx`, `pwa/src/components/discovery/FamilyTableProgress.tsx`, and `pwa/src/app/(app)/planner/page.tsx` match-review state, wired exclusively through Cookbook Primitives and `discoveryStore` / `weekStore`.
**Dependencies and prerequisites:** Slice 3 green; Review Checkpoint 2 phrasing selected.
**Acceptance boundary:** Vitest Discovery & FamilyTableProgress unit specs + Playwright `e2e/voting-session-live.spec.ts` / exploratory Discovery E2E assertions verifying zero individual-shaming copy, intact vote semantics, and smooth Match-to-Menu handoff.

- [ ] 4.1 Add failing unit/E2E tests in `pwa/src/components/discovery/FamilyTableProgress.test.tsx`, `pwa/src/app/(app)/discovery/page.test.tsx`, and exploratory Discovery Playwright coverage asserting collective progress display, absence of per-member pending shaming, early exit to matches, and Match-to-Menu unsaved suggestion distinction. Run `cd pwa && npm run test:unit -- src/components/discovery/FamilyTableProgress.test.tsx src/app/\(app\)/discovery/page.test.tsx` to observe failure.
- [ ] 4.2 Implement Energy 1 Discovery prototype via Cookbook Primitives, connect `discoveryStore` + `weekStore` open-night metrics, and ensure `visual-contract.test.ts` passes with zero raw style violations. Rerun Vitest and `task test:e2e -- e2e/voting-session-live.spec.ts`.

## 5. Energy 4 Prototype — Adaptive Shell, 5:00 PM Quiet Home, Unified Sheet & Cook's Mode

**Outcome and scenarios:** `EnergyShell` adapts bottom navigation `Vote` prominence between active `collecting`/empty-week states and quiet planned weeknights; Home honors the `<= 3` focal-group cognitive budget; Home recovery/pivot sheets migrate onto `<CookbookSheet>` (`<dialog>`); and Cook's Mode recedes all global chrome inside device safe areas. Covers `adaptive-energy-shell` ("Adapt navigation voting salience to household planning state", "Enforce the 5:00 PM Home cognitive load budget", "Recede navigation chrome during active Cook's Mode").
**Owners and boundaries:** `pwa/src/app/(app)/layout.tsx`, `pwa/src/components/common/Navigation.tsx`, `pwa/src/components/home/{HomeCommandCenter,TonightMenuCard,TonightPivotCard,SkipRecoveryDialog}.tsx`, `pwa/src/components/planner/CooksMode.tsx`. Preserve `todayStore`, `useReplacementRecovery`, and Cook's Mode save/projection invariants.
**Dependencies and prerequisites:** Slice 4 green; Review Checkpoint 1 choice selected.
**Acceptance boundary:** Vitest tests (`Navigation.test.tsx`, `HomeCommandCenter.test.tsx`, `SkipRecoveryDialog.test.tsx`, `CooksMode.test.tsx`) + Playwright `tonight-replacement-recovery.spec.ts`, `cook-mode-steps.spec.ts`, and `visual-a11y-contract`.

- [ ] 5.1 Write failing behavioral and chrome-budget tests across `Navigation.test.tsx`, `HomeCommandCenter.test.tsx`, `SkipRecoveryDialog.test.tsx`, and `CooksMode.test.tsx` verifying adaptive `Vote` salience, Home `<= 3` focal groups, `<CookbookSheet>` `guardDismiss` partial-recovery protection, and chrome-receded Cook's Mode. Run targeted Vitest suites to observe expected failures.
- [ ] 5.2 Refactor `(app)/layout.tsx`, `Navigation.tsx`, Home components, and `CooksMode.tsx` onto `EnergyShell`, `CookbookCard`, `CookbookSheet`, `Typography`, `Action`, and `StatusBadge`. Rerun Vitest + `task test:e2e -- e2e/tonight-replacement-recovery.spec.ts e2e/cook-mode-steps.spec.ts e2e/home-race.spec.ts`.

## 6. Energies 2 & 3 Prototype — Editorial Planner, Non-Blocking Capture Ribbon & Aisle Shop Mode

**Outcome and scenarios:** Planner adopts editorial weekly rhythm and `<CookbookSheet>` for `PlanningPivotSheet` & `NonCookingDaySheet`; capture submissions enable immediate non-blocking return via `EnergyShell`'s background status ribbon; and Grocery Checklist delivers high-contrast glare-proof one-handed shopping without scroll jumps on SSE updates. Covers `adaptive-energy-shell` ("Present non-blocking background capture progress", "Provide high-contrast one-handed aisle shopping focus").
**Owners and boundaries:** `pwa/src/app/(app)/planner/page.tsx`, `pwa/src/components/planner/{GroceryList,PlanningPivotSheet,NonCookingDaySheet,QuickFindModal}.tsx`, `pwa/src/components/capture/MinimalCapture.tsx`, `pwa/src/components/cookbook/EnergyShell.tsx`.
**Dependencies and prerequisites:** Slice 5 green; Review Checkpoints 3 & 4 confirmed.
**Acceptance boundary:** Vitest suites (`GroceryList.test.tsx`, `MinimalCapture.test.tsx`, `planner/page.test.tsx`, `QuickFindModal.test.tsx`) + Playwright `planner.spec.ts`, `capture-flow.spec.ts`, and `visual-a11y-contract`.

- [ ] 6.1 Add failing tests for non-blocking capture ribbon progression/failure recovery (`MinimalCapture.test.tsx` / `EnergyShell`), Grocery `>= 7:1` item contrast and SSE scroll stability (`GroceryList.test.tsx`), and `<CookbookSheet>` behavior in `PlanningPivotSheet` / `NonCookingDaySheet` / `QuickFindModal`. Run targeted Vitest suites to observe failures.
- [ ] 6.2 Implement Energies 2 & 3 on `explore/adaptive-family-cookbook` using Cookbook Primitives and verify `visual-contract.test.ts` + Vitest + `task test:e2e -- e2e/planner.spec.ts e2e/capture-flow.spec.ts`.

## 7. Full Prototype Walkthrough, Physical-Device Family Review & Graduation Plan

- [ ] 7.1 Run full `cd pwa && npm run test:unit`, run affected Playwright suites + `cookbook-lab.spec.ts`, execute an interactive mobile/tablet walkthrough on physical phones with the household using the 5-point Graduation Rubric in `design.md`, and document concrete graduation recommendations (which slices promote back to `main` via follow-up OpenSpec changes vs. what stays experimental) without merging `explore/adaptive-family-cookbook` wholesale.
