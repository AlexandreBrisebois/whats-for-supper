# Proposal

## Why

Accepted requirements display week/day states but do not define their mutations. Extract current open/reopen, close/lock and supported day validation consequences while preserving discovery and cooking ownership.

## What Changes

- Add protected open/lock operations and Planner's separate suggestion-promotion/lock sequence.
- Add supported recipe-aware Cooked and legacy status-only Skipped compatibility, with failure boundaries.
- Record BSL-meal-planning-031–033 and withhold disputed status vocabulary and unsafe state-regression claims.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: Add week/day transitions alongside accepted read-state requirements.

## Impact

Documentation only under MP-G01. Trace planner/weekStore and Today API consumers through generated SDK/OpenAPI/controller/service/calendar and weekly-plan persistence. Discovery owns vote meanings/thresholds, cooking owns history and Tonight owns its UI. No code, API contract, clients, tests, data or configuration changes; no runtime checks, promotion or archive. Unsupported universal state-machine/atomic-close guarantees remain non-normative.
