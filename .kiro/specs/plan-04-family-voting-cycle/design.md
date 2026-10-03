# PLAN-04 — Family voting cycle: design baseline

## Integration map

Planner actions in `planner/page.tsx` call `weekStore.openVoting`/`closeVoting`; the store uses `lib/api/planner.ts`, fetches `GET /api/schedule/{weekOffset}/smart-defaults`, and overlays returned candidates only onto empty slots. `getVotingLink` in `lib/auth.ts` supplies the nudge URL. Individual vote submission is owned by discovery UI/store and `DiscoveryController`/`DiscoveryService`.

`ScheduleController` delegates voting-open/lock and smart-default reads to `ScheduleService`; `DiscoveryController.Vote` delegates member-scoped upsert/count work to `DiscoveryService`. Durable rows are `WeeklyPlan`, `CalendarEvent`, `RecipeVote`, and recipe last-cooked/vote data. `ScheduleService.LockScheduleAsync` is the lifecycle boundary: it locks events, stores counts, purges all votes, saves, then publishes a whole-week event.

`useScheduleStream` dispatches vote count and smart-default events into `weekStore` and `discoveryStore`. `SmartDefaultsDto` and event contracts live in `specs/openapi.yaml`; client `_isPending`, `_voteCount`, and `_unanimousVote` fields remain noncontract display state.

## Dependencies and evidence

PLAN-01 owns week selection, `disc-01-swipe-discovery-queue`/`disc-02-household-matching-feedback` own discovery voting, and `plat-01-shared-real-time-state` owns stream delivery. Relevant evidence: `weekStore.test.ts`, `useScheduleStream.test.ts`, `DiscoveryServiceTests.cs`, `ScheduleServiceTests.cs`, `DiscoveryIntegrationTests.cs`, and `ScheduleIntegrationTests.cs`.
