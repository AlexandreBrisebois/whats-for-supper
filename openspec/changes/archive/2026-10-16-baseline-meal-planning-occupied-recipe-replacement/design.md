# Design

## Context

See proposal.md — Why. This is documentation extraction under MP-G01, not an implementation design. Cross-page recovery and persistence-before-publication need explicit seam reconciliation.

## Goals / Non-Goals

**Goals:** Preserve the accepted 49/114, draft the occupied branch, and map every scenario to BSL-meal-planning-022–024 in the capability plan.

**Non-Goals:** No application changes, safe-retry invention, owner-policy extraction or runtime observation. All main specs remain unchanged.

## Decisions

- First observable slice: Planner occupied Quick Find selection → captured slot/replacement → SkipRecoveryDialog → slotAssignment generated move/defer/delete → protected ScheduleController → ScheduleService calendar save → assignment wrapper/store GET → displayed recovery/refresh. OpenAPI is inspected without modification. Source-supported success is separated from rejected follow-ups.
- Keep Search/Browse recovery distinct: their next-week action uses target offset + 1 movement; Planner selects server defer. Unifying them would invent behavior. Planner's ref guards do not establish a shared cross-page lock or safe concurrent retry.
- Quick Find fetch generations retire old/unmounted results; current index clamps on replacement. Eligible version changes request a new read after initial completion; transport delivery is owned elsewhere. Failure retains the existing deck and logs. Card flip/progress and close are local presentation, not selection policy.
- Quick Find Skip navigates suggestions; it is not day Skipped status. Suggestion selection/eligibility stays discovery-owned. Reuse accepted empty-day assignment requirements for shared request/auth/date/optimistic adjunct handling.
- Trace Sunday directly to AssignRecipeAsync: source recompute → source schedule publication → invalidation → destination recompute → destination publication → response. Existing Monday is overwritten by executable code. Keep collision safety/treatment non-normative (MP-U02); do not specify lossless displacement.
- Reuse household-identity “Authenticate protected API requests independently” and household-live-updates “Attempt incremental schedule publication after supported saves”, “Dispatch week updates through existing snapshot guards” and “Consume move echoes as confirmation before offset filtering”. No wire/application guarantee follows a publisher call.

## Risks / Trade-offs

- [Partial prior operation / failed replacement] → Record local retry memory and lack of compensation; MP-U01.
- [Sunday destination overwrite and stale vote fields] → Withhold collision-safety and count freshness; MP-U02.
- [Search/Browse retries and navigation] → Record missing Planner-style guard/refresh/memory rather than extrapolating; MP-U03.
- [Mixed local date and UTC offset; dismissal during requests; mocked boundaries] → Preserve A34/U95–U122; no isolation, midnight, focus trap or full localization guarantee. Recovery uses translated button labels but several Planner toast and Quick Find strings are English literals.

## Migration Plan

No deployment or rollback. Validate this draft, then continue authorized successor extraction. Human acceptance and separately authorized promotion remain pending.
