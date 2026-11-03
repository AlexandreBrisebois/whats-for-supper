# Proposal

## Why

Successive advances in the Recipes browse stack briefly enlarge the backing shell and its shadow. A six-recipe Chromium reproduction shows the defect even with equal-height titles: an inserted rear card begins at full size/opacity and inherits a briefly doubled stack layout height.

## Outcome and Scope

Keep the existing visual design and navigation, but make backing depth stable from first painted entry through promotion and removal. Full titles remain visible; a longer front title may legitimately change stack height. This proposal does not authorize implementation.

## What Changes

- Prevent an already departed card from contributing layout height alongside the promoted front card.
- Introduce a newly mounted rear card in its assigned depth pose, without a full-size, fully opaque flash.
- Preserve aligned depth peeks when the current front's complete title changes height.
- Add first-frame and repeated-navigation regressions with six records, equal-height and varied-title cases, rather than relying only on settled screenshots.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: clarify that the existing front-matched stack-bounds guarantee also applies during rear-card insertion and outgoing/front-card overlap.

## Impact

Primary owner: `pwa/src/components/recipes/RecipeStackCard.tsx`; presence and four-record window integration: `pwa/src/app/(app)/recipes/RecipesExperience.tsx`. Regression owners: `RecipeStackCard.test.tsx`, `pwa/e2e/recipes.spec.ts`, and existing stack-swipe helper/mock API fixtures. No API, generated client, data, Discovery, typography, shadow-token, swipe-threshold or pagination redesign.

The defect and diagnostic evidence are described in design.md. The smallest planned correction composes the presence ref through to the card DOM root establishes its first-frame depth pose, and matches the backing mount origin to the existing projected resting origin. Layout projection is retained unless focused evidence after those corrections shows that it still causes a separate bounds defect.
