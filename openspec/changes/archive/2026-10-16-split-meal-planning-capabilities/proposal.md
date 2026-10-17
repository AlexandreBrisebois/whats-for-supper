# Proposal

## Why

The current meal-planning specification contains 104 requirements in 1,440 lines, spanning week reading, assignment, non-cooking plans, rescheduling, plan lifecycle and deployment-calendar policy. Contributors must load unrelated rules to review a bounded change, and its Purpose still describes only the original week-reading slice.

## Outcome and Scope

Reorganize the existing specification into six cohesive capability owners without changing observable application behavior. Preserve all 104 requirement blocks and their scenarios exactly once, retain evidence qualifications and historical provenance, and make shared ownership navigable.

This change plans documentation reorganization only. Application code, API contracts, clients, tests, SQL, deployment configuration and runtime qualification are outside scope. Existing accepted behavior and known limitations remain unchanged. Archived extraction records remain historical and are not rewritten or resynchronized. Applying this change and archiving it require later workflow steps; this proposal does neither.

## What Changes

- Retain `meal-planning` for week reading/navigation, schedule presentation, suggestion composition and direct suggestion read boundaries.
- Relocate existing requirement blocks into five sibling capability specs, using the explicit mapping in design.md.
- Give the shared date-delete lifecycle one owner in `meal-rescheduling`; non-cooking clearing and recipe removal reference it.
- Update capability purposes, current ownership references and baseline navigation/counts; preserve historical evidence text and source identities.
- Verify exact block/scenario conservation and owner-reference integrity before claiming the reorganization complete.

## Capabilities

### New Capabilities

These are new specification owners for existing behavior, not new runtime features.

- `meal-assignment`: recipe selection, Quick Find, chosen-recipe assignment, occupied-target recovery and first-open placement.
- `non-cooking-plans`: recipe-free supper-plan entry, validation, persistence, editing, clearing UI and Home editing handoff.
- `meal-rescheduling`: dragging, movement, Tomorrow push under the existing rules, deferral, recipe removal and the shared date-delete lifecycle.
- `planning-lifecycle`: voting open/close, locking, day validation, overdue finalization and voting-link presentation.
- `deployment-calendar`: authoritative deployment dates/timezone, captured week references, calendar context, Today expiry and civil-date arithmetic.

### Modified Capabilities

- `meal-planning`: remove relocated requirements from this owner only; preserve their normative content under the new owners. Its retained rules and application behavior do not change. Use REMOVED/ADDED deltas solely to express ownership transfer; no policy is retired.

## Impact

Apply scope comprises the six main capability specs, current references in other main specs, and current ownership/navigation sections in `docs/openspec-baseline-plan.md` and `docs/openspec-baseline/*.md` where they refer to transferred rules. Restrict evidence-document edits to navigation/ownership clarification and conservation records; preserve historical claims, source digests, BSL/U/A identifiers and qualification status.

The current source is `openspec/specs/meal-planning/spec.md`; design.md records its identity and every destination. Existing recipe-discovery, recipe-search, cooking, grocery-shopping, household-live-updates, household-identity, tonight-meal-decisions and member-preferences keep their business ownership. No dependencies or external integrations change.
