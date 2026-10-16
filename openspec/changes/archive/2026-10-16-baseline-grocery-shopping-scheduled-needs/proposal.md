# Proposal

## Why

The existing grocery derivation path has no main grocery-shopping baseline. Record its source-supported ordinary-household behavior for human review, without implementation or runtime qualification.

## What Changes

- Extract scheduled recipe supply and ingredient-text fallback into an ADDED grocery-shopping delta.
- Record evidence BSL-grocery-shopping-001 and shared-owner dependencies in the capability plan.
- Withhold malformed-shape guarantees, inferred recipe eligibility and cross-resource atomicity.

## Capabilities

### New Capabilities

- `grocery-shopping`: deriving persisted shopping needs from scheduled recipes (first of seven complementary draft deltas).

### Modified Capabilities

None.

## Impact

Documentation only: this change directory and docs/openspec-baseline/grocery-shopping.md. Source boundaries inspected: Planner, schedule GET/assignment, GroceryRecomputeService, WeeklyPlan and recipe synchronization. No application, contract, client, SQL, test or configuration changes. Shared identity, meal-planning, recipe-library and household-live-updates requirements remain with their owners. Human acceptance, promotion and archival remain separate and unauthorized.
