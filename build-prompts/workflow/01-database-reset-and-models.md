# Build Prompt 01: Database Reset & Workflow Models

**Persona**: Sr. Backend & Database Engineer
**Goal**: Establish the "Clean Slate" database schema for the General-Purpose Workflow System by resetting EF migrations and introducing the core Workflow models.

## Strict Scope
- **MODIFY**: `api/src/RecipeApi/Data/RecipeDbContext.cs`
- **NEW**: `api/src/RecipeApi/Models/WorkflowInstance.cs`, `api/src/RecipeApi/Models/WorkflowTask.cs`
- **DELETE**: Entire `api/src/RecipeApi/Migrations/` folder.
- **DO NOT TOUCH**: Any logic in `Services/` or `Controllers/` during this task.

## Contract & Decisions
- **Decision: Clean Slate**: We are dropping the legacy `recipe_imports` table. There is no production data; all tables are currently empty.
- **Decision: Reset Migrations**: We must delete the current `Migrations` folder to eliminate schema debt and "ghosts in the machine."

## Requirements
1.  **WorkflowInstance Model**:
    - `Guid Id` (Primary Key)
    - `string WorkflowId` (e.g., "recipe-import")
    - `WorkflowStatus Status` (Enum: Pending, Processing, Completed, Failed, Paused)
    - `string? Parameters` (Store as JSONB in DB)
    - `DateTimeOffset CreatedAt`, `UpdatedAt`
2.  **WorkflowTask Model**:
    - `Guid TaskId` (Primary Key)
    - `Guid InstanceId` (Foreign Key to WorkflowInstance)
    - `string ProcessorName` (e.g., "ExtractRecipe")
    - `string? Payload` (Store as JSONB, contains resolved variables)
    - `TaskStatus Status` (Enum: Waiting, Pending, Processing, Completed, Failed)
    - `string[] DependsOn` (List of Task IDs/Names from the same instance)
    - `int RetryCount` (default 0)
    - `DateTimeOffset? ScheduledAt` (For exponential backoff)
    - `string? ErrorMessage`, `string? StackTrace`
3.  **DbContext Configuration**:
    - Add `DbSet` for both models.
    - Configure `jsonb` column types for `Parameters` and `Payload`.
    - Ensure `Status` enums are stored as integers/shorts.
    - Configure relationship between `Instance` and `Tasks` (Cascade Delete).

## TDD Protocol
1.  Run `dotnet ef migrations add InitialCreate` after resetting the folder.
2.  Apply the migration using `dotnet ef database update`.
3.  Verify the schema in the database (Postgres) using `\dt` or equivalent.

## Mandatory Handover
- Summary of the new schema.
- Confirmation that migrations were successfully reset and applied.
