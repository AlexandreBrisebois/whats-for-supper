# Proposal

> **Delivery baseline — 2026-11-10:** Independent follow-up, outside the first dependable-portions release as accepted by Alex on 2026-11-10. Preserve the proposal and unchecked tasks. Do not schedule this UI work as a prerequisite for portions, grocery correctness or migration. See the [release scope and agent coordination](../canonical-ingredient-correction/proposal.md#dependable-portions-delivery-baseline--accepted-2026-11-10).

## Why

Expanded Search currently puts the full-width input above Filters, a long Clear search and browse button and a Similar removal chip. The long English/French clear labels force those controls onto multiple lines on phones. Find Similar also expands controls through an effect that focuses the input unnecessarily.

## Outcome and Scope

Keep active Similar visible beside Filters and a shorter Clear action on one compact line below the full-width Search input. This supersedes the earlier proposal to hide Similar inside Filters. Retain the detail Find Similar action, Search semantics, scope, filter draft/Apply behavior and explicit Similar removal. No product implementation is part of this planning revision.

## What Changes

- Use one non-wrapping control row: Filters with applied count, Similar × when active, then Clear when Search is active. Keep Search input above it; the library toolbar/scope controls keep their existing owner and layout.
- Shorten the row action to Clear / Effacer with reduced horizontal padding, retaining its full accessible action name and existing clear-search semantics. Use Similar / Similaires for the compact chip, with an explicit localized remove name.
- Preserve 48×48 CSS px minimum targets and full readable labels. Fit the row at narrow default sizes where possible; use an indicated horizontal scroll region when intrinsic widths exceed available space, including enlarged text. No label ellipsis or page-wide horizontal overflow.
- Count applied Similar once, retain immediate chip removal and existing Clear Filters retention of text/Similar. No new Similar draft or hidden filter-sheet removal flow.
- Avoid automatic text-input focus on Find Similar entry; explicit Search/typing entry still focuses normally.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-search`: compact visible control row, selection count and entry focus.

## Impact

RecipesExperience row/count/focus state, localized labels and tests; Planner Similar route entry and existing focus-return owners. RecipeFiltersSheet keeps its existing draft/Apply and Clear Filters semantics. Existing similarTo request identity and backend retrieval/ranking remain unchanged; no OpenAPI, generated-client, data or migration changes.
