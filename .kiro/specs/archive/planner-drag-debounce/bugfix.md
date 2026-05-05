# Bugfix Requirements Document

## Introduction

When a user drags a meal card to reorder it in the planner, the app fires a `POST /api/schedule/move` API call for every intermediate position the card passes through during the drag gesture. On a 7-day planner, dragging from slot 1 to slot 7 can trigger up to 6 API calls before the user releases. This causes excessive backend traffic, potential race conditions between in-flight requests, and visible UI jank as the optimistic state is repeatedly overwritten mid-drag.

The fix must ensure the move API call fires exactly once — when the user releases the dragged card (on drop) — while keeping the visual reordering smooth and immediate throughout the drag.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user drags a planner card and it passes through an intermediate position THEN the system fires a `POST /api/schedule/move` API call for that intermediate position

1.2 WHEN the user drags a planner card across multiple positions before releasing THEN the system fires multiple `POST /api/schedule/move` API calls (one per intermediate position crossed)

1.3 WHEN multiple in-flight move requests are outstanding simultaneously THEN the system may apply them out of order, leaving the backend schedule in an inconsistent state

### Expected Behavior (Correct)

2.1 WHEN the user drags a planner card and it passes through an intermediate position THEN the system SHALL update the visual order immediately without firing any API call

2.2 WHEN the user releases a dragged planner card (drop event) THEN the system SHALL fire exactly one `POST /api/schedule/move` API call reflecting the final from/to positions

2.3 WHEN the user releases a dragged planner card in its original position (no net movement) THEN the system SHALL NOT fire any `POST /api/schedule/move` API call

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user drags a card and releases it at a new position THEN the system SHALL CONTINUE TO update the local schedule order optimistically and immediately (no visual lag)

3.2 WHEN the move API call fails after drop THEN the system SHALL CONTINUE TO revert the local schedule to its pre-drag order

3.3 WHEN the user assigns, removes, or validates a recipe THEN the system SHALL CONTINUE TO fire those API calls immediately without any drag-related debounce

3.4 WHEN the user drags a card on a locked or past-week planner THEN the system SHALL CONTINUE TO prevent reordering (existing guard behaviour unchanged)
