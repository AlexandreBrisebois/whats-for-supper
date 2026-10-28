# Proposal

## Why

The user reports that recent Tonight styling makes the planned meal card too tall on their standard Pixel 10, hiding the two lower Home tiles. Source/history inspection confirms that commit `44cd9eef` replaced the capped 4:3 meal image with an uncapped square; existing layout checks scroll controls into view and do not establish initial-viewport discovery.

## Outcome and Scope

Restore an appetizing landscape photograph within a centred, width-capped cookbook card whose height follows its content. At ordinary text size with a short title, collapsed details and no intervening notices or voting card, the complete planned card and both lower tile labels should be visible above navigation on the primary portrait phone acceptance viewport. Preserve a 160 CSS px minimum photo height: long titles, enlarged text and expanded ingredients grow the page rather than squeeze the image or clip text.

The primary physical target is the standard Pixel 10. Its actual CSS viewport and display settings have not been measured; automated viewport fixtures are reproducible layout checks, not claims of device qualification. This increment changes the planned-meal composition only; preserve pivot, voting, recovery, cooking, capture and library behavior.

## What Changes

- Replace the planned card's near-square image requirement with a full-inner-width landscape image whose height adapts to viewport space and never falls below 160 CSS px when usable imagery is present.
- Retain photographic emphasis, prominent title, warm rounded surfaces and soft depth from `docs/visual-language/references`.
- Tighten planned-card spacing while retaining readable copy, visible actions and 48 by 48 CSS px targets.
- Make initial visibility of Capture a Recipe and Browse your library labels explicit acceptance, with scrolling permitted when long content, text growth, additional Home status or reduced viewport space prevents fitting.
- Add browser geometry checks before any scrolling, alongside existing reflow, disclosure and interaction checks.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tonight-meal-decisions`: adaptive landscape planned-meal imagery, protected minimum photograph height and initial discovery of lower Home handoffs; revise the existing cookbook composition requirement coherently.

## Impact

- Planned layout owner: `pwa/src/components/home/TonightMenuCard.tsx`.
- Shared image owner: `pwa/src/components/home/TonightRecipeImage.tsx`; preserve pivot presentation if a caller-specific option is needed.
- Home spacing/order owner: `pwa/src/components/home/HomeCommandCenter.tsx`; lower tile content remains owned by `HomeSections.tsx`.
- Acceptance owners: `pwa/e2e/home-recipe.spec.ts`, `pwa/e2e/helpers/tonight-card-layout.ts`, existing planned/pivot component and Home tests.
- No API, persistence, generated client, package, or server policy changes. Existing unrelated planner/localization work remains outside this change.
