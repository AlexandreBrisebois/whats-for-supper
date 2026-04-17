# Phase 2: Schedule API Models & DB Context

**Context:** We need to implement the backend foundation for Phase 2: The Weekly Dashboard. This involves tracking where recipes are placed on the family's weekly schedule.

**Constraints:**
- Adhere to the existing Entity Framework configuration patterns out of `api/src/RecipeApi`.
- Keep the DTOs clean and independent from the DB Models.

**Instructions:**
1. Create `api/src/RecipeApi/Models/ScheduleEntry.cs`. It must include:
   - `Id` (Guid)
   - `RecipeId` (Guid)
   - `Date` (DateTimeOffset or DateOnly)
   - `Slot` (Enum: Breakfast, Lunch, Supper)
   - Navigation property to the `Recipe` model.
2. Add `DbSet<ScheduleEntry> ScheduleEntries` to `RecipeDbContext.cs`.
3. Create `api/src/RecipeApi/Dto/ScheduleEntryDto.cs` to map these properties for frontend consumption.
4. Run EF Core migrations to generate a new migration file: `dotnet ef migrations add AddScheduleEntries` (inside the `api/` container or locally if tools match).
5. Verify your changes compile using `task build` from the project root.
