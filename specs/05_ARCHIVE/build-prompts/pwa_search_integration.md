# Build Prompt: PWA Search-to-Planner Integration

## Objective
Connect the Search Library results back to the Weekly Planner to allow adding recipes to specific days.

## Context
Currently, the "Search Library" button in the Planner Pivot navigates to `/recipes`. We need to handle the `addToDay` and `weekOffset` query parameters to allow the user to select a recipe and have it persisted to the schedule.

## Requirements

### 1. Recipe Selection Flow
- In `pwa/src/app/(app)/recipes/page.tsx`:
    - Check for `addToDay` and `weekOffset` in the search params.
    - If present, show an "Add to Plan" button on recipe cards instead of (or in addition to) the standard details link.
- On clicking "Add to Plan":
    - Call the `moveRecipe` or a new `addRecipeToSchedule` API method.
    - Navigate back to `/planner` with the same `weekOffset`.

### 2. State Management
- Ensure the `plannerStore` is updated or the schedule is re-fetched after returning from the search page.

## Verification
- Manual verification: Navigate to Planner -> Wednesday -> Plan a Meal -> Search Library -> Select "Pasta" -> Verify Wednesday now has "Pasta".
- E2E test: Update `planner.spec.ts` to cover this full round-trip flow.
