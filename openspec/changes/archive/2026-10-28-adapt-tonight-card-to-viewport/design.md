# Design

## Context and Existing Ownership

See [proposal](proposal.md) for the reported regression and scope. A design is useful because viewport adaptation must coexist with a photograph minimum, content-driven height and two shared card consumers.

`TonightMenuCard.tsx` owns the planned card and currently supplies `aspect-square` to `TonightRecipeImage.tsx`. The shared image wrapper supplies full width, a 28px bottom margin, rounding, object-cover cropping and a modest failed/missing-image fallback. `TonightPivotCard.tsx` also consumes that image component and the shared shell; avoid changing its proportions accidentally.

`HomeCommandCenter.tsx` owns a centred width-capped column and renders voting status before `QuickCaptureTrigger` and `BrowseLibraryTrigger` from `HomeSections.tsx`. `Layout.tsx` owns safe-area clearance and bottom navigation. Keep these existing responsibilities; there is no new state or service policy.

`expectTonightLayout` in `pwa/e2e/helpers/tonight-card-layout.ts` scrolls individual controls into view and captures full-page screenshots. That supports reachability but cannot establish initial discovery. The current cookbook tests in `home-recipe.spec.ts` already supply image fixtures, schedule builders, locale coverage and failed-image cases.

## Decisions and Tradeoffs

1. **Landscape photograph with protected presence.** Keep the full inner card width, rounded crop and photographic emphasis from both repository references. Replace the planned square crop with CSS-driven viewport-responsive height, a hard 160 CSS px minimum and a preferred ordinary range of roughly 200–240 CSS px when width and height permit. Keep the image wider than tall at ordinary portrait phone sizes. The preferred range is tuning guidance; the 160px minimum is acceptance. Do not impose this minimum on failed/missing-image fallback.
2. **Content owns card height.** Use normal flow, not a fixed-height card, internal scroll area or a flex layout that compresses the image to fit a long title. Cap width using the existing Home column. Tighten planned-card whitespace and context layout before reducing readable type or control targets. Keep the original title, disclosure and buttons; no truncation or hidden actions.
3. **Use CSS for viewport adaptation.** Use a bounded height expression based on stable/small viewport space, capped appropriately for landscape image width. Avoid measuring recipe text to squeeze the photograph and avoid a new resize observer or store. Browser chrome reducing available height must cause safe page overflow after the image reaches its floor. This avoids visual jumps when the browser toolbar expands or collapses.
4. **Change planned presentation at its caller.** If the shared image needs configurable spacing or sizing, make it explicit and preserve existing defaults for the pivot. Limit Home spacing changes to the planned composition if needed; retain Home ordering and existing lower tiles rather than redesigning them or moving voting content.
5. **Define a reproducible primary acceptance viewport.** Use 412 by 915 CSS px, ordinary 100% text, EN/FR, a title occupying at most two lines, usable imagery, collapsed ingredients, settled closed voting and no extra banners. This fixture is an implementation planning assumption based on the existing Pixel-labelled test viewport, not a measured Pixel 10 specification. Require the complete planned card and both lower tile labels above navigation at scroll position zero. Also exercise 390 by 844, 412 by 800, 320 by 640, and tablet portrait/landscape for safe reflow and photo minimum; initial fit is only mandatory for the primary fixture. Physical Pixel 10 review records its actual viewport, browser/PWA mode and display/text settings separately.

## First Observable Slice

Load `/home` with the existing schema-compliant schedule/image fixture and settled voting state, wait for font and image readiness, remain at page top, and measure the planned card, photo, both tile labels and fixed navigation. Observe the regression before styling changes. Apply only planned-card image/spacing changes, then establish the landscape photo minimum and initial discovery at the primary viewport.

This slice crosses the actual Home column, planned card, shared image, lower tile and navigation layout. Use existing API-boundary mocks and SSE schedule helpers; browser route interception alone does not control Home's server-rendered schedule. No backend layer changes are required.

## User Experience

The photograph and full recipe title remain the visual lead; Cook is the dominant terracotta action, Change plan stays secondary and View ingredients remains explicit. Preserve bilingual content, duration formatting, disclosure identity reset, keyboard semantics/focus and at least 48 by 48 CSS px targets. Review screenshots against both references for warm surfaces, rounding, soft depth and appetizing crop; their original image proportions and yellow actions are not prescribed.

Long titles, enlarged text, ingredient expansion, voting content, notices and short viewports can grow the page. Keep the image floor and all information, preserve navigation clearance and allow ordinary vertical scrolling. Image failure retains the existing compact fallback. Do not hide a voting/checking/error state just to achieve the ordinary fit target.

## Risks and Deferrable Questions

- A simulated desktop viewport does not establish physical Pixel 10 rendering. Record physical review separately and report it as not run if unavailable; do not infer phone settings from hardware pixels.
- Updating a shared shell or image default can affect the pivot. Prefer caller-specific changes and run the existing pivot browser/component checks if shared code or Home spacing changes.
- Geometry must be measured before helper-induced scrolling, screenshots with scrolling side effects, focus or action activation. A passing full-page screenshot or `toBeVisible()` alone does not establish in-viewport visibility; compare actual label/card bounds against navigation and viewport bounds.
- If the primary fixture cannot satisfy fit while protecting photo and text minima, diagnose spacing first and surface the conflict rather than silently weakening acceptance. No runtime layout has been qualified during planning.

## Implementation tuning

The planned shell is an inline-size CSS container solely to cap the landscape photo against its content width. Its height is `clamp(160px, min(40svh - 140px, 75cqw), 240px)`: the outer clamp protects the floor even on unusually narrow screens. Planned context, image, action and disclosure margins are tightened at the caller; no shared image/shell defaults or Home/tile spacing changes are needed. At 412 by 915 the loaded photo is 330 by 226px. Card height remains content-driven.
