# Planner Voting Feature - Test Cases

This document lists all test cases for the voting feature. Tests are written **before** implementation to ensure alignment.

**Status**: Tests written, ready for implementation

---

## Test Cases Added

### ScheduleServiceTests.cs

#### ✅ Vote Count Persistence Tests

**Test**: `LockScheduleAsync_PersistsVoteCount_WhenVotesExist`

- **Requirement**: When mom clicks "End Voting" (calls `LockScheduleAsync`), vote counts are persisted to `CalendarEvent.VoteCount`
- **Setup**: Create CalendarEvent, add 3 votes from family members
- **Action**: Call `LockScheduleAsync(0)`
- **Assert**: CalendarEvent.VoteCount == 3

**Test**: `LockScheduleAsync_ClearsRecipeVotes_AfterPersistingVoteCount`

- **Requirement**: After persisting vote counts, the `RecipeVotes` table is cleared (votes are ephemeral)
- **Setup**: Create CalendarEvent, add 2 votes
- **Action**: Call `LockScheduleAsync(0)`
- **Assert**: RecipeVotes.Count() == 0

---

#### ✅ Smart Defaults Vote Count Tests

**Test**: `GetSmartDefaultsAsync_IncludesVoteCount_FromRecipeVotes`

- **Requirement**: Smart defaults include real-time vote counts from `RecipeVotes` during voting phase
- **Setup**: Create recipe, add 2 "Like" votes from family members
- **Action**: Call `GetSmartDefaultsAsync(0)`
- **Assert**: PreSelectedRecipeDto.VoteCount == 2

**Test**: `GetSmartDefaultsAsync_MarksUnanimous_WhenAllFamilyMembersVote`

- **Requirement**: When all family members vote for a recipe (unanimous), it's marked as such
- **Setup**: Create recipe, add 3 votes from 3 family members (all Like)
- **Action**: Call `GetSmartDefaultsAsync(0)`
- **Assert**:
    - PreSelectedRecipeDto.UnanimousVote == true
    - PreSelectedRecipeDto.VoteCount == 3
    - PreSelectedRecipeDto.FamilySize == 3

---

#### ✅ Schedule Retrieval Tests

**Test**: `GetScheduleAsync_ReturnsVoteCount_FromCalendarEvent_AfterVotingClosed`

- **Requirement**: After voting closes, planner returns vote counts from `CalendarEvent.VoteCount` (not recomputed)
- **Setup**: Create CalendarEvent with Locked status and VoteCount = 4
- **Action**: Call `GetScheduleAsync(0)`
- **Assert**: ScheduleRecipeDto includes VoteCount (needs DTO update)

---

### DiscoveryServiceTests.cs

#### ⏳ Discovery Filtering Tests (TODO)

**Test**: `GetRecipesForDiscoveryAsync_ExcludesPlannedRecipes_FromCurrentWeek`

- **Requirement**: Recipes already planned for a week don't appear in discovery during voting
- **Implementation Note**: Requires adding `weekOffset` parameter to `GetRecipesForDiscoveryAsync()`
- **Setup**: Create 2 recipes, plan recipe1 for Monday of current week
- **Action**: Call `GetRecipesForDiscoveryAsync(memberId, category: null, weekOffset: 0)`
- **Assert**: Results.Count == 1, only recipe2 is returned

---

## Schema Changes Required

### 1. Add VoteCount to CalendarEvent

**File**: Entity model and migration

```csharp
public class CalendarEvent
{
    // ... existing fields ...
    public int? VoteCount { get; set; }  // Persisted vote count after voting closes
}
```

**Migration**:

```sql
ALTER TABLE calendar_events
ADD COLUMN vote_count INT NULL DEFAULT NULL;
```

---

### 2. Add VoteCount to ScheduleRecipeDto

**File**: RecipeApi/Dto/ScheduleDays.cs (or similar)

```csharp
public record ScheduleRecipeDto(
    Guid RecipeId,
    string Name,
    string Image,
    int? VoteCount  // NEW: Vote count (null during planning, number after voting)
);
```

---

## Implementation Checklist

- [ ] **Add VoteCount column to CalendarEvent** (Entity + Migration)
- [ ] **Update ScheduleRecipeDto** to include VoteCount
- [ ] **Modify LockScheduleAsync()** to:
    - Query current week's RecipeVotes
    - Count votes per recipe
    - Persist counts to CalendarEvent.VoteCount
    - Clear RecipeVotes table
- [ ] **Update GetScheduleAsync()** to:
    - Include VoteCount from CalendarEvent in response
- [ ] **Run all tests** to verify implementation
- [ ] **Enhance DiscoveryService** (future):
    - Add `weekOffset` parameter to `GetRecipesForDiscoveryAsync()`
    - Filter out recipes with CalendarEvents for the target week
    - Write and run discovery filtering test

---

## Test Execution

### Run Schedule Service Tests

```bash
cd /Users/alex/Code/whats-for-supper/api
dotnet test RecipeApi.Tests/Services/ScheduleServiceTests.cs -v detailed
```

### Run Discovery Service Tests

```bash
dotnet test RecipeApi.Tests/Services/DiscoveryServiceTests.cs -v detailed
```

### Run All Tests

```bash
dotnet test
```

---

## Related Files

- `api/src/RecipeApi/Models/CalendarEvent.cs` - Add VoteCount field
- `api/src/RecipeApi/Dto/ScheduleDays.cs` - Add VoteCount to ScheduleRecipeDto
- `api/src/RecipeApi/Services/ScheduleService.cs` - Modify LockScheduleAsync and GetScheduleAsync
- `api/src/RecipeApi/Services/DiscoveryService.cs` - Enhance filtering (future)
- `api/Migrations/` - Create migration for VoteCount column
