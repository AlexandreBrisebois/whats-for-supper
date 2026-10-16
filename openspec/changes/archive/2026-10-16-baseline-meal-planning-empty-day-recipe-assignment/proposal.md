# Proposal

## Why

The promoted meal-planning baseline describes reading weeks but leaves the existing chosen-recipe assignment journey undocumented. Extracting this bounded journey makes its two entry paths and persistence-versus-feedback limits reviewable without changing application behavior.

## What Changes

- Draft an ADDED meal-planning delta for a chosen recipe assigned to an ordinary empty planner day through Quick Find or Search/library detail with a specific target.
- Record request mapping, protected API entry, date selection, new calendar entry and weekly-plan creation, ordered side effects, response consumption, optimistic display and recovery.
- Preserve the promoted Purpose and 15 requirements/40 scenarios. Reuse shared owners for identity, library facts and live reconciliation.
- Extend the capability plan with source identities, actual assertion/substitution limits, complete mappings and unresolved compatibility/concurrency qualifications. Stop at a validated draft for human review.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: Add missing empty-day chosen-recipe assignment requirements. This is documentation extraction of existing behavior, with no application change or modification of promoted requirements.

## Impact

Only this change's proposal, design, meal-planning delta, extraction tasks and `docs/openspec-baseline/meal-planning.md` are edited, with a small index summary follow-up for the new draft. The promoted count remains 15/40.

Source inspection spans Planner/Quick Find, Search/detail, slot helpers, browser/generated client, POST `/api/schedule/assign`, controller/service, calendar/week models and constraints, directly invoked grocery/publication work, week and Today stores, and connected assertions/mocks. These inputs remain unchanged.

Occupied recovery, replacement/displacement, removal, move/defer, non-cooking conversion, first-open scanning, voting/locking transitions, suggestion policy, grocery policy, cooking, capture, notifications, administration, maintenance, demo and deployment are excluded. The endpoint's ability to overwrite an occupied date, partial persistence, missing semantic validation, duplicate writes and navigation races remain non-normative limitations; no atomic empty-slot precondition, eligibility guarantee, idempotency, exact rollback or convergence is asserted. No unresolved product choice is decided by this draft; disputed claims are withheld.

Runtime/unit/API/browser/network/database/model qualification is not run under the user's documentation-only authorization and A34. Promotion, archival, implementation and successor work require a later instruction.
