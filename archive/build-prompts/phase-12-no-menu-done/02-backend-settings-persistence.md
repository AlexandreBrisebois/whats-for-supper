# Build Prompt 02-backend-settings-persistence.md
**Persona**: Sr. .NET Backend Engineer specializing in Vertical Slices.

## Strict Scope
- **TARGET**: 
    - `api/database/schema.sql` (or new migration)
    - `api/src/RecipeApi/Controllers/SettingsController.cs`
    - `api/src/RecipeApi/Services/SettingsService.cs`
- **FORBIDDEN**: 
    - Do not touch `RecipesController` or `ScheduleController`.

## The Seams (Contract)
Match the contract defined in `specs/openapi.yaml`:
- `GET /api/settings/{key}`
- `POST /api/settings/{key}`

## Technical Skeleton
1.  **Database**:
    ```sql
    CREATE TABLE family_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        key text UNIQUE NOT NULL,
        value jsonb NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
    );
    ```
2.  **DTOs**: Create `SettingsDto` matching the OpenAPI schema.
3.  **Controller**: Use standard `SuccessWrappingFilter`.

## Dependency Anchors
- Inject `ApplicationDbContext`.
- Inject `ISettingsService`.

## Execution Limit
Implement ONLY the persistence and API for settings. Do not touch frontend code.

## TDD Protocol
- **Backend**: Implement integration tests (if applicable) or verify via manual CURL/Swagger against the running API.

## Verification Command
```bash
# Check DB connectivity and schema
psql $DATABASE_URL -c "\dt family_settings"
# Test the endpoint (Assuming port 5001)
curl -X GET http://localhost:5001/api/settings/family_goto
```

## Handover Requirement
- Confirmation of table creation.
- Confirmation of endpoint functionality.
- Adherence to Section 2 of AGENT.md.
