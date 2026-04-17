# Phase 2: Schedule API Endpoints

**Context:** The Schedule Models are in place. Now we need the API endpoints to create, edit, and fetch the family's meal schedule.

**Constraints:**
- The endpoints should be placed in a new `ScheduleController.cs` and business logic inside `ScheduleService.cs`.
- Follow the DI and CQRS-lite patterns already established in `RecipeController.cs`.

**Instructions:**
1. Create `api/src/RecipeApi/Services/ScheduleService.cs`. It needs methods to:
   - Fetch the schedule for a specific date range (e.g., this week).
   - Upsert (Update or Insert) a recipe into a specific date and meal slot (Breakfast, Lunch, Supper).
   - Remove a recipe from a slot.
2. Create `api/src/RecipeApi/Controllers/ScheduleController.cs`. Define endpoints:
   - `GET /api/schedule?start={date}&end={date}`
   - `PATCH /api/schedule` or `PUT /api/schedule` (to move/upsert)
   - `DELETE /api/schedule/{id}`
3. Register the `ScheduleService` in `Program.cs`.
4. Validate changes by running `task build` and `task test:api`.
