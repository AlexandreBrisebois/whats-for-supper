# Prompt 02: API Logic & ScheduleService Hardening

**Persona**: Sr. .NET Developer specializing in Domain Logic and TDD.

**Context**:
Implement the business logic for family coordination, meal validation, and Management API hardening.

**TARGET FILES**:
- `api/src/RecipeApi/Services/ScheduleService.cs`
- `api/src/RecipeApi/Controllers/ScheduleController.cs`
- `api/src/RecipeApi/Controllers/ManagementController.cs`
- `api/src/RecipeApi/Workflows/db-backup.yaml`
- `api/src/RecipeApi/Workflows/db-restore.yaml`
- `api/tests/RecipeApi.Tests/Services/ScheduleServiceTests.cs`

**FORBIDDEN**:
- Do not touch PWA code.
- Do not touch Authentication middleware.

**DEPENDENCY ANCHORS**:
- Inject `RecipeDbContext` into `ScheduleService`.
- Inject `ILogger<ScheduleService>`.

**MANAGEMENT API HARDENING (CRITICAL)**:
- **Backup Support**: Update the `db-backup` workflow/tasks to include the new `weekly_plans` table and `calendar_events` metadata.
- **Restore Support**: Hardened the `db-restore` logic to be forward-compatible. If restoring from an old backup without `WeeklyPlan` records, it must gracefully initialize them.
- **Migration Path**: Ensure the restore logic can correctly map legacy P2 data to the new `CalendarEvent` structure.

**CORE LOGIC**:
1.  **OpenVotingAsync(int weekOffset)**:
    - Calculate `weekStartDate`.
    - Create/Update `WeeklyPlan` with `status = VotingOpen`.
2.  **ValidateMealAsync(DateOnly date, int status)**:
    - If `status == 2` (Cooked): Update `CalendarEvent.Status = 2`, `Recipe.LastCookedDate = Now`.
    - If `status == 3` (Skipped): Update `CalendarEvent.Status = 3`.
3.  **LockScheduleAsync(int weekOffset)**:
    - Set `WeeklyPlan.status = Locked`.
    - Set all `CalendarEvent.Status = Locked`.
    - **CRITICAL**: Delete ALL records from `recipe_votes` (Global Purge #1).
4.  **MoveScheduleAsync(MoveScheduleDto dto)**:
    - Implement **Swap** logic: If target slot is occupied, swap the recipes.
    - Implement **Push** logic (Intent-based): If intent is "push", find the first empty slot starting at target and move the recipe there, shifting others only if necessary (see Spec 2.6).
5.  **Consensus Purge (Global Purge #2)**:
    - When a specific slot reaches consensus (AwaitingConsensus -> Locked), trigger a purge of votes for that specific `recipe_id`.

**TDD PROTOCOL**:
- Implement `ScheduleServiceTests`:
    - `Should_Open_Voting_And_Create_WeeklyPlan`
    - `Should_Purge_Votes_On_Lock`
    - `Should_Update_LastCookedDate_On_Validation`
    - `Should_Swap_Recipes_When_Moving_To_Occupied_Slot`
    - `Should_Push_Recipe_To_Next_Available_Slot`
- Verify Backup/Restore logic via integration tests or manual workflow triggers.

**VERIFICATION**:
- `dotnet test api/tests/RecipeApi.Tests`
- Trigger `POST /api/management/backup` and `POST /api/management/seed` to verify schema parity.

**MICRO-HANDOVER**:
- Confirm test results.
- Confirm Backup/Restore compatibility with Phase 10 schema.
- Note any deviations in purge logic.
