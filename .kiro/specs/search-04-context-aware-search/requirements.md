# SEARCH-04 — Context-aware search: requirements
> Status: **Implemented capability baseline**.

## Outcome and boundary
Search accepts planner URL context and similar-recipe IDs. Planner specifications own scheduling semantics; this packet documents its Search handoff.
### SEARCH-04-AC1
`addToDay`/`weekOffset` are forwarded to Search. Selecting a recipe first reads the target slot; an occupied slot opens `SkipRecoveryDialog`, which resolves the existing recipe before assignment and navigation.
### SEARCH-04-AC2
With both week and day, ranked search demotes already planned recipes without excluding them. Browse receives week context for ordering.
### SEARCH-04-AC3
The detail sheet starts similar search with empty query and `similarToRecipeId`; service returns `searchMode`/`resultPath` `similar`. Initial URL can provide `similarTo`.
### SEARCH-04-AC4
Search generation guards reject stale search/continuation responses. Assignment awaits slot lookup and recovery/assignment before navigation.

## Limitations
- URL integers use `parseInt` without finite/range validation.
- Find Similar does not persist `similarTo` to URL or show visible focus context.
- Assignment reconciliation is the planner client/API/SSE boundary; this page has no assignment generation guard.
