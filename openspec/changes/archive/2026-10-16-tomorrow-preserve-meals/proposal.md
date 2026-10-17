# Proposal

## Why

Tomorrow can lose an occupied Monday meal when Sunday recovery encounters a full following week. Current source also bounds same-week pushes to fourteen days and treats some unsuccessful moves as success; runtime reproduction of this backlog defect has not yet been run.

## Outcome and Scope

Resolve WFS-BL-001: Tomorrow moves the selected supper to the next calendar day, shifting the contiguous occupied chain one day forward through as many weeks as needed, stopping at the first empty supper slot. Preserve every recipe occurrence and non-cooking entry. The approved collision policy moves future Planned, Locked and Skipped entries with their details; encountering a Cooked entry rejects the whole push without mutation. Existing deployment calendar ownership is reused.

Home Order In plus Tomorrow must also leave Tonight unchanged when the push is rejected, so its source disposition belongs in that same operation. Replacement assignment remains a separate request: WFS-BL-002's general acknowledgement/retry redesign is excluded. Save for Next Week, Plan later, ordinary swaps, non-Tomorrow pushes, history retention, other meal slots, ranking and general clock cleanup remain unchanged. No main-spec sync, archive, commit or deployment is included.

## What Changes

- Add an explicit Tomorrow movement intent, with exact source validation, unbounded-by-week forward spill and a success response only after a real committed move.
- Preserve moved content, including recipe identity, status, votes, candidate IDs, meal slot and non-cooking details; reject cooked, ambiguous or stale sources without silently choosing another entry.
- Include optional Order In source disposition in the same atomic calendar mutation, preserving legacy recipe-backed Skipped-source behavior.
- Recompute groceries and publish authoritative snapshots for every affected week, not just the source and immediate destination.
- All Tomorrow recovery callers stop before replacement on rejection and retain visible recovery context. Unknown transport outcomes require an authoritative reread before another attempt.
- Add real PostgreSQL conservation, rollback and concurrency acceptance plus browser recovery and two-client update evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: Tomorrow chain movement, rejection, affected-week follow-ups and shared occupied-slot recovery.
- `tonight-meal-decisions`: Home Tomorrow request and atomic Order In source disposition; rejection preserves recovery context.

## Impact

Primary owners: `ScheduleService`, `ScheduleController`, movement DTO, `specs/openapi.yaml`, generated Kiota client, `pwa/src/lib/planner/slotAssignment.ts`, Home recovery and its consumers in Planner, Search and Browse. Grocery recomputation and household live publication use their existing services and wire shapes. PostgreSQL's existing unique `(date, meal_slot)` constraint must remain enforced. Source references: [backlog item](../../../../docs/openspec-baseline/backlog/WFS-BL-001.md), [accepted decisions](../../../../docs/openspec-baseline/backlog/decisions.md), [calendar prerequisite](../2026-10-16-deployment-calendar-supper-dates/tasks.md). The collision policy was accepted in this conversation on 2026-10-16.
