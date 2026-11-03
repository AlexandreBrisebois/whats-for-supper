# Proposal

## Why

The corrected stack geometry accidentally hid the actual recipe content on every backing card. Alex sees a blank white card while swiping instead of the next recipe; the content appears only after that card becomes front.

## What changes

- Keep the next loaded recipe's image and name visible beneath the moving front card. Its existing formatted time badge may remain visible under the same front-card presentation rules.
- Retain the front-matched backing geometry, shallow peeks, hidden backing-card interactivity/accessibility, tap-to-details, drag navigation and click-after-drag suppression. Long backing titles cannot increase the backing bounds or protrude into the counter/Ask the Family region.
- When a backing recipe image is unavailable, show its name using the existing card treatment rather than hiding all identity; do not introduce a new hero fallback or change image retrieval.

## Capability

- Modify `recipe-library` stack-card visual-depth behavior only. No Browse GET, Search POST, planning, Discovery voting, API, persistence, dock or action-panel change.

## Reproduction and status

The isolated `wfs-unify-preview` build `HDcSSYOCy84NkdlxVxUQLps` was exercised read-only with its 204 seeded recipes and an existing member. During a left drag from seeded Fajitas au bœuf haché, the next seeded Salade de pâtes B.L.T. card showed a blank white shell. Browser computed styles reported `visibility:hidden` on both the backing image and name; after release, that same identity became the front recipe. The local screenshot `/tmp/wfs-stack-seeded-mid-swipe.png` confirms the blank mid-swipe shell. Source `RecipeStackCard.tsx` applies `invisible` to both sections whenever `isFront` is false. The previous corrective change is already archived; this proposal is a distinct regression delta. The pending stack-placement and detail-action-spacing proposals stay separate.
