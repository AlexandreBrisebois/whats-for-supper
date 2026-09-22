# SFD-2 proposed contract and Search rediscovery policy

> **Archived — historical reference only.** Tasks, status, commands, and instructions below are historical, not an active work queue or current authority. See [archive guidance](../README.md).

Status: approved by user on 2026-09-19. This approval permits dependent work
only when separately selected; it does not authorize SFD-3/SFD-4/SFD-5b, client
generation, PWA work, or generated client/mock changes in this task.

## Public contract

`GET /api/recipes/search/filters` returns:

```json
{
  "generatedAt": null,
  "main": [
    { "id": "beef", "concept": "beef", "label": null },
    { "id": "poultry", "concept": "poultry", "label": null },
    { "id": "pork", "concept": "pork", "label": null },
    { "id": "fish", "concept": "fish", "label": null },
    { "id": "pasta", "concept": "pasta", "label": null },
    { "id": "vegetarian", "concept": "vegetarian", "label": null }
  ],
  "mealTypes": ["Supper", "Lunch", "Breakfast", "Dessert"],
  "cuisines": { "promoted": [], "all": [] }
}
```

`generatedAt` describes only the cuisine materialization and is nullable. The
absence fallback has `generatedAt: null` and both cuisine arrays empty. Built-in
Main IDs always return `label: null`; the PWA translates them. A custom Main ID
must have a non-blank configured `label`, which is returned unchanged. Main
remains exactly in configured order. No Main score, promotion field, affinity,
recipe data, or personalization is exposed. Meal Types are the closed fixed
list above. The endpoint reads no history or recipe catalog at request time.

The existing `preferences.concepts` request field remains the sole Main-selection
seam. Empty `query` with at least one non-blank concept is a ranked search. It
attempts semantic retrieval; if semantic retrieval is disabled, unavailable,
times out, or fails, lexical fallback uses the non-blank selected concepts. A
successful semantic zero-match remains empty. Empty `query` with no usable
concept remains browse. No request fields change.

## Server configuration

`RecipeSearchFilters:Main` replaces the complete default list when valid. Each
entry has `Id`, `Concept`, and optional `Label`. Empty IDs/concepts, duplicate
IDs (case-insensitive), or a custom ID without a non-blank Label invalidate the
whole override and safely restore the six defaults. Built-in IDs ignore a
configured Label so PWA translations remain authoritative.

`RecipeSearchFilters:RediscoveryIntervalDays` accepts 7 through 365; invalid or
absent values use the proposed 28-day default.

## Search-only rediscovery policy

This policy applies only to Search empty-query browse and its Top Pick/Surprise
Me candidate selection. It does not change Discovery eligibility, ordering,
votes, contracts, cards, or client state.

1. Dreaming materializes one bounded record per recipe: `recipeId`, signed
   affinity derived from current likes/dislikes plus historical cooked events,
   and `lastCookedAt` (null when never cooked). It does not expose this record
   from filter discovery or infer a Main association.
2. At serving, Search reads that bounded record and current calendar guards.
   A recipe is promotion-ineligible if it is assigned as `RecipeId` on today or
   any future date with Planned, Locked, or AwaitingConsensus status, or has a
   Cooked event in the selected planning week (otherwise the current calendar
   week). Skipped/removed events do not block. These are promotion guards only:
   blocked recipes remain in browse/library/explicit search.
3. Among unblocked recipes, `affinity > 0` and `lastCookedAt <= now - interval`
   is the rediscovery tier. Sort that tier by affinity descending, then oldest
   `lastCookedAt`, then recipe ID ascending. A never-cooked recipe is never in
   this tier solely because it is old; it stays in the normal availability tier.
   `affinity <= 0` never qualifies. This prevents age from elevating disliked
   recipes and prevents favorites from monopolizing new choices.
4. The normal tier retains the existing deterministic Search browse order. It
   contains unvoted, never-cooked, recently cooked, non-positive-affinity, and
   calendar-blocked recipes. The stable recipe-ID ascending tie-break applies
   whenever prior sort keys tie.
5. Top Pick and Surprise Me select only from the currently promotion-eligible
   rediscovery tier; if it is empty, they do not substitute a blocked recipe.

Minimum client state for Search promotion eligibility: the current Search browse
generation, selected planning-week context (or explicit current-week default),
the opaque continuation token/snapshot version returned by the server, and the
existing schedule/SSE version used to invalidate/restart that Search generation.
The client holds no affinity, recency, recipe-eligibility cache, or calendar
history; the server rechecks guards for every page/candidate selection. Discovery
must not subscribe to or consume this state.

## Tradeoff requiring approval

The 28-day default gives a familiar monthly rediscovery cadence while a 7-day
minimum protects against rapid repeats. A longer default (42 days) would increase
variety but makes favorite resurfacing noticeably less responsive for weekly
planning. Recommendation: approve 28 days and revisit only with measured Search
usage, rather than adding public score controls now.
