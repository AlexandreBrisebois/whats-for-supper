# Tasks

## 1. Color Science Token Repair and Shared Button Upgrade

**Outcome and scenarios:** `globals.css` and `tailwind.config.ts` synchronize `#B85542` terracotta and expose a monotonic warm espresso-ink `charcoal` ramp (`50` through `900`), `.cookbook-bg` + `CookbookLoader` exist alongside compatibility aliases, and `ui/button.tsx` passes WCAG 2.2 AA contrast and `>= 48px` target sizing across all variants. Covers `visual-design-contract` ("Maintain monotonic warm-neutral and brand token scales", "Provide accessible Family Cookbook shared Button variants").
**Owners and boundaries:** `pwa/src/app/globals.css`, `pwa/tailwind.config.ts`, `pwa/src/components/ui/button.tsx`, `pwa/src/components/ui/SolarLoader.tsx`, `pwa/src/components/ui/index.ts`, `pwa/src/components/ui/button.test.tsx`, `pwa/src/test/tokens.test.ts`. Do NOT migrate feature callers of `.solar-earth-bg` or `<SolarLoader>` here.
**Dependencies and prerequisites:** Review Checkpoints 1 & 2 confirmed (`charcoal` warm ramp hex values and `danger` terracotta styling).
**Acceptance boundary:** Vitest unit tests evaluating parsed `globals.css`/`tailwind.config.ts` relative luminance monotonicity + terracotta hex parity and rendering `Button` variants/sizes.

- [ ] 1.1 Create `pwa/src/test/tokens.test.ts` and `pwa/src/components/ui/button.test.tsx` asserting (a) `globals.css` and `tailwind.config.ts` define monotonically darker `charcoal` stops `50..900` and `#B85542` primary terracotta parity, and (b) `Button` `danger` avoids `bg-ochre text-white`, `md`/`lg` enforce `min-h-12`, and all variants include `focus-visible` outline classes. Run `cd pwa && npm run test:unit -- src/test/tokens.test.ts src/components/ui/button.test.tsx` to observe expected failures before edits.
- [ ] 1.2 Update `pwa/src/app/globals.css` (warm monotonic `charcoal-50..900` stops + `.cookbook-bg` alongside `.solar-earth-bg`), `pwa/tailwind.config.ts` (`#B85542` terracotta + matching `charcoal` stops), `pwa/src/components/ui/SolarLoader.tsx` (`CookbookLoader` export + `SolarLoader` alias), `pwa/src/components/ui/index.ts`, and `pwa/src/components/ui/button.tsx`. Rerun `cd pwa && npm run test:unit -- src/test/tokens.test.ts src/components/ui/button.test.tsx` and confirm green.

## 2. Pulled-Forward Automated Visual Contract Ratchet and Browser Helper

**Outcome and scenarios:** `pwa/src/test/visual-contract.test.ts` enforces zero off-palette, low-contrast ochre/sage/white, and `< 12px` micro-text drift on all non-allowlisted PWA files (and fails on stale allowlist entries), while `pwa/e2e/visual-a11y-contract.ts` provides computed composite contrast, `>= 48px` target, and `320px`/200% reflow verification for Playwright specs. Covers `visual-design-contract` ("Enforce ratcheted visual contract checks against off-palette and micro-type drift", "Verify rendered composite contrast and touch targets in browser acceptance").
**Owners and boundaries:** `pwa/src/test/visual-contract.test.ts`, `pwa/e2e/visual-a11y-contract.ts`, plus a targeted smoke usage in `pwa/e2e/goto-layout.spec.ts` or `pwa/e2e/recipe-detail-layout.spec.ts` (or dedicated `pwa/e2e/visual-a11y-contract.spec.ts`).
**Dependencies and prerequisites:** Review Checkpoint 3 confirmed; Slice 1 green (`Button` and token files pass cleanly without allowlist exemption).
**Acceptance boundary:** Vitest unit test covering both live `pwa/src` scanning and synthetic negative fixture checks for ratchet failure/tightening, plus Playwright execution of `visual-a11y-contract`.

- [ ] 2.1 Write unit tests inside `pwa/src/test/visual-contract.test.ts` validating both the scanner's violation rules (synthetic samples for `text-indigo`, `bg-ochre text-white`, `bg-sage text-white`, `text-ochre`, `text-[10px]`) and live `pwa/src/app` + `pwa/src/components` compliance with an initial `LEGACY_ERA_ALLOWLIST` recorded against observed Era 1–2 files; run `cd pwa && npm run test:unit -- src/test/visual-contract.test.ts` to verify rule detection and refine exact allowlist counts before finalizing.
- [ ] 2.2 Implement `pwa/e2e/visual-a11y-contract.ts` exporting `assertCookbookVisualA11y` (computed sRGB luminance contrast, `>= 48px` target geometry, horizontal reflow check) and verify it against an existing mocked Era 3 Playwright scenario (e.g., `task test:e2e -- e2e/visual-a11y-contract.spec.ts`) demonstrating both passing Era 3 checks and caught violation failure in test coverage.

## 3. Normative Designer Harness Upgrade and Reference Split

**Outcome and scenarios:** Historical session diaries move from `docs/visual-language-reference.md` to `docs/archive/visual-language-session-history.md`, leaving a clean current specification; `.agents/skills/designer/` exposes explicit Do/Do Not token pairings, sheet/card anatomy, and `modern-web-guidance` / `a11y-debugging` pointers.
**Owners and boundaries:** `docs/visual-language-reference.md`, `docs/archive/visual-language-session-history.md`, `.agents/skills/designer/SKILL.md`, `.agents/skills/designer/visual-identity.md`, `.agents/skills/designer/cookbook-surfaces-and-motion.md` (replacing `solar-earth-design.md`), `.agents/skills/README.md`, and any links in `.agents/` pointing to `solar-earth-design.md`.
**Dependencies and prerequisites:** Slice 1 token values and role pairs finalized so documentation cites exact implemented values.
**Acceptance boundary:** Documentation link checks, `task test:agent`, and absence of broken relative references to retired `solar-earth-design.md`.

- [ ] 3.1 Split chronological session notes from `docs/visual-language-reference.md` into `docs/archive/visual-language-session-history.md`, retaining current Family Cookbook role tables, typography hierarchy, icon semantics, and mobile review checklists in `docs/visual-language-reference.md`. Verify all intra-doc relative links resolve cleanly.
- [ ] 3.2 Replace `.agents/skills/designer/solar-earth-design.md` with `.agents/skills/designer/cookbook-surfaces-and-motion.md`, expand `visual-identity.md` with the Role-Locked Color Matrix and Do/Do Not table, update `SKILL.md` to integrate `modern-web-guidance` and `a11y-debugging`, and update links in `.agents/skills/README.md`. Verify with `grep -rn "solar-earth-design" .agents docs` returning 0 matches and run `task test:agent`.

## 4. Final Integration and Verification

- [ ] 4.1 Run `task prepare -- <changed-pwa-paths>`, inspect `git status --short` and diffs, verify `cd pwa && npm run test:unit` (including `tokens.test.ts`, `button.test.tsx`, `visual-contract.test.ts`), verify `task test:agent`, and run `task verify -- <complete-task-paths>`, reporting actual command statuses and `record_path`.
