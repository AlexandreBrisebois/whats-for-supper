# Proposal

## Why

After Browse moved into the Recipes page, the stack card's large image, clipped description and low time pill compete for limited phone height. Alex prefers a simpler card face: food image, recipe name and time on the image. Home also invents “Ready in 30 mins” when a planned recipe has no supplied duration.

## Outcome and Scope

The stack face SHALL show a recognizable hero, the complete recipe name and, only when a usable total duration exists, a localized Ready In badge over the image. The face SHALL omit description and other secondary metadata. Home's planned Tonight card SHALL omit its time badge when no usable total duration exists; valid supplied durations retain their value, units and localized wrapper.

The front card SHALL retain its existing tap-to-detail, swipe-to-navigate and keyboard detail-opening behavior. This change SHALL NOT add a visible Previous / View recipe / Next row. Existing Search-specific boundary/navigation affordances remain only where they were already part of the unified flow. Four-card depth, external position and Ask the Family controls, Explore/Search collection state, planner context and detail actions remain in place. Backing cards SHALL follow the front card's height with small consistent depth peeks even when their own hidden titles are longer. This change does not move detail inline, remove a modal, change recipe data or change the shared duration parser.

## What Changes

- Simplify the stack card face and place its total-time badge on the photo using the established clock, localized label and warm badge vocabulary.
- Keep the existing card interaction model and remove the newly introduced visible three-action row.
- Size backing cards to the front card rather than their own hidden content or an expanded empty result region.
- Omit the stack time badge when duration cannot be formatted; keep a missing time from becoming a false estimate.
- Remove the planned Home meal card's fallback duration so missing or unusable source time produces no badge.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: stack face content, placement of optional total time and aligned backing-card depth.
- `tonight-meal-decisions`: planned Home card presentation when total time is unavailable.

## Impact

The presentation owners are `RecipeStackCard`, the `RecipesExperience` stack container, `TonightMenuCard` and the `HomeCommandCenter` value handoff, with focused component and browser tests. `formatRecipeTime`, `common.readyIn`, API DTOs, generated client, persistence, Search/Explore retrieval and other duration consumers are unchanged. The detail sheet's existing empty-time label remains governed by its separate recipe-library requirement. Visual references are the supplied stack screenshots, the current Home meal badge and `docs/visual-language-reference.md`.

## Correction after preview review

Alex rejected the deployed three-button row as unrequested clutter and reported backing cards protruding well below the front card. The earlier proposal introduced that row beyond the original image/name/time request. This revision removes it from the intended result and requires front-card-based stack geometry. The deployed preview remains unchanged until this correction receives separate implementation approval and passes its tests.
