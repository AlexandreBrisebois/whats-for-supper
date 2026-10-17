# Design

## Context and Existing Ownership

Scope and exclusions are in [proposal.md](proposal.md). The [time audit](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/backlog/time-policy-audit.md) supplies historical tracing; the following insertion points were checked against current source during planning:

- `api/src/RecipeApi/Services/IClock.cs` already supplies UTC instants and is registered in `Program.cs`. `ScheduleService` accepts an optional clock and constructs a fallback; its week bounds, defer base and overdue cutoff project UTC directly to dates. Reuse the clock, make it required in affected production services and add one cohesive deployment-calendar owner.
- `ScheduleDays.cs` exposes offsets and seven dated entries without calendar context. `ScheduleController` relative endpoints and `pwa/src/lib/api/planner.ts` use offsets without an absolute reference. The API wrapper is the consumer mapping boundary; generated types remain generated.
- `Home/page.tsx` fetches schedule and computes its date separately through `server-date.ts`; `TodayStoreInitializer` compares against browser Today. `imageUtils.getTodayString` owns an unrelated browser clock calculation. Move meal-calendar responsibility into the calendar boundary, leaving image functions and explicit-date parsing intact.
- `todayStore`, `weekStore`, Home, Planner, Recipes, Browse and `useScheduleStream` have affected time/target consumers. `DiscoveryService.GetSmartDefaultsAsync` independently computes UTC Monday. `GroceryRecomputeService.GetWeekOffset` also projects UTC; correct that publication translation without changing grocery aggregation.
- `TestWebApplicationFactory` uses EF InMemory, supports an injected clock and config overrides separately, and substitutes orchestration. It is useful API evidence but cannot establish PostgreSQL behavior. `NonCookingPostgresTests` demonstrates isolated database setup using `WFS_TEST_POSTGRES_CONNECTION`; reuse this pattern for relational acceptance, not the developer's application database.

## Decisions and Tradeoffs

### One server-owned calendar

Use configuration `Calendar:TimeZone` (`Calendar__TimeZone` in environment) with an IANA identifier. The user's decision is UTC on absence and an explicit override when desired. Validate an explicit value at startup. Do not read the OS timezone or infer Toronto from this conversation. Compose/Synology API environment passthrough and configuration documentation must carry the setting; the PWA receives it through API data rather than a second setting.

The Synology release template is an explicit deliverable: add `Calendar__TimeZone=UTC` with an IANA override example to `release-template/synology/.env.example`, and map `Calendar__TimeZone: ${Calendar__TimeZone:-UTC}` in the API environment in `release-template/synology/compose.yaml`. Keep operators editing `.env` only. Add the same default/example to `docker/.env.example` and ensure supported API Compose entry paths (`docker/compose/apps.yml`, `docker/compose/production.yml` and the production override composition) pass it through, reusing inherited mapping where present. Do not configure a separate PWA, database or host timezone.

Update `release-template/synology/README.md` with a deployment-timezone section and `docs/user-guide.md` with the household-visible date behavior. Document the exact key, UTC default, an `America/Toronto` example, administrator ownership, invalid-value startup failure, and API container recreation through Container Manager after changing `.env`. Existing installations add the new key to their current `.env` without replacing secrets or custom values. Explain that changing the zone changes Today/week interpretation but does not migrate stored dates or UTC timestamps; existing `*_CRON_UTC` maintenance schedules retain their UTC interpretation. Verification uses the schedule response's calendar zone/date/week, not the NAS or browser clock.

Keep `IClock.UtcNow` as the instant source. A small deployment-calendar service converts a supplied instant into civil date, Monday and next midnight; it does not query persistence. Capture once at operation entry and pass the resolved reference through reads, mutations, recomputation and publications. Pure date arithmetic can use static functions. System time is read only by composition adapters. No new package or framework is needed by the design.

### Explicit wire reference for multi-request actions

Extend `ScheduleDays` with required `calendar` context and `weekStartDate` (date):

| Calendar field | Meaning |
| --- | --- |
| `timeZone` | Resolved deployment zone identifier |
| `capturedAtUtc` | UTC instant at initial operation capture |
| `today` | Deployment civil date at capture |
| `currentWeekStartDate` | Monday containing that date |
| `referenceWeekStartDate` | Monday used to interpret request offsets |
| `nextDayAtUtc` | Next deployment date boundary, expressed as a UTC instant |

`weekStartDate = referenceWeekStartDate + 7 * weekOffset`. Optional `referenceWeekStartDate` query input on GET schedule, fill-the-gap, smart-defaults, assignment, movement, defer, voting/open and lock pins the reference. For POST operations the query belongs to request configuration, not an invented generated-body field. Reject malformed/non-Monday input with 400 before work. Omission uses a freshly captured current Monday, retaining legacy caller support. Defer starts on the Monday after this reference; its source remains the explicit date. Date-only validation/removal still address their literal path dates.

This additive reference avoids a separate date-addressed mutation API and retains existing offsets. It is necessary because merely returning a timezone cannot prevent a request crossing midnight after its UI computed week zero. It introduces no reservation, expected-recipe check or collision-policy change. A pinned reference intentionally permits a previously captured action to finish for its original date; it does not authorize changing ownership/access.

### Browser time and civil dates

Use one injected PWA time dependency, composed at the server/browser entry boundary, with instant and monotonic elapsed access. Anchor the browser's calendar freshness to the API capture and monotonic elapsed time; conservatively include measured request duration when estimating expiry. Do not use device wall time to decide which supper date is current. Refresh on expiry and on resume/visibility restoration before a new Today action; retire results from a preceding date/reference generation. No hard real-time midnight refresh guarantee is implied while the client is suspended or disconnected.

SSR uses the schedule's own calendar and dates in one result; a test-date cookie cannot override authoritative API dates. Pass context to the client with the seed. Keep UTC instants and date-only values distinct: formatting `2026-10-11` must show October 11 in Tokyo and Toronto. Computing tomorrow means adding one civil day, not 24 elapsed hours. Preserve the existing two-second/twenty-second guards through injected elapsed time and scope them by date, not solely recipe identity.

### Absolute live-event identity

Add `weekStartDate` to smart defaults and week-specific invalidation/grocery events; schedules already carry it. Update OpenAPI live schemas, DTOs, publishers, handlers and stateful mocks together. Producers may retain legacy offsets. Consumers first map absolute Monday into their loaded reference frame, then run existing offset, merge, deferral and echo guards. Thus old October 5 week zero cannot become October 12 week zero. Missing identity triggers a fresh read; it never defaults into current week. Echo confirmation remains independent of snapshot application.

## First Observable Slice

Test migration is part of each behavior slice. Current ScheduleService/ScheduleIntegration tests derive many fixture dates from `DateTime.UtcNow`; Today initializer/store tests use host-local fake dates, `getTodayString` and direct `Date.now` guards. Replace those affected assumptions with injected fixed instants, explicit deployment zones and independent expected dates. Preserve existing state, identity, persistence, stale-response and retry assertions, including UTC-default compatibility. The task matrix names the existing suites to reconcile; new calendar tests do not substitute for keeping those suites current. Calendar fixtures must agree across API, SSR, browser builders and mock handlers, without using the production calculation as their expected-value oracle.

Freeze API time at `2026-10-12T01:30:00Z`, deployment Toronto, SSR OS UTC and browser Tokyo. Use separate fixtures: a read with distinct October 11/18 identities and ingredients, then an assignment fixture with October 11 empty and October 18 retaining its sentinel. Preserve occupied-Sunday/carry-forward behavior for WFS-BL-001/002.

The first working path is SSR Home → calendar seed → Home selection → generated Kiota client with reference October 5 → authenticated schedule API → real ScheduleService → disposable PostgreSQL → grocery recomputation → schedule reread. Assert October 11 receives the exact selected ID, October 18 keeps its sentinel, groceries belong to the October 5 plan and all seven read dates agree. Pair the real API/database check with a browser run exercising the real generated client. Browser mocks alone are separate consumer evidence.

Subsequent slices extend this working boundary to other relative operations, overdue finalization, cooking/Order In, midnight and DST, then real two-client event receipt. Each slice owns its tests and contract/mock updates; tests are not deferred to final integration.

## State, Concurrency and Recovery

Each started action captures `{date, referenceWeekStartDate, targetWeekStartDate, dayIndex}`. Dependent requests reuse it even if midnight passes. A later action refreshes expired context; a failure retains the choice and shows date-unavailable retry feedback without posting a guessed target. Resuming a pending multi-step action retains its prior captured date; starting a separate action captures a new one.

Requests and live data may finish out of order. Date/reference identity prevents cross-date application, without claiming latest-request-wins for otherwise identical requests. Old-day optimistic guards must not suppress the new day, even when recipe IDs match. Retain existing disposition-before-replacement ordering and failure/partial-success behavior; this change does not make replacement atomic or safely repeatable.

## Persistence and Side Effects

Do not migrate CalendarEvent.Date, WeeklyPlan.WeekStartDate or existing cooking instants. Overdue finalization compares dates strictly before captured deployment today. Preserve its existing latest-cooked-date-at-midnight-UTC history anchor: that is a stored representation, not a clock read. Actual completion records the injected UTC instant as before.

Resolve the absolute Monday before persistence; carry it into grocery recomputation and publication-offset calculation. Keep existing follow-up ordering, publication attempts and failure propagation. A saved entry followed by publication failure is still partial success. This change does not add the missing cross-week follow-ups tracked by WFS-BL-012, alter check-map reconciliation, or provide durable event delivery.

## Compatibility, Rollout and Reversal

Ship contract, API and PWA together. Existing API callers omitting the reference use deployment current week. Missing timezone uses UTC; invalid explicit configuration fails early. New PWA code requires authoritative context before a Today write; old servers cannot supply it and must not trigger a browser-local fallback. Existing explicit-date API calls remain literal.

Document UTC default and deployment override, including a warning that changing the zone changes Today/week interpretation without rewriting history. Rollback restores previous code/configuration; no SQL/data migration is planned. Preserve the existing dirty harness/schema/config files during implementation and include any shared runtime inputs actually altered in verification scope.

Template acceptance must render the shipped Synology Compose file with synthetic credentials in an isolated environment for an omitted timezone, explicit UTC and `America/Toronto`. Assert the resolved API value and absence of an independent PWA timezone; repeat for supported repository API Compose entry paths. Compose rendering proves wiring only. The configured API-image startup/date checks and real-seam tests separately prove interpretation. Review the shipped operator documentation against those exact keys/defaults and record physical NAS qualification as not-run unless it is actually exercised.

## User Experience

Keep existing Solar Earth surfaces, navigation, pending controls and confirmation behavior. Reuse current loading and operation-error areas for calendar refresh. When a required refresh fails, show “Could not confirm today's date. Try again.” with a retry action; preserve the selected recipe/draft and keyboard focus. No timezone picker or per-member timezone setting is introduced.

## Risks and Deferrable Questions

- Source tracing establishes the mismatch, not production frequency. Live/API/database/browser checks are still required.
- The accepted all-clock policy is broader than supper-date scope. WFS-BL-005 stays open for the remaining inventory; do not equate this increment with whole-repository time injection.
- Zone database availability must be tested in the supported API image. A failing configured-zone smoke check blocks override qualification rather than silently reverting to UTC.
- Required live tests need isolated credentials and a disposable database. Existing EF InMemory and Playwright route mocks cannot replace this evidence. No external models are needed.
