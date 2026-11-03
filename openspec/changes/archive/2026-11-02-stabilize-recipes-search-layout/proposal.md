# Proposal

## Why

In Recipes, the Search button shifts when a scope label changes, and fixed viewport arithmetic can leave result space unused or cause dock overlap at enlarged text. Planner entry adds an 82 CSS px context banner below expanded Search controls, delaying the first visible recipe on a short phone.

## Outcome and Scope

Keep Search at a stable left content gutter, let the current collection use the visible region up to the app dock, and make the existing planner target clear in a compact independent context row. On a short or enlarged viewport, controls and the first recipe must remain reachable by intentional scrolling; a complete first card need not fit before scrolling when the screen cannot physically hold it. Preserve the unified Explore/Search session, presentation, filters, planner target, selection and recovery behavior.

The existing `/recipes` page has no visible shared page header, so this change does not replace a title or add a new Change-day action. The compact row retains Cancel back to Planner and conditional calendar Retry. No API, ranking, persistence, seeded media, planning contract, dock destination or authentication change is included.

## What Changes

- Anchor the toolbar Search action to a consistent left gutter across All/Discovery, disclosure, collection state, stack/list and responsive wrapping, while preserving toolbar and keyboard order.
- Size the results region to the actual visible viewport and dock boundary through browser chrome, keyboard, safe-area and text-size changes. Retain scroll position, continuation and recovery behavior; never conceal a card or action under the dock.
- Show a compact localized “Choosing for Monday” style context row above the Recipes toolbar only for planner-targeted entry. Search field and Filters still open directly below the toolbar. Keep the existing Cancel and conditional Retry actions; allow long day labels and enlarged text to wrap and scroll safely.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: Stable toolbar placement and usable result viewport in both presentations.
- `recipe-search`: Compact, independent planner context without changing selection, cancellation or Search-session semantics.

## Impact

The PWA app shell, Recipes toolbar/results, bottom Navigation geometry, localized planner-context copy and focused layout/browser tests are in scope. The existing `pwa/e2e/mock-api.ts` GET `/api/recipes` and POST `/api/recipes/search` handlers remain the browser test seam and retain their request/response shapes. Earlier `unify-recipe-browse-search` and `refine-recipes-visual-language` changes remain the behavior and visual baseline. The reported Android screenshots and local geometry findings are recorded in `.task/search-height/findings.md`; actual Android viewport measurements remain an acceptance check rather than an assumed fact.
