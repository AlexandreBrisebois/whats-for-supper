# Bugfix Requirements Document

## Introduction

When a user checks off an item in the Grocery List UI, the PWA fires a `PATCH /api/schedule/{weekOffset}/grocery` request to persist the updated check state. This request returns **404 Not Found** whenever no `WeeklyPlan` row exists in the database for the target week.

The root cause is in `ScheduleService.UpdateGroceryStateAsync`: it looks up the `WeeklyPlan` by the week's Monday date and throws a `KeyNotFoundException` if the row is absent. The global `ErrorHandlingMiddleware` maps `KeyNotFoundException` → HTTP 404. As a result, any user who opens the grocery list for a week that has not yet had a plan created (e.g. a week with no scheduled recipes, or a freshly initialised database) cannot persist grocery check-offs at all.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user checks off a grocery item for a week that has no existing `WeeklyPlan` row in the database THEN the system returns a 404 Not Found error for the `PATCH /api/schedule/{weekOffset}/grocery` request

1.2 WHEN the 404 is returned THEN the system reverts the optimistic UI toggle and shows a per-item error indicator, leaving the grocery state unpersisted

### Expected Behavior (Correct)

2.1 WHEN a user checks off a grocery item for a week that has no existing `WeeklyPlan` row THEN the system SHALL create a new `WeeklyPlan` row for that week and persist the grocery state, returning 200 OK with the updated state

2.2 WHEN the `PATCH /api/schedule/{weekOffset}/grocery` request succeeds THEN the system SHALL return the persisted grocery state so the UI can confirm the toggle

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user checks off a grocery item for a week that already has an existing `WeeklyPlan` row THEN the system SHALL CONTINUE TO update the grocery state on that row and return 200 OK

3.2 WHEN the grocery state is persisted successfully THEN the system SHALL CONTINUE TO broadcast a `grocery_updated` SSE event to all connected clients for that week

3.3 WHEN a non-existent resource is requested via other endpoints that legitimately return 404 (e.g. unknown recipe, unknown family member) THEN the system SHALL CONTINUE TO return 404 for those cases
