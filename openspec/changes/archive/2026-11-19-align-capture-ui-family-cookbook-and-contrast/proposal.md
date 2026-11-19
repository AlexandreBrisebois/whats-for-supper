# Proposal

## Why

An audit of the `/capture` route and its layout-level capture notifications against [visual-identity.md](../../../../.agents/skills/designer/visual-identity.md), [cookbook-surfaces-and-motion.md](../../../../.agents/skills/designer/cookbook-surfaces-and-motion.md), and [visual-language-reference.md](../../../../docs/visual-language-reference.md) found that Capture was left behind when the Family Cookbook identity and dual-mode contrast system (`Standard` AA and `High contrast` AAA) were introduced:

- **Standard AA failures in active capture copy:** [MinimalCapture.tsx](../../../../pwa/src/components/capture/MinimalCapture.tsx) uses `text-charcoal/50` (~`3.4:1`), `text-charcoal-300`, and `text-ochre-600` on light warm surfaces.
- **No dual-mode `--role-*` semantic tokens:** None of the active Capture files (`Header.tsx`, `(app)/layout.tsx`, `capture/page.tsx`, `MinimalCapture.tsx`, `PdfCaptureConfirmation.tsx`, `PdfCapturePanel.tsx`, `LibraryToast.tsx`, `RecipeFailureBanner.tsx`) consume `--role-*` semantic tokens (`ink-body`, `ink-muted`, `hearth-*`, `garden-*`, `sunlight-*`, `chrome-line`, `icon-affordance`). [MinimalCapture.tsx](../../../../pwa/src/components/capture/MinimalCapture.tsx#L1522) explicitly overrides `<Button variant="primary">` back to static `bg-terracotta`, breaking High Contrast AAA (`4.76:1` vs. required `>= 7.0:1`), while translucent chrome (`bg-cream/90 backdrop-blur-xl`, `bg-cream/90 backdrop-blur-md`, `bg-white/95`) and faint alpha borders (`border-terracotta/5`, `border-charcoal/5`, `border-charcoal/10`, `border-sage/30`) stay washed out under `data-contrast="high"`.
- **Touch target, keyboard & ARIA gaps:** `Pick from Gallery`, `View existing recipe`, and the photo remove `×` (`h-6 w-6`) fall below `48 × 48 CSS px`; cancel/dismiss controls, custom buttons, and inputs (`focus:outline-none`) lack clear `focus-visible` outlines; clickable photo thumbnails use `<div onClick>`; rating buttons lack `type="button"` / `aria-pressed`; several `<label>` elements lack `htmlFor`/`id`; and form error banners lack `role="alert"`.
- **Identity, localization, resource & cleanup gaps:** Capture buttons use `uppercase tracking-widest`, headings use `font-black`, copy and `t(...)` calls ignore `useLocale()`, photo staging calls `URL.createObjectURL(file)` inside `.map()` render without revocation, unguarded `animate-ping`/`animate-pulse`/spring animations ignore `prefers-reduced-motion`, `pwa/src/app/(app)/capture/confirm/page.tsx` is a Phase 0 stub, five unused legacy capture components still remain exported, and none of the Capture Playwright suites run `assertCookbookVisualA11y` in `'aa'` or `'aaa'`.

## Outcome and Scope

Migrate every active Capture UI surface and layout-level capture notification (`LibraryToast` and `RecipeFailureBanner`) to the Family Cookbook visual identity and dual-mode semantic role tokens (`Standard` AA and `High contrast` AAA), remediate all touch-target, keyboard/ARIA, localization, reduced-motion, and object-URL lifecycle defects, retire unreferenced legacy Capture stubs/components, and enforce `'aa'` and `'aaa'` Playwright `assertCookbookVisualA11y` verification across photo, URL, failure recovery, and PDF Capture journeys.

**Exclusions:** Does not alter backend API contracts, PostgreSQL schemas, OpenAPI specs, background capture workflows, SSE payloads, Capture store concurrency logic, or non-Capture routes.

## What Changes

- **Capture Shell & Header (`(app)/layout.tsx`, `capture/page.tsx`, `Header.tsx`, `globals.css`):** Apply `.cookbook-bg` on `/capture`, switch Capture header chrome to opaque `bg-cream border-chrome-line` in High Contrast (`data-contrast="high"`), widen container parity (`max-w-md`) where appropriate without causing horizontal overflow at `320px`, localize the `Cancel capture` link, remove `transition-all`, and add `focus-visible` outlines.
- **`MinimalCapture`, `PdfCaptureConfirmation`, `PdfCapturePanel`, `LibraryToast`, & `RecipeFailureBanner`:** Migrate all text, fills, borders, icon affordances, appreciation ratings, and spinner/loading states onto dual-mode `--role-*` semantic tokens (`ink-body`, `ink-muted`, `hearth-*`, `garden-*`, `sunlight-*`, `chrome-line`, `icon-affordance`), remove the static `bg-terracotta` override on `<Button variant="primary">`, enlarge all interactive targets to `>= 48 × 48 CSS px`, add visible keyboard focus rings, associate form labels and `role="alert"` banners, replace `<div onClick>` thumbnails with accessible buttons, manage staged photo object URLs with deterministic revocation, switch to localized sentence-case EN/FR copy via `useLocale()`, and guard animations under `prefers-reduced-motion`.
- **Legacy Capture Retirement:** Remove the stale `pwa/src/app/(app)/capture/confirm/page.tsx` stub route (and unused `ROUTES.CAPTURE_CONFIRM`) plus unreferenced legacy components (`CameraView.tsx`, `ImageReview.tsx`, `ImageReview.test.tsx`, `NotesField.tsx`, `RatingSelector.tsx`, `SubmitConfirmation.tsx`, `pwa/src/components/capture/index.ts`), moving object-URL lifecycle test coverage to active Capture component tests.
- **Browser Accessibility Verification:** Add `assertCookbookVisualA11y` assertions in both `'aa'` and `'aaa'` contrast modes across [capture-flow.spec.ts](../../../../pwa/e2e/capture-flow.spec.ts), [pdf-capture.spec.ts](../../../../pwa/e2e/pdf-capture.spec.ts), and [url-capture-recovery.spec.ts](../../../../pwa/e2e/url-capture-recovery.spec.ts).

## Capabilities

### New Capabilities

_(none — extends existing capability owners)_

### Modified Capabilities

- `recipe-capture`: Align all active `/capture` entry, photo/URL/description review, PDF confirmation, waiting/inline-ready states, `LibraryToast`, and failure notifications with Family Cookbook semantic presentation, `Standard` AA / `High contrast` AAA readability, `>= 48 × 48 CSS px` interactive geometry, keyboard/ARIA semantics, EN/FR localization, object-URL revocation, reduced-motion respect, and retire unused legacy Capture stubs/components.
- `capture-recovery`: Ensure layout-mounted `RecipeFailureBanner` notifications present high-contrast dual-mode colors, opaque borders, localized EN/FR copy, `>= 48 × 48 CSS px` Retry and Dismiss targets, visible keyboard focus, and reduced-motion behavior.
- `visual-design-contract`: Extend Playwright composite contrast and target verification requirements so Capture browser acceptance (`capture-flow.spec.ts`, `pdf-capture.spec.ts`, `url-capture-recovery.spec.ts`) enforces `assertCookbookVisualA11y` under both `'aa'` and `'aaa'` modes.

## Impact

- **PWA Shell, Styles & Routes:** [globals.css](../../../../pwa/src/app/globals.css), `pwa/src/app/(app)/layout.tsx`, `pwa/src/app/(app)/capture/page.tsx`, [Header.tsx](../../../../pwa/src/components/common/Header.tsx), `pwa/src/lib/constants/routes.ts`, and removal of `pwa/src/app/(app)/capture/confirm/page.tsx`.
- **Capture Components & Locales:** [MinimalCapture.tsx](../../../../pwa/src/components/capture/MinimalCapture.tsx), [PdfCaptureConfirmation.tsx](../../../../pwa/src/components/capture/PdfCaptureConfirmation.tsx), [PdfCapturePanel.tsx](../../../../pwa/src/components/capture/PdfCapturePanel.tsx), [LibraryToast.tsx](../../../../pwa/src/components/capture/LibraryToast.tsx), [RecipeFailureBanner.tsx](../../../../pwa/src/components/capture/RecipeFailureBanner.tsx), [en/common.json](../../../../pwa/src/locales/en/common.json), [fr/common.json](../../../../pwa/src/locales/fr/common.json), plus retirement of unreferenced legacy files under `pwa/src/components/capture/`.
- **Unit & Playwright Tests:** `pwa/src/components/capture/*.test.tsx`, [visual-contract.test.ts](../../../../pwa/src/test/visual-contract.test.ts), [capture-flow.spec.ts](../../../../pwa/e2e/capture-flow.spec.ts), [pdf-capture.spec.ts](../../../../pwa/e2e/pdf-capture.spec.ts), and [url-capture-recovery.spec.ts](../../../../pwa/e2e/url-capture-recovery.spec.ts).
