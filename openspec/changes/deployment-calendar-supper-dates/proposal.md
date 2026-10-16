# Proposal

## Why

Home, Planner and the API can disagree about today's date and current week. At `2026-10-12T01:30:00Z`, a Toronto deployment is still on Sunday October 11, while UTC and a Tokyo browser are on Monday; current Tonight assignment can target October 18 instead. This is source-confirmed risk, with live reproduction still required.

## Outcome and Scope

Select [WFS-BL-005](../../../docs/openspec-baseline/backlog/WFS-BL-005.md) as the highest-impact prerequisite: it affects core meal actions and unblocks WFS-BL-001. This change is its bounded supper-calendar increment. Home, Planner, Search/Browse planning handoffs, cooking completion, overdue processing and received schedule events must agree on deployment dates, with deterministic injected time.

The user selected UTC when no timezone is configured, with an explicit deployment override. The deployment owns the timezone; browser preferences and host OS timezone do not select meal dates. Internal timestamps remain UTC. Existing stored civil dates and cooking-history anchors are not migrated.

This increment does not close every clock concern in WFS-BL-005: unrelated workflow/health/management clocks and other UX-date consumers need separately bounded follow-up. Tomorrow collision/push behavior (001), replacement acknowledgement (002), additional cross-week grocery/publication behavior (012), generic request ordering and recovery/export work are excluded. Existing unsafe Tomorrow behavior remains visible until its corrective change lands.

## What Changes

- Share one deployment calendar across schedule reads, relative mutations, suggestions and overdue selection. Invalid explicit timezone configuration prevents startup rather than silently selecting another zone.
- Expose `Calendar__TimeZone=UTC` in the Synology deployment environment template and pass the value to the API through its Compose template. Update the Synology operator guide, repository environment example and user guide with setup, override, upgrade and verification instructions in the same implementation increment.
- Return authoritative date/week context with schedule reads; use it in SSR and browser consumers instead of independent browser-local Today calculations.
- Pin the calendar reference for a started action, including its relative reads, mutations and follow-ups, so midnight cannot silently retarget it. Newly initiated Today actions refresh expired context; unavailable context prevents a guessed-date write.
- Preserve literal stored dates, UTC operation timestamps, existing placement/collision policies, grocery aggregation and live-delivery limits.
- Add regression, real PostgreSQL/API, browser and two-client acceptance for Sunday/midnight and DST boundaries, with exact recipe IDs and dates.
- Reconcile affected existing tests, clock fixtures, schedule builders and mocks in each behavior slice so obsolete UTC/browser-local date expectations are replaced while existing state, persistence and recovery coverage remains current.

## Capabilities

### New Capabilities

None. Meal-planning owns the shared calendar boundary.

### Modified Capabilities

- `meal-planning`: deployment calendar, schedule context, stable action targeting, overdue cutoff and planning handoffs.
- `tonight-meal-decisions`: SSR/client agreement, Today actions and recovery dates.
- `cooking`: completion date follows the shared deployment calendar.
- `household-live-updates`: date-aware snapshot/slot reconciliation across deployment day/week rollover.

## Impact

Affected API owners: `IClock`, `ScheduleService`, the calendar-sensitive portion of `DiscoveryService`, schedule DTOs/controller, stream payloads and DI/configuration. Contract changes belong to `specs/openapi.yaml`, then generated Kiota types and method-sensitive E2E handlers/builders.

Required deployment/documentation deliverables: `release-template/synology/.env.example`, `release-template/synology/compose.yaml`, `release-template/synology/README.md`, `docker/.env.example`, supported API Compose entry paths and `docs/user-guide.md`. The new setting must reach the API from the shipped templates; a code-only setting is insufficient. Existing installation secrets and operator overrides must be preserved.

Affected PWA owners: schedule API wrapper, shared calendar/time composition, SSR Home, Today initializer/store, week store, Home command center, Planner, Search/Browse planning actions and schedule stream hook. Existing date parsing/formatting stays civil-date based; pure parsing is not a clock read. See the [source audit](../../../docs/openspec-baseline/backlog/time-policy-audit.md) and design for the precise integration boundary. No application code, contract, deployment configuration, main-spec promotion or archival is changed by this proposal.
