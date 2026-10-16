# Design

## Context

See proposal.md — Why. Movement spans local Framer reorder, generated HTTP requests and mutable dated calendar records. Cross-cutting representation and concurrency differences require an extraction design.

## Goals / Non-Goals

**Goals:** Draft observable ordinary movement and API compatibility, with BSL-meal-planning-025–027 mappings.

**Non-Goals:** No gesture redesign, backend repair, owner-policy duplication, preview qualification or runtime tests.

## Decisions

- First slice: planner recipe handle → drag refs/local swap → commitMove → lib/api/planner moveRecipe (sequence increment) → generated move builder/OpenAPI DTO → ScheduleController header parsing → service explicit source/fallback → SwapInternalAsync/save → snapshot attempt → HTTP completion/local catch. Keep local dates fixed while content moves.
- Separate push and cross-week branches. Same-week push scans index <14; cross-week scans index <7 and ignores swap intent for placement. Source IDs are checked only after optional global recipe fallback; it is not an exact-date/version precondition. Describe this compatibility rather than inventing strict source validation.
- Reuse accepted calendar read/auth and household-live-updates “Consume move echoes as confirmation before offset filtering”. Request counters and echoed sequences do not prove persisted ordering; same-week direct no-source/mismatch returns skip publication, whereas cross-week wrapper still publishes source snapshot after a no-op.
- Same-week changes do not recompute groceries, even when the index-window push crosses a week. Cross-week saves precede two recomputations, then only source snapshot. Preserve missing side effects as limitations, not a complete two-week reconciliation promise.
- Ordinary handle starts immediately with preview disabled. The inspected hold-to-move opt-in is a separately excluded preview variant. The div has label/title but no keyboard move implementation; do not invent an accessible drag alternative. Plan later/remove are separate button actions, not arbitrary keyboard swap.

## Risks / Trade-offs

- [Unique (date,meal_slot), first-by-date queries, shifting save order] → MP-U04 withholds relational swap/push collision and race guarantees.
- [Partial persistence/follow-ups and no-op 200] → Treat HTTP message as completion only; MP-U05.
- [Local rollback replaces captured schedule after later writes/navigation] → No isolation or safe rollback; preserve U95–U122.
- [Mixed UTC server week/local Today; English strings and no keyboard movement] → Record boundaries, no timezone/locale/accessibility equivalence.

## Migration Plan

Documentation draft only. No deployment or schema changes. Validate selected artifacts before the authorized defer/removal successor; acceptance/promotion pending.
