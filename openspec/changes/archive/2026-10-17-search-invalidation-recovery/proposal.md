# Proposal

## Why

WFS-BL-006 identifies hidden stale Search cards without automatic recovery in typed and Similar modes. Source shows the refresh effect only accepts browse data, including when a pending first response is invalidated.

## Outcome and Scope

Mounted browse, typed and Similar searches recover after a received freshness signal without retyping. Preserve current filters, preferences and planner context, with a visible retry when replacement fails. Keep server eligibility/ranking, transport delivery and continuation contracts unchanged.

## What Changes

- Refresh every mounted search mode once per observed invalidation generation, including pending initial searches.
- Show failure and retry for current initial/replacement requests; never present a failed fetch as successful empty results.
- Ignore superseded completions and prevent refresh loops from response or input changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-search`: broaden invalidation recovery to typed and Similar modes and define current-request error/retry presentation.

## Impact

The Recipes page and its tests; browser SSE event fixture through existing household-live-updates hook. No API, DTO, generated client, search ranking or database change.
