# SEARCH-03 — Faceted filters: requirements
> Status: **Implemented capability baseline**.

## Outcome and boundary
The Filters sheet collects a draft then applies it to Search. SEARCH-01 owns ranking; import reporting owns review-status meaning.
### SEARCH-03-AC1
Opening Filters lazily requests `GET /api/recipes/search/filters` once per page mount. Metadata provides configured Main, fixed meal types and materialized cuisines; absent/failed metadata uses built-in Main and meal-type fallbacks.
### SEARCH-03-AC2
The sheet owns a draft separate from page applied state. Close discards it; Clear/Apply starts Search with selected filters/preferences. Shortcuts, meal/cuisine arrays, Main concepts and server-enforced vegetarian remain distinct.
### SEARCH-03-AC3
The service filters ready, non-deleted recipes. `excludedIngredients` is unsupported (400). Vocabulary reads materialized cuisine state only, never request-time catalog/vote/calendar aggregation.
### SEARCH-03-AC4
The modal supports Escape/backdrop close, labelled dialog/chips and `aria-pressed`; several disclosure/cuisine strings are literal English fallbacks.

## Limitations
- Metadata failure is silent progressive enhancement.
- Metadata does not refresh until page remount.
- Review filter semantics belong to import reporting.
