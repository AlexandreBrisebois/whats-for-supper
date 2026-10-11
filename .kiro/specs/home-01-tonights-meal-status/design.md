# HOME-01 — Tonight's meal status: design

## Integration map

`pwa/src/app/(app)/home/page.tsx` server-fetches the family and week-0 schedule, finds today, and renders `TodayStoreInitializer` plus `HomeCommandCenter`. `todayStore.ts` owns the browser recipe/status slice; `TonightMenuCard.tsx` renders the planned state and hands cooking to `CooksMode`. `useScheduleStream.ts` reconciles schedule events. Kiota/planner helpers cross the browser/API seam; `ScheduleController` delegates durable reads and validations to `ScheduleService`.

## State and async flow

SSR provides a possibly-null seed; `init` deliberately does not erase an existing client recipe merely because SSR returned null. `sync()` re-fetches the current week and normally treats the matching day as authoritative. Cook's Mode saves through `todayStore.markCooked(recipeId)` from both Home and recipe detail. Validation includes `{ status: 2, recipeId }`; the server records the recipe timestamp and completes today's event only if its recipe matches. The store sets status `2` only after `{ data: { message, mealMarkedCooked: true } }` confirms completion and the local current recipe still matches. Home no longer supplies a second persistence callback. Stream snapshots and slot/week events replace the matching slice; a remote cooked event produces the compact cooked presentation.

Cooking completion has a duplicate-submission guard and disabled completion button while saving; a failed save leaves Cook's Mode open with an error and retry. Other optimistic assignment/ordered-in write catches only log, and there is no feature-specific stream recovery. The schedule service/SSE publisher remains the durable meal-state authority.

## Evidence

`page.tsx`, `TodayStoreInitializer.tsx`, `HomeCommandCenter.tsx`, `TonightMenuCard.tsx`, `todayStore.ts`, `useScheduleStream.ts`, `ScheduleController.cs`, `ScheduleService.cs`, `specs/openapi.yaml`; focused evidence: `todayStore.test.ts`, `HomeCommandCenter.test.tsx`, `home-recipe.spec.ts`, and `home-race.spec.ts`.
