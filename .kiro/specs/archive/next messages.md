# Planner Voting Follow-Ups

## Context

These notes capture UX questions around the "Plan next week" / family voting flow when a parent is manually planning across weeks.

## Open Questions

### Fully planned next week

Scenario:

- Mom is manually editing the current week.
- At the same time, she is using Quick Find to add meals into next week.
- The "Plan next week" action appears.
- Next week may already have all 7 meals planned.

Question:

If she clicks "Plan next week" while next week is already full, should the app:

- open voting for next week anyway,
- skip to week offset `+2`,
- ask whether she wants to open voting for the next unplanned week,
- reset voting for the already-planned week,
- or treat the week as done and avoid opening an empty voting cycle?

Candidate UX:

Show a confirmation dialog:

> I noticed you've planned meals through {date}. Do you want to open voting for the following week?

The dialog should make the target week explicit before any voting state changes.

### Home copy when voting is active

Current issue:

When voting is active for the current week, the Home prompt says "voting is on next week."

Expected direction:

The copy should name the actual voting target week. Avoid relative wording that becomes wrong when the target is this week, next week, or a future offset.

### Vote Now button icon

Current issue:

The Home "Vote Now" button includes an arrow.

Expected direction:

Remove the arrow from the "Vote Now" button.

## Suggested Next Step

Create a bounded planner-voting UX task that defines the target-week selection rule first, then updates Home copy and the button treatment in the same small slice.
