# ADR 014: Vote Count Persistence in CalendarEvent

**Date**: 2026-04-23  
**Status**: ACCEPTED  
**Context**: Voting Feature Implementation

---

## Problem Statement

The planner needs to display real-time vote counts as family members vote in the discovery UI. Additionally, historical vote counts must be preserved for data mining and trend analysis.

Two options existed:
1. **Transient votes only** - Keep vote counts in `RecipeVotes` table, recompute on every planner load
2. **Persistent votes** - Persist final vote counts to `CalendarEvent`, keep `RecipeVotes` ephemeral

---

## Decision

**Persist vote counts to `CalendarEvent.VoteCount`** (nullable int field).

### Rationale

1. **Minimal Schema Impact**: Single nullable column on existing entity
2. **Historical Record**: Vote counts tied to specific weeks enable data mining ("Which recipes were most voted on?")
3. **Clean Separation**: 
   - `RecipeVotes` = ephemeral voting data during window
   - `CalendarEvent.VoteCount` = persisted consensus metric per week
4. **Real-Time Display**: Planner can poll `SmartDefaults` (which reads live `RecipeVotes`) while building `CalendarEvent.VoteCount` as backup
5. **Prevents Vote Recomputation**: After voting closes, no need to query `RecipeVotes` again

---

## Implementation

### Schema Change
```csharp
public class CalendarEvent
{
    public Guid Id { get; set; }
    public Guid RecipeId { get; set; }
    public DateOnly Date { get; set; }
    public CalendarEventStatus Status { get; set; }
    public Recipe? Recipe { get; set; }
    public int? VoteCount { get; set; }  // NEW: Persisted vote count
}
```

### Lifecycle

1. **Before Voting**: `VoteCount = null`
2. **During Voting**: 
   - `RecipeVotes` accumulate in real-time
   - `SmartDefaults` reads live vote counts from `RecipeVotes`
   - Planner polls every 30 seconds to display current vote counts
3. **When Voting Ends** (`LockScheduleAsync`):
   - Count final votes from `RecipeVotes` grouped by recipe
   - Persist counts to `CalendarEvent.VoteCount`
   - Clear `RecipeVotes` table
4. **After Voting**: 
   - `CalendarEvent.VoteCount` contains historical count
   - Available for data mining, trend analysis, family preference insights

### Vote Count Definition
- **Source**: `RecipeVotes.Vote == VoteType.Like` only
- **Metric**: Simple count (no weighted voting)
- **Scope**: Per week, per recipe
- **Storage**: Alongside calendar event, accessible via `GET /api/schedule`

---

## Alternatives Considered

### A. Store votes separately (separate VoteHistory table)
- ❌ More tables, more complexity
- ❌ Requires joins for historical queries
- ✅ Could track individual voter history

### B. Keep votes in RecipeVotes indefinitely
- ❌ RecipeVotes grows unbounded over time
- ❌ Ambiguous: which week's votes are these?
- ❌ Requires recomputation on every load

### C. Denormalize to DiscoveryRecipe.VoteCount only
- ❌ Lost per-week context
- ❌ Can't track week-specific consensus
- ❌ Poor for family preference insights

---

## Consequences

### Positive
1. Historical vote counts available for analytics
2. Minimal schema change (one nullable column)
3. Clear separation of concerns (transient vs persisted)
4. Supports 30-second real-time polling without performance impact
5. Vote window clearly marked (when VoteCount is set, voting is closed)

### Negative
1. Additional column in `CalendarEvent` table
2. Requires migration for existing deployments
3. Need to manage index strategy for data mining queries

---

## Data Mining Opportunities (Future)

Once vote counts are persisted, we can build:
- "Most voted recipes last 4 weeks" dashboard
- "Family consensus over time" trends
- "Which recipes reach unanimous votes fastest"
- "Recipes that split family opinion"

---

## References

- Implementation: [api/src/RecipeApi/Services/ScheduleService.cs](../../api/src/RecipeApi/Services/ScheduleService.cs)
- Tests: [api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs](../../api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs)
- Design Spec: [api/docs/PLANNER_VOTING_DESIGN.md](../../api/docs/PLANNER_VOTING_DESIGN.md)
- Migration: [api/Migrations/20260423160000_AddVoteCountToCalendarEvent.cs](../../api/Migrations/20260423160000_AddVoteCountToCalendarEvent.cs)

---

## Sign-Off

- **Decided By**: Claude Code (Haiku 4.5)
- **Approved By**: User (implicit via implementation)
- **Date**: 2026-04-23
