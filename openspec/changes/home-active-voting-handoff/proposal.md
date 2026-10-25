## Why

Home's next-week-only voting invitation misses an open round for this week or a later week. The October 25 demo report (build 0.1.24, October 19–25 open) matches a longstanding journey gap documented in tonight-meal-decisions, rather than establishing a recent regression.

## Outcome and Scope

A person returning to Home can join the active open vote or see its converged matches, even when its week differs from the selected Planner week. This draft settles a minimal review baseline; application remains subject to Alex's design approval.

## What Changes

- Show the household's active open round on Home regardless of target week, using the existing shared voting session.
- Offer Vote Now while collecting; once converged, show exactly "Menu's In", "Your matches are ready to review and save." and "See your matches" in English, with equivalent French intent and no Discovery copy change. Navigate to that round's Planner week with suggestions still awaiting explicit saving and closure.
- Keep the invitation visible while open; replace the existing mounted-view dismissal policy. Preserve usable last-confirmed read-only navigation through background rechecks and failed refreshes, with truthful checking/unavailable feedback and Retry. Withhold navigation without a valid accepted identity/destination or after accepted newer state supersedes it.
- Reuse current session reconciliation and anchored navigation. Navigation alone never assigns meals or closes voting.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tonight-meal-decisions`: replace the next-week-only Home voting handoff with an active-round, convergence-aware handoff; preserve Capture and Browse Library links.

## Impact

Expected implementation owners are HomeCommandCenter, VotingNudgeCard in HomeSections, Home locale copy and existing Home tests. Reuse discoveryStore, the app layout's useScheduleStream, Planner's active-tab setter and Discovery's absolute-week navigation pattern. Narrow additional scope is discoveryStore's completion outcome for an unusable current authoritative read, with focused store tests: mark unavailable instead of leaving initial loading indefinitely, preserving accepted data and ordering guards. Do not add a generic validator or change ignored malformed SSE behavior. No API, generated client, persistence, convergence algorithm or stream protocol change is planned.

Specification and design review only. Alex must review the design and explicitly authorize application before implementation. Excludes Planner saved-versus-suggested redesign, Quick Find issue #338, generic state refactoring, deployment and live data changes.
