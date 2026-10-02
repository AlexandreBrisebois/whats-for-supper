# Recipe Search Indexing — Requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **PLAT-03-R1.** `RecipeSearchService` serves recipe search from persisted recipe/search data and uses `SearchFingerprintService` to detect source changes that require reconciliation.
- **PLAT-03-R2.** Search reconciliation/materialization workflows and processors maintain derived search filters; recipe/search changes can publish invalidation consumed by search-promotion/discovery state.
- **PLAT-03-R3.** Search routes and OpenAPI response DTOs, not browser ranking guesses, define returned filters/results and promotion eligibility.

## Limits and boundaries

Indexing/reconciliation is asynchronous and makes no instant-freshness or exactly-once promise. Search UI, promotion choice, recipe persistence, and workflow scheduling belong to their feature packets/PLAT-02; this packet owns derived search representation and reconciliation boundary.
