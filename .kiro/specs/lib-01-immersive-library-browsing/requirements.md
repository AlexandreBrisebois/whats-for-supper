# LIB-01 — Immersive library browsing: requirements

## Status

**Implemented capability baseline.** Canonical owner of the `/recipes` browse/search surface.

## Current behavior

- **LIB-01-AC1.** `/recipes` performs an initial `POST /api/recipes/search` and renders ranked/browse results, optional Top Pick, filters, detail-sheet opening, and continuation loading. URL `open`, `similarTo`, `addToDay`, and `weekOffset` carry detail, similarity, and planning context.
- **LIB-01-AC2.** Query input is debounced; filters/preferences and similar-recipe input are sent through the search request. Request generations and promotion versions reject stale initial/search responses; continuation has separate loading/error/expired states.
- **LIB-01-AC3.** A recipe opens `RecipeDetailSheet`; the page records scroll position and retains query/filter/assignment context while the sheet is open.
- **LIB-01-AC4.** Search failures are converted to an empty response, not a user-visible error. The page differentiates initial loading and continuation failure, but an initial outage is visually indistinguishable from no results.

## Boundaries and limitations

Search ranking, eligibility, continuation, and promotion are server-owned by recipe search; LIB-02 owns details, LIB-03 actions, and HOME-03 planner recovery. The browser does not use `libraryStore` for browse records. Browser-local day naming uses local time. Contract: `POST /api/recipes/search` and filter metadata route in `specs/openapi.yaml`.
