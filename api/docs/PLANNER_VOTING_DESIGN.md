# Planner Voting Design Specification

## Overview

This document captures the design decisions for the weekly meal planner voting feature, where family members vote on recipes in a consensus-based approach to build the week's meal plan.

**Date**: 2026-04-23  
**Status**: Design Locked

---

## Design Decisions

### 1. Vote Count Data Flow

**Decision**: Vote counts originate from `RecipeVotes` table and flow through multiple layers for different purposes.

**Flow**:

- Family votes in discovery/match view → `RecipeVotes` table
- `vw_discovery_recipes` view denormalizes votes → `DiscoveryRecipe.VoteCount`
- Discovery UI displays recipes sorted by `VoteCount` DESC (drives convergence)
- `GetSmartDefaultsAsync()` reads `RecipeVotes`, computes vote counts in real-time
- Planner displays smart defaults with live vote counts during voting phase

**Rationale**: Separates concerns—discovery shows social proof for convergence, smart defaults recommends consensus recipes, planner shows recommendations.

---

### 2. Smart Defaults Auto-Population

**Decision**: Smart defaults auto-populate into the weekly grid as full recipe cards with vote counts and visual indicators.

**Structure**:

- Recipe cards display: image, name, description
- Vote count badge shown: `{voteCount}/{familySize}`
- Green indicator when unanimous (`voteCount == familySize`)
- No additional UI chrome—native drag/tap/reorder patterns

**Rationale**: Reduces cognitive load by putting decisions in the same context where mom manages the week.

---

### 3. Vote Count Persistence

**Decision**: Vote counts are persisted to `CalendarEvent.VoteCount` when voting ends, not to `DiscoveryRecipe.VoteCount`.

**Timing**:

- `CalendarEvent.VoteCount` is `null` before voting begins
- When mom clicks "End Voting" (locks schedule): copy final vote count → `CalendarEvent.VoteCount`
- After voting closed: planner reads `CalendarEvent.VoteCount` (not re-computed from `RecipeVotes`)

**Rationale**:

- Historical record per week (data mining: "which recipes were most voted on?")
- Separate from discovery's convergence metric
- Minimal schema changes (add one nullable column to `CalendarEvent`)

**Schema Change**:

```csharp
public class CalendarEvent
{
    // ... existing fields ...
    public int? VoteCount { get; set; }  // Persisted vote count after voting closes
}
```

---

### 4. Voting Phase & Lifecycle

**Decision**: Voting is a distinct phase with clear boundaries.

**States**:

1. **Planning Phase**: Mom builds week with smart defaults, can reorder/edit freely
2. **Voting Open**: Mom clicks "End Voting" → family can vote on the recipes in the plan
    - Family votes in discovery/match view on the planned recipes
    - Vote counts update in real-time in the planner
    - Planned recipes are filtered out from discovery (family can't suggest recipes already in the plan)
3. **Voting Closed**: Voting window expires or mom closes it
    - Vote counts persisted to `CalendarEvent.VoteCount`
    - `RecipeVotes` table cleared (current week votes no longer needed)
    - Button state changes: "Voting Complete" → "Voting Closed"
    - Mom can still reorder recipes and add missing ones

**Button Naming**:

- During planning: "End Voting" (initiates family voting)
- During voting: "Voting Complete" (mom closes voting early, optional)
- After voting closed: "Voting Closed" (read-only indicator)

**Rationale**: Clear state machine prevents confusion about what actions are available.

---

### 5. Voting Reopening

**Decision**: Reopening voting allows family to vote only on _empty slots_, not replace locked recipes.

**Behavior**:

- Clears votes for this week (resets `RecipeVotes`)
- Opens voting to whole family for _remaining open slots_
- Planned recipes (`CalendarEvent` with recipes) do NOT show in discovery during voting
- Cannot override what's already saved

**Rationale**: Respects mom's finalized decisions while allowing family input on gaps.

---

### 6. Discovery Filtering During Voting

**Decision**: Discovery must filter out recipes already planned for the week being voted on.

**Implementation**:

- Add week context to discovery requests (or derive from server state)
- `GetRecipesForDiscoveryAsync()` excludes recipes that have `CalendarEvent` entries for the week being voted on
- Applies to all discovery voting, not just reopened weeks

**Rationale**: Prevents duplicate suggestions, respects planned meals, reduces family confusion.

---

### 7. Vote Count Display in Planner

**During Voting Phase**:

- Source: `RecipeVotes` (via `GetSmartDefaultsAsync()`)
- Updated: Real-time as family votes come in
- Display: `{voteCount}/{familySize}` with green badge if unanimous

**After Voting Closed**:

- Source: `CalendarEvent.VoteCount` (persisted)
- Display: Same badge, but now historical
- Allows mom to see "last week everyone loved this"

**Rationale**: Preserves voting context for future weeks and data mining.

---

### 8. RecipeVotes Lifecycle

**Decision**: `RecipeVotes` is ephemeral—only exists during voting phase for current week.

**Lifecycle**:

- Created: During voting phase as family members vote
- Cleared: When voting ends (mom closes voting or window expires)
- Not persisted across weeks (vote history is in `CalendarEvent.VoteCount`)

**Rationale**: Keeps database clean, vote history lives in calendar week, not votes table.

---

## Test Cases

### Vote Count Flow Tests

- [ ] Smart defaults include current `VoteCount` from `RecipeVotes`
- [ ] Vote counts update in real-time as family votes
- [ ] Unanimous recipes (`voteCount == familySize`) are visually distinct
- [ ] Planner shows vote counts from smart defaults during voting phase

### Voting End Tests

- [ ] `LockScheduleAsync()` persists vote counts to `CalendarEvent.VoteCount`
- [ ] `LockScheduleAsync()` clears `RecipeVotes` table
- [ ] Button state changes from "End Voting" to "Voting Closed"
- [ ] Vote counts remain visible in planner after voting ends

### Reopening Tests

- [ ] Reopening clears current week's `RecipeVotes`
- [ ] Reopening only allows voting on empty slots
- [ ] Already-planned recipes don't appear in discovery during reopened voting
- [ ] Reopened voting shows previous `CalendarEvent.VoteCount` for reference

### Discovery Filtering Tests

- [ ] Recipes with `CalendarEvent` entries for the voting week are excluded from discovery
- [ ] Filtering works for both initial voting and reopened voting
- [ ] Filtering preserves already-voted recipes in `RecipeVotes`

### Data Mining Tests

- [ ] Historical vote counts are preserved in `CalendarEvent.VoteCount` for past weeks
- [ ] Vote counts can be queried per week for analytics

---

## Schema Changes

### Migration: Add VoteCount to CalendarEvent

```sql
ALTER TABLE calendar_events
ADD COLUMN vote_count INT NULL DEFAULT NULL;

-- Index for querying by vote count (for data mining)
CREATE INDEX idx_calendar_events_vote_count
ON calendar_events(week_offset, vote_count DESC)
WHERE vote_count IS NOT NULL;
```

---

## Open Questions & Notes

- **Vote Window Expiration**: When does a voting window auto-close? (Timer-based, or manual only?)
- **Data Mining**: What queries will we support? (Most voted recipes per week? Family preferences?)
- **UI Indicators**: Should unanimous recipes have a special icon/animation beyond color?

---

## Related Code

- `ScheduleService`: Generates smart defaults, locks schedule
- `DiscoveryService`: Handles voting, filters recipes
- `CalendarEvent` model: Add `VoteCount` field
- `ScheduleRecipeDto`: Include `VoteCount` field for planner
- `GetSmartDefaultsAsync()`: Already computes vote counts, no changes needed
