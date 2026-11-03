# Design

## Context and Existing Ownership

Source inspection at base `ea9b98cc25bb66b4d6913ad4b1c81dabff1f08a6` establishes the following; these are source values, not measured browser dimensions.

| Aspect | Recipes stack reference | Discovery today |
| --- | --- | --- |
| Shell | White, 2.5rem corners, top white/20 border; two-layer shadow: 0 4px 6px -1px black/10 and 0 20px 40px -1px black/5 | Same shell |
| Width and height | `RecipesExperience.tsx`: max 24rem, then 36rem at md; content-driven card; hero `clamp(192px,35vh,320px)` | Discovery page: max 24rem arena, aspect 3/4 below md, 60vh at md, minimum 400px; card absolutely fills arena except bottom 3rem; hero preferred height 62%, subject to flex shrinking |
| Image | Cover crop, full-width, non-draggable; deeper images hidden after stack index 1 | Cover crop, full-width, non-draggable; bottom 8rem black gradient |
| Time | Lower-left badge, 1rem insets, max width image minus 2rem; 14px decorative clock; opaque terracotta-50, terracotta-700 text, white border and medium shadow; padding .75rem horizontal/.5rem vertical, .375rem gap | Separate ochre footer pill below title and classifications, top divider and 1.5rem top padding; no clock |
| Typography | Badge: .75rem, bold, uppercase, wide tracking. Title: Outfit token, bold, tight tracking/leading, 1.5rem then 1.875rem at md, wraps words; 1.5rem horizontal padding then 2rem at md, 1rem vertical | Title: Outfit token, 1.5rem bold, tight tracking/leading, 1rem bottom margin; body 2rem padding; cuisine 11px black-weight uppercase, meal types .75rem bold uppercase |
| Depth | Per index: scale minus .05 (floor .8), y plus 15px, opacity minus .3 (floor 0), z-index 10 minus index | Same depth arithmetic, different animation tuning |
| Actions | Tap or Enter/Space opens detail; right swipe previous / left next, 35px or 280px/s release thresholds; BACK/NEXT indicators | Right like / left pass, 80px or 500px/s release thresholds; LOVE heart / PASS cross indicators; separate vote buttons |

Primary files: `pwa/src/components/recipes/RecipeStackCard.tsx`, `pwa/src/app/(app)/recipes/RecipesExperience.tsx`, `pwa/src/components/discovery/DiscoveryCard.tsx`, and `pwa/src/app/(app)/discovery/page.tsx`. Discovery's `description` prop currently produces no visible description. `hasFamilyInterest` does not add a card ring. Neither is an invitation to add content.

`pwa/src/app/globals.css` owns tokens: terracotta-50 `#f9ece9`, terracotta-700 `#7b3829`, sage `#8a9a5b`, ochre `#e1ad01`, charcoal `#1f2937`; heading token is Outfit, body/data uses Inter. `formatRecipeTime` owns duration formatting (for example `PT45M` → `45 MINS`, `PT1H20M` → `1H 20 MINS`, empty/zero → empty). Existing locale key `common.readyIn` owns Ready in copy.

### Rendered observations and limits

Two existing Chromium scenarios passed against the local test-mode app with mocked API data: `Discovery Flow › presents and votes for the first server-ranked recipe` and `Recipes Search Page › searches on Enter and shows the top pick result`. Inspected trace frames show Discovery's time in the lower white body, while Recipes shows the pale terracotta clock/time capsule at the hero's lower left above its title. Both show white rounded stacked shells above the navigation dock. The Discovery scenario also exercised button votes against the ranked front identities.

Hero assets failed or were unavailable in these mock renders (external image requests reported certificate errors); image composition/cropping with loaded photography was therefore not visually qualified. The Discovery fixtures in this scenario do not demonstrate populated classification pills; their current presence is established by source and component tests. These desktop trace observations do not establish mobile fit, touch behavior, loaded-font fidelity, or the proposed design. Temporary inspected frames: `/tmp/wfs-discovery-frame-11.jpeg` and `/tmp/wfs-recipes-frame-36.jpeg`.

## Decisions and Tradeoffs

1. Apply the reference badge treatment inside Discovery's current hero. Preserve Discovery's sizing rules and title styling as a proposed conservative scope boundary, while preserving the user-required voting behavior. Keeping height is a proposal choice for review, not an explicit user request. Adopting Recipes' full content-height layout would also change image height, card width and the vote-control relationship; that broader redesign is excluded from this proposal.
2. Remove the classification cluster and old time footer/divider, leaving the title below the hero. Preserve the existing body/title positioning rather than collapsing the whole card. With ordinary short titles this leaves unused white space beneath the title because the absolutely sized shell does not collapse. The hero has `h-[62%]` but no `shrink-0`: removing body content can also let a previously compressed image grow toward its preferred height. Preserve the sizing rules, not an unsupported promise of identical measured hero pixels. The alternative of shortening the shell to a compact image-plus-title card is a separate layout decision. Supplied metadata remains in data models and API payloads.
3. Use existing `formatRecipeTime`, `tWithVars('common.readyIn', ...)`, tokens and clock treatment. Omit the badge for an empty formatted result, as Recipes does; do not show `READY IN` without a value or invent a duration. Allow text wrapping within the bounded badge width rather than clipping translated copy.
4. Keep the new badge above the existing gradient and swipe-feedback layer (reference z-index 30 versus feedback 20); it remains visually readable during a drag. Preserve LOVE/PASS feedback, motion springs, release thresholds, callbacks, haptics and gesture surface. The badge is passive text with a decorative clock, no role/button/tabIndex and no pointer interception. Do not transplant Recipes' detail-opening interaction or navigation callbacks. Test horizontal drags initiated directly over the badge and vertical scrolling over it: the passive overlay must remain part of the existing card gesture surface. At narrow/short sizes verify that a wrapped badge does not obscure the central LOVE/PASS label or icon; do not change vote thresholds to fix a visual collision.
5. Keep the change in Discovery's existing presentation owner. No shared interactive card abstraction is needed: the two cards have different action contracts. Reuse formatter/localization/tokens; any future shared badge extraction requires a real ownership benefit, not this proposal alone.

The current main spec explicitly requires supplied cuisine/meal badges. The delta intentionally replaces that obligation while retaining its empty-queue scenario and voting alternatives. No other Discovery requirement changes.

## First Observable Slice

Open `/discovery` with a selected mock member and a ranked recipe carrying cuisine, meal types and a 45-minute duration. The real page renders the real Discovery card with a lower-left on-image time badge, title below and no classification cluster/footer. Activate Like recipe and check the existing vote submission still targets that front identity; repeat pass and swipe paths. Internal seams are page → DiscoveryCard → duration/locales/CSS and existing page vote handlers. Only API traffic is doubled by existing `pwa/e2e/mock-api.ts` handlers; no backend layer changes, live database or production data are required for this visual slice.

## User Experience

The opaque badge provides stable contrast over bright, dark or missing images; verify rendered terracotta-700 on terracotta-50 at 4.5:1 or better. Preserve the recipe-name image alt and visible heading. The clock is hidden from assistive technology, while the localized text conveys the time. No extra focus stop, click action or announcement is added.

Exercise English/French copy, long wrapping titles and durations at 320×568, 390×844, 768×1024 and 1440×900, plus 200% zoom. Confirm badge bounds, title visibility, no horizontal overflow, and reachable keyboard/touch vote controls. Keep existing reduced-motion preferences and do not add animation. Check missing/empty/zero time and failed image requests. Existing loading, empty, convergence, invalidation and vote-error flows remain owned by the unchanged page/store behavior.

## Risks and Deferrable Questions

- Removing classifications reduces visible decision context, an explicit requested trade-off; retain underlying facts and other surfaces.
- Retaining the outer Discovery height will leave unused space for ordinary short titles. It is not full visual parity with Recipes' compact title band. Exact space and image height depend on viewport, title length and flex shrink; no modified render exists yet. Review this height choice before implementation; if a compact shell is wanted, revise the proposal/spec/tasks first. Do not silently change the layout during implementation.
- Source inspection cannot establish rendered fit, font loading, contrast or touch behavior. Browser acceptance is required before implementation is called verified; this proposal does not claim rendered parity.
- The proposal consistently selects existing sizing rules; review acceptance of that choice remains pending. Full width/height parity with Recipes is outside this scoped metadata proposal and would require a revised spec if requested. Short-screen/zoom clipping exposed by acceptance must be reported for a scoped design decision rather than resolved through an unapproved layout redesign.
