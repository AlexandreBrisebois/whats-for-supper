# Build Prompt: Supper Planner Backend Implementation

## Objective
Implement the backend API endpoints for the Supper Planner as defined in [backend-api.spec.md](../02_BACKEND/backend-api.spec.md) and [meal-planning.md](../01_FRONTEND/FEATURES/meal-planning.md).

## Context
The PWA implementation of the Planner is complete and currently relies on a `mock-api.js`. We need to move this logic into the C# `RecipeApi` and PostgreSQL database.

## Requirements

### 1. API Endpoints
Implement the following in `RecipeApi` controllers:
- **GET** `/api/schedule?weekOffset=X`:
    - Calculate start/end dates for the week.
    - Fetch planned meals from the `calendar_events` table.
    - **Current Focus**: Only return 'Supper' slot entries for the 7-day array matching the `ScheduleDay` DTO.
    - Return a 7-day array.
- **POST** `/api/schedule/lock?weekOffset=X`:
    - Set the status of all events for that week to `Locked`.
    - **Side Effect**: Purge all entries from `recipe_votes` for that week.
    - **Side Effect**: Update `last_cooked_date` on the `recipes` table for all planned recipes in that week.
- **POST** `/api/schedule/move`:
    - Payload: `{ weekOffset, fromIndex, toIndex }`.
    - Swap the `recipe_id` between the two slots in `calendar_events`.
- **GET** `/api/schedule/fill-the-gap`:
    - Return 5 recipes from `DiscoveryService` that have high family interest and haven't been cooked recently.

### 2. Service Logic
- Enhance `DiscoveryService.cs` or create a `ScheduleService.cs` to handle the business logic for locking and moving.
- Ensure all responses are wrapped in `{ data: ... }` via the existing `SuccessWrappingFilter`.

## Verification
- Create/Update unit tests for the new service logic.
- Verify that the PWA (running against the real API) correctly renders the data and performs the lockdown actions.
