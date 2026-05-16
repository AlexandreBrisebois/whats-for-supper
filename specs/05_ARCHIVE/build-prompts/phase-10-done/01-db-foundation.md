# Prompt 01: Database & API Foundations (The Seams)

**Persona**: Sr. Backend Architect specializing in PostgreSQL and OpenAPI.

**Context**: 
We are hardening the Planner feature and decommissioning legacy Phase 2 structures. We need to implement the `weekly_plans` table and update `calendar_events` for better consistency.

**TARGET FILES**:
- `api/database/schema.sql`
- `specs/openapi.yaml`
- `api/src/RecipeApi/Data/RecipeDbContext.cs`
- `api/src/RecipeApi/Models/WeeklyPlan.cs` [NEW]
- `api/src/RecipeApi/Models/CalendarEvent.cs`
- `api/src/RecipeApi/Models/ScheduleEntry.cs` [DELETE]

**FORBIDDEN**:
- Do not modify existing `Recipe` or `FamilyMember` logic.

**DECOMMISSIONING (CRITICAL)**:
- **Delete `ScheduleEntry.cs`**: This legacy Phase 2 model is now obsolete. All logic must migrate to `CalendarEvent.cs`.
- **Unique Constraint**: Add a composite `UNIQUE(date, meal_slot)` constraint to `calendar_events` to prevent double-booking.

**TECHNICAL SKELETON**:

1.  **Database (schema.sql)**:
    ```sql
    CREATE TABLE IF NOT EXISTS weekly_plans (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      week_start_date date UNIQUE NOT NULL,
      status smallint NOT NULL DEFAULT 0, -- 0=Draft, 1=VotingOpen, 2=Locked
      notified_at timestamptz,
      grocery_state jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now() NOT NULL
    );
    -- Add constraint to calendar_events
    -- ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_date_slot_unique UNIQUE (date, meal_slot);
    -- Add candidate_ids to calendar_events
    -- ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS candidate_ids uuid[];
    ```

2.  **OpenAPI (openapi.yaml)**:
    - Add `POST /api/schedule/voting/open` (params: `weekOffset`).
    - Add `DELETE /api/schedule/day/{date}/remove`.
    - Update `ScheduleDayDto` to include `status` (int).
    - **REMOVE**: Remove any generic `PUT /api/schedule` or `ScheduleEntry` references.

3.  **C# Models**:
    - `WeeklyPlan`: Map to `weekly_plans` table.
    - `CalendarEvent`: Add `CandidateIds` (Guid[]), update Status enum (0=Planned, 1=Locked, 2=Cooked, 3=Skipped).

**TDD PROTOCOL**:
- Ensure `RecipeDbContext` can successfully query the new table.
- Verify `openapi.yaml` passes linting (`spectral lint specs/openapi.yaml`).

**VERIFICATION**:
- `task migrate`
- `task agent:reconcile`
- **DB Recreation & Restore**: The user will recreate the database. You MUST ensure that the `db-restore` workflow (Management API) is compatible with the new schema and can populate the new tables correctly from existing backup data.

**MICRO-HANDOVER**:
- List applied schema changes.
- Confirm `ScheduleEntry` removal and constraint application.
- Confirm OpenAPI parity.
