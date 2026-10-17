# WFS-BL-035 — Inject remaining application clocks

| Field | Value |
| --- | --- |
| Priority | P1; reassess after bounded inventory |
| Finding type | Remaining accepted-policy implementation gap |
| Workflow status | Open; not selected for implementation |
| Origin | Clock-injection remainder of WFS-BL-005; user decision 2026-10-16 |

## Remaining work

Inventory application wall-clock reads outside the completed supper-calendar change. Replace direct reads and optional fallback clocks in selected application logic with injected time, keeping internal timestamps UTC. Real-time adapters belong at composition; parsing an explicit date is not a clock read.

Confirmed remaining examples are `DateTimeOffset.UtcNow` in `WorkflowController` (ScheduledAt), `HealthController` (timestamp and next occurrence) and `ManagementController` (cron validation). This is a bounded source finding, not an exhaustive inventory or reproduced production defect.

## Completed prerequisite

Deployment-calendar supper dates are complete and removed from the active queue. The [archived task record](../../../openspec/changes/archive/2026-10-16-deployment-calendar-supper-dates/tasks.md) retains implementation and acceptance evidence. UTC default, deployment timezone configuration, supper-date consumers and calendar/live-browser acceptance are not outstanding work here.

## Acceptance and boundary

Select one observable clock consumer at a time, preserve its response and UTC semantics, and add focused fixed-instant red/green coverage before implementation. Record the inventory boundary and any remaining direct reads. Reuse the existing clock seam; do not reopen calendar contracts or bundle adjacent refactoring.

Verification for this remainder: source inspection only; runtime checks not run. This item does not authorize application implementation.
