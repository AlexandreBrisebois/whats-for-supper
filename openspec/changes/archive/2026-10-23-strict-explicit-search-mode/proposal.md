# Proposal

## Why

Explicit recipe searches currently pass through household rating, vote, historical-interest, planner-demotion and report-free Top Pick logic that can move a weaker retrieval match ahead of a stronger one. Filter-only requests also share the personalized Browse path, so object shape rather than effective user intent can determine ranking behavior.

## Outcome and Scope

Make search mode an explicit server-owned decision: unconstrained requests retain Discovery ranking, while text, normalized Focus concepts or effective filters preserve retrieval or deterministic filter order without Discovery personalization. Find Similar remains independent and preserves its similarity order. This increment also adds a privacy-safe, no-provider-cost relevance evaluation harness and frozen metric definitions; it does not adopt a new embedding representation or runtime relevance qualifier without measured evidence, and it does not authorize paid provider calls, production reindexing, migration, deployment or rollout.

## What Changes

- Classify requests after normalization as Discovery, Explicit or Find Similar from one field-aware policy, treating empty/default filter DTOs as unconstrained and giving `SimilarToRecipeId` precedence.
- **BREAKING** Replace the response `searchMode: standard` value with `discovery` or `explicit` so response metadata reports the selected policy; retain `similar` for Find Similar.
- Keep existing Discovery personalization, while removing family boosts, historical tie-breaking and planner preference demotion from Explicit and Find Similar ordering.
- Give filter-only Explicit requests a stable, meaningful order based on an explicitly requested filter order or creation time and normalized recipe name; snapshot that order for continuation.
- Make Explicit and Find Similar Top Pick a presentation of rank 1 only; an ineligible rank-1 candidate remains first in ordinary results instead of promoting a lower-ranked candidate.
- Add contract-first regressions for mode boundaries, ranking invariants, planner constraints, Top Pick behavior and continuation stability.
- Add a versioned, privacy-safe evaluation fixture and deterministic scorer for development/held-out judgments and candidate-recall, precision, nDCG, irrelevant-result, no-match and hard-negative metrics without making live provider calls.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-search`: distinguish Discovery, Explicit and Find Similar behavior; preserve strict ordering for constrained requests; define filter-only, Top Pick, planner and continuation invariants; and define reproducible relevance-evaluation evidence.

## Impact

`RecipeSearchService`, search request/filter normalization, continuation state, search telemetry and focused API/integration tests are affected. The POST search response shape is unchanged, but its `searchMode` enum changes from `standard | similar` to `discovery | explicit | similar`; OpenAPI, the generated client and browser mocks must move together. Evaluation artifacts live in test-owned privacy-safe fixtures and do not invoke Gemini by default. Search indexing, embedding generation, stored vector schema, production data and deployment remain unchanged.
