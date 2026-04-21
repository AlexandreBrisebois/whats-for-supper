# Prompt 04: Schedule API Models & DB Context (TDD)

**Context:** Now that we have a mechanism for finding "Matches" (recipes liked by multiple family members), we need the backend foundation for Phase 2: The Weekly Dashboard. This involves tracking where recipes are placed on the family's weekly schedule.

**Goal:** Implement the Schedule models and link them to the recipe/match system.

**Instructions:**

1. **Test First (TDD):**
   - Create `api/src/RecipeApi.Tests/Models/ScheduleTests.cs`.
   - Implement a test that verifies a `ScheduleEntry` can be created for a `Recipe` (including those originating from discovery matches).
   - Verify that the relationship between `ScheduleEntry` and `Recipe` is correctly maintained.

2. **Model Implementation:**
   - Create `api/src/RecipeApi/Models/ScheduleEntry.cs`:
     - `Id` (Guid)
     - `RecipeId` (Guid)
     - `Date` (DateOnly) -- use DateOnly for cleaner calendar logic.
     - `Slot` (Enum: `Breakfast`, `Lunch`, `Supper`).
     - Navigation property to `Recipe`.
   - Create `api/src/RecipeApi/Dto/ScheduleEntryDto.cs` for API consumption.

3. **DbContext Configuration:**
   - Update `api/src/RecipeApi/Data/RecipeDbContext.cs`:
     - Add `DbSet<ScheduleEntry> ScheduleEntries`.
     - Configure relationships.
     - Add indexes for `Date` and `Slot`.

4. **Integration with Matches:**
   - Ensure that the query for "plannable" recipes includes both personal captures and recipes identified by the `vw_RecipeMatches` view created in Prompt 02.

5. **Migration:**
   - Generate migration: `dotnet ef migrations add AddScheduleEntries`.

6. **Verification:**
   - Run `dotnet test api/src/RecipeApi.Tests` and `task build`.
