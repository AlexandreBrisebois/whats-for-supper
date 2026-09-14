# Dreaming Completion and Next-Week Defer Requirements

> **Archived — historical reference only.** This requirements record is not an active work queue or current authority. See [archive guidance](../../../docs/archive/specs/README.md).

> **Retired 2026-09-14 at owner request.** This planned package was archived without implementation or revalidation; its proposed requirements are preserved as historical evidence.

Status: Draft for review  
Scope: Dreaming completion and existing-meal next-week defer only  
Non-authorizing: This specification does not authorize implementation, commit, deployment, or generated-client edits until approved.

## 1. Objective

Ensure past, uncompleted recipe meals become cooked during Dreaming, and ensure an existing scheduled meal can be moved to the first genuinely free date in next week or later without silently reporting a successful no-op.

## 2. Scope and non-goals

### In scope

- Dreaming completion of past `Planned` and `Locked` recipe calendar events.
- A server-owned `POST /api/schedule/defer` operation for the existing **Move to next week** recovery action.
- Rotation, groceries, and realtime schedule effects of those two operations.
- Contract, service, workflow, and focused PWA test coverage.

### Out of scope

- The recipe-card **Plan for Later** flow. Its current client-side future-slot search and `/api/schedule/assign` call remain unchanged.
- `/api/schedule/move` semantics for tomorrow recovery, drag/reorder, swap, and same-week movement.
- Navigation to the resolved destination week. The user stays in the current context and receives a toast.
- New Dreaming prompts, notifications, Home UI, persistence fields, schema migrations, or migrations checks.

## 3. Definitions

- **Free date**: a date with no `calendar_events` row. A row without a recipe is not free.
- **Ordered In**: the UI label for persisted `CalendarEventStatus.Skipped`.
- **Household date**: the UTC date when the server operation runs. Dreaming at 06:00 UTC is after midnight in Toronto across EST and EDT.
- **Next week start**: the first Monday strictly after the household date. Sunday is not a next-week start.

## 4. Functional requirements

### R1 — Dreaming completes only overdue recipe meals

At each Dreaming run, the system must change an event to `Cooked` only when all of the following are true:

- its date is earlier than the household date;
- it has a recipe ID; and
- its status is `Planned` or `Locked`.

It must leave unchanged events that are already `Cooked`, `Skipped`, `AwaitingConsensus`, recipe-less, dated today, or dated in the future.

### R2 — Cooked provenance and rotation remain calendar-derived

Dreaming-created and person-marked cooked events must have no distinguishable provenance.

Whenever Dreaming changes cooked state, or defer moves a cooked event, `Recipe.LastCookedDate` must be recalculated from the latest remaining `Cooked` calendar event for that recipe. It must become `null` when none remain. The persisted value represents the selected calendar date using the existing `DateTimeOffset?` field.

### R3 — Dreaming is idempotent and quiet

Re-running Dreaming after a successful completion run must not make additional data changes, create prompts, emit user notifications, or add Home UI. It may publish normal planner `week_updated` events for weeks whose statuses changed so an open planner refreshes.

### R4 — Defer has one server-owned next-week policy

The API must expose `POST /api/schedule/defer`, accepting exactly `sourceDate` (ISO date) and `recipeId` (UUID). There is no `mode` field and no plan-later option.

Defer must select the first free date on or after next week start, scanning later weeks until it finds one, create that date's Monday-based `WeeklyPlan` if required, and commit the source change and destination together. The response must return the actual `scheduledDate`, `scheduledWeekOffset`, and a user-ready `message`.

### R5 — Defer preserves source semantics

Defer identifies its source by exact `sourceDate` and `recipeId`; it must not fall back to another event with the same recipe.

- `Planned`, `Locked`, and `Cooked` sources move as the same row to the destination, become `Planned`, and retain `VoteCount`.
- A `Skipped` source remains a skipped historical row with its recipe association cleared and its existing `VoteCount` retained; defer creates a new planned destination row with the original recipe and the same vote count.
- `AwaitingConsensus` cannot be deferred and returns `409 Conflict` without mutation.
- A missing/mismatched exact source returns `404 Not Found` without mutation.
- Defer never swaps, displaces, or push-shifts another meal.

### R6 — Defer has complete schedule side effects

After a successful defer, the system must recompute source and destination weekly groceries (once if they are the same week) and publish a `week_updated` schedule for both changed weeks (once if they are the same week). The response message must identify the final committed destination; when allocation spills beyond the immediately following week, it begins with `Next week is full.`

### R7 — Dreaming workflow runs before reporting

The Dreaming workflow must execute `FinalizeOverdueMeals` before `GenerateDreamingReport`; `reschedule` remains dependent on `report`. Processor failures must retain normal workflow retry behavior. The default schedule is `${DREAMING_CRON_UTC:-0 6 * * *}`, while deployment configuration may override it.

### R8 — Only next-week PWA callers migrate

Planner and Home **Move to next week** recovery flows must call the generated defer client with the exact source date and recipe ID, refresh their current state, and display the returned message through the existing toast store.

They must no longer calculate a client-side next-week destination or send `targetWeekOffset`, `toIndex`, or `intent: 'push'` for this action. The recipe-card Plan for Later path and all other move callers remain unchanged.

## 5. Observable acceptance

| ID | Observable result |
|---|---|
| AC1 | A past planned or locked recipe event becomes cooked after Dreaming; each excluded status/date/recipe-less case remains unchanged. |
| AC2 | Re-running Dreaming produces no further database changes or user-facing Dreaming effect. |
| AC3 | A cooked defer becomes planned at the destination and leaves `LastCookedDate` equal to the latest remaining cooked calendar date, or null. |
| AC4 | A locked defer is planned at the destination and retains its vote count. |
| AC5 | A full next week spills into the first later free calendar-row-free date and returns that actual date/offset/message. |
| AC6 | Successful defer updates groceries and publishes schedules for source and destination weeks. |
| AC7 | Planner and Home show the returned defer toast without navigating to the destination; recipe-card Plan for Later and ordinary move behavior are unchanged. |
| AC8 | Dreaming completion resolves through the workflow processor, precedes report, and participates in existing retry behavior. |

## 6. Decisions and open questions

Settled decisions:

- The prior plan-later defer mode is removed; recipe-card Plan for Later is not part of this feature.
- Next week begins Monday, not Sunday.
- Defer allocation is server-owned; client-side slot scans are removed only from next-week recovery.
- No database migration is needed.

No unresolved consequential decisions remain for implementation.
