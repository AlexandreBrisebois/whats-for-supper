# Design

> **Release disposition — 2026-11-10:** Independent follow-up outside the first dependable-portions release. Preserve these requirements, but do not schedule them as a portions or migration prerequisite. See the [accepted baseline](../canonical-ingredient-correction/proposal.md).

## Context and Existing Ownership

RecipesExperience owns the full-width Search field, separate Similar identity, immediate chip removal, clearSearch and applied count. Its current inline action flow wraps naturally when full Clear labels consume width. French currently uses Recettes similaires and Effacer la recherche et parcourir. RecipeFiltersSheet owns independent draft filters/preferences and keeps text/Similar on Clear Filters. Find Similar entry currently shares the input-autofocus disclosure effect. Preserve these owners; the user has revised the earlier hide-Similar-in-Filters proposal.

## Decisions and Tradeoffs

Keep the input full-width above one control row, ordered Filters/count → Similar × → Clear. “All controls on the same line” refers to this row, not squeezing the input or the library scope/view/bin toolbar onto it. Similar stays visibly actionable outside Filters and preserves its existing immediate removal. No new Similar draft, picker or duplicate removal inside the sheet is needed. Keep the requested applied Similar count once alongside scope/filter counts; a visible chip never adds another count. Filters' draft/Apply semantics remain unchanged.

Use compact visible labels Clear / Effacer and Similar / Similaires; the localized accessible names retain Clear search and browse / Effacer la recherche et parcourir and Remove Similar / Retirer les recettes similaires (including the visible wording). Reduce horizontal padding and visual weight, not target size. A candidate uses 14 CSS px body text, 700 weight, 10 px inline padding, 8 px gaps and 48 px minimum target dimensions; preserve readable size rather than shrinking type to force fit. Keep the short Clear label distinct from the sheet's Clear Filters action. Row Clear still clears all Search intent and retains library scope; sheet Clear Filters retains text/Similar.

Use intrinsic-width nonshrinking controls in a single horizontal scroll container when necessary. Keep all labels whole with nowrap and no ellipsis. Provide a passive edge/scroll cue when more content exists and a localized accessible description, update the cue at either scroll boundary and when content/width changes, and reveal focused controls with their outline. Allow swipe/trackpad scrolling; do not hide an unreachable trailing button, trap keyboard input or cause body-level horizontal overflow. The overflow fallback preserves the requested single line at 200% text, at the cost of a swipe for trailing actions. Do not add arrow buttons that consume the already scarce row width. Normal phone widths should fit without scrolling where intrinsic labels permit it.

Use entry intent for focus: Find Similar and Similar route entry choose a connected non-input control or results heading; explicit Search reopening retains input focus. Prevent detail return-focus or the disclosure effect from subsequently stealing focus. No global blur or blanket autofocus removal.

## First Observable Slice

Find Similar → existing POST search identity/criteria → visible Similar chip plus applied count → immediate chip removal → existing Search/Explore refresh. Validate the one-row layout and distinct Clear behaviors without altering filter draft semantics, then cover cross-caller focus.

## State, Concurrency and Recovery

Retain request-generation/cursor/debounce guards on immediate Similar removal and row Clear. Retry, invalidation and continuation retain current applied identity/scope/planner context. Draft filter changes make no requests until Apply; dismiss leaves all applied state intact. Overflow scrolling is presentation state, not search intent: it makes no requests, changes no scope and does not focus the text input. Existing typed text continues clearing Similar through its established path.

## User Experience and Layout Evidence

A temporary isolated static fixture rendered the existing locally available Inter variable font in Chromium; it did not render or modify the product. Across 320/360/390 CSS px, English/French, 100%/200% control text and counts 1/12/123 (36 cases), every control had at least 48×48 px bounds, shared one y-coordinate, avoided page overflow, and trailing Clear was fully reachable by scrolling. At 320 px the content width is 288 px. With count 12 and default text, English control widths are approximately 91.6/82.0/58.5 px and French 91.4/101.6/71.2 px, plus 16 px gaps and 4 px focus gutter. Both fit. French count 123 needs slight scrolling at 320; both locales need scrolling at 200% text (approximately 404/468 px scroll extents for count 12). These measurements support the overflow policy rather than a guarantee that every count/font fits without scrolling.

The fixture used compact labels and 14 px text, 12 px badge text, 10 px inline padding and 8 px gaps. Browser/font fallback, OS text scaling and actual component focus/scroll cues still require implementation acceptance. Initial sandbox Chromium launch was blocked by macOS Mach bootstrap permissions; the isolated local fixture ran successfully with approved escalation. Fixture measurements are not production tests, mobile-keyboard evidence or product acceptance.

## Risks and Deferrable Questions

A scroll row requires a discoverable cue and focus reveal; these are mandatory implementation acceptance. French full existing labels cannot reliably fit 320 px, so add dedicated compact localized labels rather than changing unrelated labels globally. Actual translated copy and font fallback need visual review. Clear is visually quieter but keeps a 48 px target and its complete accessible name. No consequential Search semantics remain unresolved in this revision.
