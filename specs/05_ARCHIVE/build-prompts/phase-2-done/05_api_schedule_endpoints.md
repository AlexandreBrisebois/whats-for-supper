# Prompt 05: Schedule API Endpoints (TDD)

**Context:** The Schedule Models are in place. Now we need the API endpoints to manage the family's meal schedule, specifically allowing them to plan "Matched" recipes from the discovery pool.

**Goal:** Implement the Schedule service and controller.

**Instructions:**

1. **Test First (TDD):**
   - Create `api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs`.
   - Implement tests for:
     - Fetching schedule for a range (e.g., current week).
     - Upserting a recipe into a slot (handle both update and new insert).
     - Removing a recipe (unscheduling).

2. **Schedule Service:**
   - Create `api/src/RecipeApi/Services/ScheduleService.cs`.
   - Implement `GetScheduleAsync(DateOnly start, DateOnly end)`.
   - Implement `UpsertScheduleEntryAsync(ScheduleEntryDto dto)`.
   - Implement `DeleteScheduleEntryAsync(Guid id)`.

3. **Controller Implementation:**
   - Create `api/src/RecipeApi/Controllers/ScheduleController.cs`.
   - Define:
     - `GET /api/schedule?start={date}&end={date}`
     - `PUT /api/schedule` — for creating/updating entries.
     - `DELETE /api/schedule/{id}`

4. **Match Integration:**
   - Ensure that when a recipe is scheduled, it can be any valid `RecipeId` (including those discovered from the "Matches" pool).

5. **Verification:**
   - Run `dotnet test api/src/RecipeApi.Tests`.
   - Verify the `Program.cs` registration of `ScheduleService`.
