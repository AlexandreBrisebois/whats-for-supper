# Design

## Context

See proposal.md — Why. Cross-module evidence reconciliation is needed even though this is documentation extraction. TM-G01 permits supported ordinary-household drafts under A10; A34 keeps runtime qualification deferred.

## Goals / Non-Goals

**Goals:** Extract Home’s local consequence of shared reads and assignments; preserve distinct browser and server date interpretations.

**Non-Goals:** No application design change, new policy, stronger failure UX, cooking implementation, main-spec modification or lifecycle acceptance.

## Decisions

- First observable trace: `/home` serverFetch schedule → protected GET contract → ScheduleController.GetSchedule → ScheduleService.GetScheduleAsync → CalendarEvents/WeeklyPlans projection → TodayStoreInitializer → todayStore → HomeCommandCenter. Browser sync repeats the read and can inspect an adjacent week. Seeding is not a freshness guarantee.
- Keep assignment as its actual path: Home selection → todayStore.assignRecipe → planner.assignRecipeToDay → generated schedule SDK/OpenAPI → AssignRecipeAsync → calendar save and shared recompute/publication. Its fire-and-forget request differs from Planner’s awaited handler; do not import Planner rollback and pending guards. Detail hydration guards recipe identity only.
- Reuse meal-planning’s protected read, assignment and Quick Find deck requirements by exact names in the capability plan. Reuse household-identity’s Gate protected page entry with household access / Authenticate protected API requests independently; library readiness remains recipe-library-owned. Cooking entry/completion and live delivery retain their accepted owners.
- Prefer one canonical home-state delta over repeating shared non-cooking editing or deck behavior. Success is presentation, not confirmed persistence. Cooked display follows executable status and local dismissal, not the unused skipCookedCelebration flag’s comment.

## Risks / Trade-offs

- [Independent SSR, REST and SSE writers] → TM-U01/TM-U02 retain mixed dates, same-week races and guard qualifications.
- [Substituted Home children and stores] → BSL-tonight-meal-decisions-001–004/010 distinguish meaningful assertions from source-only branches; no runtime claim.
- [Failure logs without rollback] → Preserve actual failure boundary without inventing retries or feedback.
- [Voting count includes represented recipes] → Do not claim persisted-vote eligibility or member consensus from that display.

## Migration Plan

No deploy or rollback. Validate this draft, continue the authorized sequential slices and stop for human review. Promotion and archival require later authorization.
