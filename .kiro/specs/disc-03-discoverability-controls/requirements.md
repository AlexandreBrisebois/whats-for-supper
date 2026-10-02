# DISC-03 — Discoverability controls requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **DISC-03-R1.** Recipe detail exposes a discoverability control and persists it through the existing recipe update path.
- **DISC-03-R2.** `RecipeService`/search predicates use persisted recipe discoverability as an eligibility input for discovery/search projections; client visibility is not a substitute for server filtering.
- **DISC-03-R3.** The detail surface gives local success/failure feedback for its action; dependent queues/search may refresh through their own fetch/invalidation paths.

## Limits and boundaries

Discoverability is not deletion, privacy isolation, or an immediate all-device queue invalidation guarantee. LIB-03 owns detail action affordances, PLAT-03 owns search projection/reconciliation, DISC-01 owns queue rendering, and PLAT-01 owns any stream transport.
