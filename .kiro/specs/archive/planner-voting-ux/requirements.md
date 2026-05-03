# Requirements Document

## Introduction

This spec consolidates four related improvements to the planner and voting experience:

1. **Day card layout stability** — eliminate height-shifting in `PlannerDayCard` caused by vote badge toggling and recipe name wrapping.
2. **Quick Find deduplication and rotation sort** — `FillTheGapAsync()` must exclude recipes already in the current week and apply the same rotation sort used by Discovery.
3. **Voting nudge card on home** — a session-dismissible card on the Home Command Center that surfaces active next-week voting without requiring planner navigation.
4. **`weekStore` digital twin** — replace the week-agnostic boolean flags in `plannerStore` with a proper digital twin store (`weekStore`) that seeds status from the API and applies optimistic writes with background reconciliation, following the same pattern as `todayStore`.

## Glossary

- **PlannerDayCard**: The card component rendered for each day in the planner week view (`pwa/src/app/(app)/planner/page.tsx`).
- **WeekStore**: A new Zustand store (`pwa/src/store/weekStore.ts`) that acts as the digital twin for a single week's schedule, following the pattern described in `docs/flows/client-domain-model.md`.
- **WeeklyPlan**: The server-side entity (`WeeklyPlan`) that tracks a week's `Status` (0=Draft, 1=VotingOpen, 2=Locked).
- **FillTheGapAsync**: The service method in `ScheduleService.cs` that returns Quick Find recipe suggestions.
- **Quick Find**: The modal (`QuickFindModal`) that surfaces recipe suggestions when a planner slot is empty.
- **VotingNudgeCard**: A new home-page card component that surfaces active next-week voting.
- **HomeCommandCenter**: The client component (`pwa/src/components/home/HomeCommandCenter.tsx`) that orchestrates the home page interactive sections.
- **weekOffset**: Integer offset from the current week (0 = this week, 1 = next week, −1 = last week).
- **status**: Integer encoding of `WeeklyPlanStatus` — 0=Draft, 1=VotingOpen, 2=Locked.
- **Rotation sort**: Sort order `LastCookedDate ASC NULLS FIRST` (never-cooked first), then `VoteCount DESC` as tiebreaker.
- **Digital twin pattern**: Optimistic-first client store that seeds from the API on init, applies mutations immediately to local state, and reconciles with the server in the background. See `docs/flows/client-domain-model.md`.

---

## Requirements

### Requirement 1: Day Card Fixed Height

**User Story:** As a family member viewing the planner, I want the day cards to stay the same height regardless of vote counts or recipe name length, so that the list does not reflow or jump while I am interacting with it.

#### Acceptance Criteria

1. THE PlannerDayCard SHALL render at a fixed height of 72px regardless of recipe name length or vote badge visibility.
2. WHEN a vote badge is not applicable (vote count is zero or absent), THE PlannerDayCard SHALL reserve the badge slot in the DOM using `visibility: hidden` rather than removing the element.
3. THE PlannerDayCard SHALL truncate the recipe name to a single line using `line-clamp-1`.
4. WHEN a vote count changes while the planner is open, THE PlannerDayCard SHALL update the badge text without changing the card height.
5. WHEN a recipe with a long name is assigned to a day slot, THE PlannerDayCard SHALL not increase the card height or cause adjacent cards to shift position.

---

### Requirement 2: Quick Find Deduplication

**User Story:** As a planner user, I want Quick Find to never suggest a recipe already in the current week's plan, so that I am not offered duplicates.

#### Acceptance Criteria

1. WHEN `GET /api/schedule/fill-the-gap` is called with a `weekOffset` query parameter, THE ScheduleService SHALL exclude any recipe already assigned to a `CalendarEvent` in that week from the results.
2. THE `FillTheGapAsync` method SHALL accept a `weekOffset` parameter (default 0) and use it to determine which week's existing assignments to exclude.
3. WHEN a recipe is already planned for the requested week, THE ScheduleService SHALL not include that recipe in the Quick Find results regardless of whether it comes from the `RecipeMatches` pool or the `DiscoveryRecipes` fallback pool.
4. THE ScheduleController SHALL expose `weekOffset` as an optional query parameter on `GET /api/schedule/fill-the-gap`, defaulting to 0.
5. THE PWA QuickFindModal SHALL pass the current `weekOffset` when calling `GET /api/schedule/fill-the-gap`.

---

### Requirement 3: Quick Find Rotation Sort

**User Story:** As a planner user, I want Quick Find to surface recipes I haven't cooked in a long time (or never cooked) first, so that the family gets variety rather than always seeing the same favourites.

#### Acceptance Criteria

1. THE ScheduleService SHALL sort the `RecipeMatches` pool using rotation sort: `LastCookedDate ASC NULLS FIRST`, then `VoteCount DESC` as a tiebreaker.
2. THE ScheduleService SHALL sort the `DiscoveryRecipes` fallback pool using the same rotation sort: `LastCookedDate ASC NULLS FIRST`, then `VoteCount DESC` as a tiebreaker.
3. WHEN both pools are used, THE ScheduleService SHALL return `RecipeMatches` results before `DiscoveryRecipes` results, preserving pool priority while applying rotation sort within each pool.
4. THE OpenAPI contract for `GET /api/schedule/fill-the-gap` SHALL be updated to document the `weekOffset` query parameter and the rotation sort behaviour.

---

### Requirement 4: Voting Nudge Card on Home

**User Story:** As a family member on the home screen, I want to see a card when next week's voting is open, so that I can vote without navigating into the planner.

#### Acceptance Criteria

1. WHEN `GET /api/schedule?weekOffset=1` returns a schedule with `status === 1` (VotingOpen), THE HomeCommandCenter SHALL display the VotingNudgeCard below the tonight card and above the Quick Capture trigger.
2. WHEN the schedule for `weekOffset=1` has `status !== 1`, THE HomeCommandCenter SHALL not render the VotingNudgeCard.
3. THE VotingNudgeCard SHALL display the count of next-week days that have a recipe assigned (i.e. recipes available to vote on).
4. WHEN a user taps the VotingNudgeCard, THE HomeCommandCenter SHALL navigate to `/discover`.
5. WHEN a user dismisses the VotingNudgeCard, THE HomeCommandCenter SHALL hide it for the remainder of the session without persisting the dismissal to storage.
6. THE HomeCommandCenter SHALL fetch `GET /api/schedule?weekOffset=1` client-side in a `useEffect` after mount, without blocking the initial page render.
7. THE VotingNudgeCard SHALL use the ochre accent colour consistent with the discovery/voting visual identity.
8. IF the `GET /api/schedule?weekOffset=1` fetch fails, THEN THE HomeCommandCenter SHALL not render the VotingNudgeCard and SHALL not surface an error to the user.

---

### Requirement 5: weekStore Digital Twin

**User Story:** As a developer maintaining the planner, I want a `weekStore` that seeds its state from the API and applies optimistic mutations, so that week navigation feels instant and voting/lock state is always consistent with the server.

#### Acceptance Criteria

1. THE WeekStore SHALL expose a `status` field of type `0 | 1 | 2` seeded from `WeeklyPlan.Status` returned by `GET /api/schedule?weekOffset={n}`.
2. THE WeekStore SHALL derive `isVotingOpen` and `isLocked` as computed values from `status` rather than storing them as independent boolean flags.
3. WHEN `init(weekOffset)` is called, THE WeekStore SHALL immediately expose any previously cached state for that offset while fetching fresh data from the API in the background.
4. WHEN the background fetch in `init` completes, THE WeekStore SHALL update `schedule`, `status`, and `lastSyncedAt` from the API response.
5. WHEN `openVoting()` is called, THE WeekStore SHALL set `status = 1` optimistically before calling `POST /api/schedule/voting/open`, and SHALL revert to the previous status if the API call fails.
6. WHEN `lockWeek()` is called, THE WeekStore SHALL set `status = 2` optimistically before calling `POST /api/schedule/lock`, and SHALL revert to the previous status if the API call fails.
7. WHEN `assignRecipe(dayIndex, recipe)` is called, THE WeekStore SHALL update the local `schedule` array immediately before calling `POST /api/schedule/assign`.
8. WHEN `removeRecipe(dayIndex)` is called, THE WeekStore SHALL clear the recipe from the local `schedule` array immediately before calling `DELETE /api/schedule/day/{date}/remove`.
9. WHEN `moveRecipe(from, to)` is called, THE WeekStore SHALL swap the recipes in the local `schedule` array immediately before calling `POST /api/schedule/move`.
10. WHEN `setWeekOffset` is called on the planner page, THE WeekStore SHALL call `init(newOffset)` to load the new week, replacing stale boolean state.
11. THE planner page SHALL read `schedule`, `status`, `isVotingOpen`, and `isLocked` exclusively from WeekStore rather than from local `useState` or `plannerStore` boolean flags.
12. WHEN an optimistic write is in-flight, THE WeekStore `sync()` SHALL not overwrite local schedule state, following the same guard used by `todayStore` (protect writes younger than 10 seconds).
13. IF `init(weekOffset)` fails, THEN THE WeekStore SHALL set `isLoading = false` and retain any previously cached state rather than clearing it.

---

### Requirement 6: weekStore "Ask the Family" CTA Availability

**User Story:** As a planner user on any week, I want the "Ask the Family" button to appear whenever voting can be opened — including weeks with no meals yet planned — so that I am never blocked from starting a vote.

#### Acceptance Criteria

1. WHEN `status === 0` (Draft) and the week is not in the past, THE planner page SHALL display the "Ask the Family" CTA regardless of how many recipes are planned for that week.
2. WHEN `status === 1` (VotingOpen), THE planner page SHALL not display the "Ask the Family" CTA.
3. WHEN `status === 2` (Locked), THE planner page SHALL not display the "Ask the Family" CTA.
