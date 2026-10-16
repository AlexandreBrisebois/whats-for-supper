# Design

## Context

See proposal.md — Why. Week status, day status, suggestion metadata and cooking confirmation are separate representations; comments claiming atomic close or a complete state machine exceed executable behavior.

## Goals / Non-Goals

**Goals:** Extract BSL-meal-planning-031–033; preserve accepted read/non-cooking grammar and owner boundaries.

**Non-Goals:** No discovery threshold or voting UX redesign, general cooking/history spec, validated state-machine enforcement or application changes.

## Decisions

- First slice: Planner Ask/Close → weekStore optimistic status → generated open/assign/lock operations and OpenAPI → ScheduleController → WeeklyPlan/calendar/RecipeVotes → save/read/publish → store metadata and page feedback. Close assignments use Promise.all before lock and cannot be described as one atomic operation. Direct lock has no browser suggestion promotion.
- Describe ordinary Planned lock and recipe-free skip preservation only. Lock code also resets Cooked, AwaitingConsensus and recipe-backed Skipped entries to Locked, but universal desired-state treatment is withheld (MP-U08). No frozen-week mutation guard exists. Saved counts remain unchanged if no matching Like group; do not assert zero reset or fresh universal totals.
- Lock's vote purge is an observed closure consequence, not discovery policy. Discovery accepted owner requirements are absent; record that dependency gap instead of assigning new vote meanings. Cooking history remains owned elsewhere; day validation describes assignment matching and response consequences only.
- Day-only status 1 conflicts with OpenAPI's Planned prose while entity value is Locked; 4→1 recipe-vote purge exists in source/tests but its normative vocabulary is withheld (MP-U09). Do not repair contracts or baseline unsupported arbitrary status acceptance.
- Explicit recipe-aware status2 updates available recipe LastCookedDate using injected current clock. Different/no assignment returns false after fill-gap invalidation with no slot publication. Matching/day-only existing entry saves status and attempts slot publication. General non-cooking validation remains in the accepted 19/44.
- Nudge shares a getVotingLink result (lib/auth server action: signed invite redirect=/discovery when secret exists; empty otherwise). Household-identity owns token/access/invite validation; Planner owns dialog/copy/native-share feedback. The URL has no week selection. Browser test assertions substitute link generation, clipboard/share and store/animations; no native permission or real invitation guarantee.

## Risks / Trade-offs

- [Partial promotion/global vote purge] → MP-U08; retain no atomic closure, idempotency or frozen-week guarantee.
- [Day status contract mismatch and unchecked status cast] → MP-U09; supported status2/3 only; record missing-entry exception and no exhaustive invalid-input guarantee.
- [Independent async writes across offsets] → MP-U10; no request-generation guard or local restoration isolation.
- [Dialog/English feedback/local versus UTC date] → No full localization, focus trap, Escape, midnight or immediate consumer freshness guarantee. Native Copy/Share failures are logged; link rejection has no dedicated catch/Retry panel.

## Migration Plan

Documentation only, no deployment. Validate selected artifacts and continue overdue/API ownership reconciliation. Human acceptance/promotion pending; runtime not-run.
