# Proposal

## Why

Discovery places cuisine and meal-type pills below the recipe image and Ready in in a separate footer. Recipes stack cards already offer the requested simpler composition: an on-image time badge and the recipe title beneath the image.

## Outcome and Scope

Align Discovery's metadata presentation with Recipes stack cards: remove the cuisine and meal-type pills, move Ready in into the hero, and remove its former footer. The proposed layout boundary keeps Discovery's current card/hero sizing rules and title styling, along with its stack motion, LOVE/PASS feedback, voting controls and queue behavior. This is a metadata presentation change, not a complete layout or interaction transplant. Preparation of this proposal does not authorize implementation.

## What Changes

- Display a single clock-and-Ready in badge at the hero's lower left, matching Recipes' existing badge treatment.
- Omit the badge when the existing duration formatter produces no usable time.
- Remove cuisine and meal-type pills and the old time footer/divider from Discovery cards; retain the recipe title.
- Preserve named image alternatives, readable bilingual text, reachable vote controls and all existing voting semantics.
- Revise the current Discovery requirement that explicitly mandates cuisine and meal-type badges.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-discovery`: simplify card facts and place formatted time on the hero while preserving vote controls.

## Impact

Production insertion point: `pwa/src/components/discovery/DiscoveryCard.tsx`. Visual reference: `pwa/src/components/recipes/RecipeStackCard.tsx`; duration and localization remain owned by `pwa/src/lib/duration.ts` and `pwa/src/locales/`. Relevant acceptance owners: `DiscoveryCard.test.tsx`, Discovery page tests, and `pwa/e2e/discovery.spec.ts` with existing `pwa/e2e/mock-api.ts` fixtures.

No API, generated client, backend, stored metadata or dependency changes. Recipes remains the unchanged reference. Removing visible classification reduces on-card information; that is the requested trade-off. Existing Discovery responsive sizing rules are retained rather than adopting Recipes' content-height card. This leaves unused space for short titles and can allow an image previously compressed by body content to grow; confirm this layout choice during design review.
