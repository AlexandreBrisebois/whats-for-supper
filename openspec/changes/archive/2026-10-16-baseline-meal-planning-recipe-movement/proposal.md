# Proposal

## Why

Movement is outside the promoted read/assignment/non-cooking baseline. Document existing swap, push and cross-week movement, including request completion that does not confirm relocation.

## What Changes

- Add source-supported drag/drop, same-week swap/push, cross-week first-open and legacy source lookup requirements.
- Record BSL-meal-planning-025–027 and qualified concurrency/follow-up differences.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: Add movement requirements without changing accepted reading, assignment or non-cooking requirements.

## Impact

Documentation only under MP-G01. Inspect planner drag and Plan later → weekStore/planner wrapper/generated move SDK → OpenAPI/controller/service → calendar persistence/publication. Grocery internals, live transport and recipe eligibility remain owned elsewhere. No application edits, services, runtime checks, promotion or archive. Unsupported push/index/relational safety remains non-normative in the checkpoint.
