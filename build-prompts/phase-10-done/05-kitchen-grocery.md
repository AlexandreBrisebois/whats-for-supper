# Prompt 05: Kitchen & Grocery — High Fidelity Hardening

**Persona**: Full-Stack Engineer specializing in Data Parsing and Offline-First UX.

**Context**:
Finalize the kitchen experience and the grocery checklist. This is the "Utility" phase of the Planner.

**TARGET FILES**:
- `pwa/src/components/planner/CooksMode.tsx`
- `pwa/src/components/planner/GroceryList.tsx`
- `pwa/src/store/plannerStore.ts`
- `api/src/RecipeApi/Services/ScheduleService.cs` (Update Grocery persistence)

**FORBIDDEN**:
- Do not touch Authentication.
- Do not touch the Discovery engine.

**TECHNICAL SKELETON**:

1.  **Cook's Mode Step Parsing**:
    - Extract `recipeInstructions` from `recipe.raw_metadata`.
    - Handle both string arrays and `HowToStep` objects.
    - Implement `cookProgress: Record<string, number>` in Zustand for persistence.
2.  **Aisle-First Grocery Checklist**:
    - Group items by: [Vegetables], [Meat], [Dairy], [Bakery], [Pantry].
    - **Fuzzy Matching**: Use string similarity to map ingredient names (e.g., "Chicken Breast") to sections if an exact match isn't found.
    - Implement toggle: `onToggleItem(ingredientName)`.
    - Persist to `weekly_plans.grocery_state` (JSONB) via API call.

**TDD PROTOCOL**:
- Playwright test: `pwa/e2e/utility-flows.spec.ts`
    - "Cook's mode shows parsed steps".
    - "Grocery checklist persists state across refresh".

**VERIFICATION**:
- `task test:pwa:e2e`

**MICRO-HANDOVER**:
- Confirm step parsing regex/logic.
- Confirm Aisle-First grouping logic.
