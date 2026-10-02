# HOME-01 — Tonight's meal status: design

## Integration map

`pwa/src/app/(app)/home/page.tsx` server-fetches the family and week-0 schedule, finds today, and renders `TodayStoreInitializer` plus `HomeCommandCenter`. `todayStore.ts` owns the browser recipe/status slice; `TonightMenuCard.tsx` renders the planned state and hands cooking to `CooksMode`. `useScheduleStream.ts` reconciles schedule events. Kiota/planner helpers cross the browser/API seam; `ScheduleController` delegates durable reads and validations to `ScheduleService`.

## State and async flow

SSR provides a possibly-null seed; `init` deliberately does not erase an existing client recipe merely because SSR returned null. `sync()` re-fetches the current week and normally treats the matching day as authoritative. Cook completion sets status `2` first, then posts validation. Stream snapshots and slot/week events replace the matching slice; a remote cooked event produces the compact cooked presentation.

Network catches only log. There is no pending lock, response-confirmed success, rollback, request identity, or feature-specific stream recovery. Future work must retain the schedule service/SSE publisher as the durable authority.

## Evidence

`page.tsx`, `TodayStoreInitializer.tsx`, `HomeCommandCenter.tsx`, `TonightMenuCard.tsx`, `todayStore.ts`, `useScheduleStream.ts`, `ScheduleController.cs`, `ScheduleService.cs`, `specs/openapi.yaml`; focused evidence: `todayStore.test.ts`, `HomeCommandCenter.test.tsx`, `home-recipe.spec.ts`, and `home-race.spec.ts`.
