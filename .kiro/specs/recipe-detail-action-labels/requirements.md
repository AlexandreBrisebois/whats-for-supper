# Recipe Detail Action Labels Refresh

## Vision
Standardize and polish the primary and secondary actions in the `RecipeDetailSheet` to improve clarity, accessibility, and design consistency. By aligning labels with the Mère-Designer standard and introducing the high-fidelity `DiscoveryToggleCard`, we ensure a premium, predictable experience for users planning their meals.

## Product Decisions
- **Standardized Labels**: Use sentence-case, high-contrast labels (`Cook This`, `Cook Tonight`, `Plan for Later`, `Plan for {day}`) to reduce cognitive load.
- **Reusable Discovery Toggle**: Extract the `DiscoveryToggleCard` from the Stack Browser to ensure logic and aesthetic parity across the app.
- **Fire and Forget UX**: Actions that assign a recipe (Cook Tonight, Plan for {day}) automatically navigate the user to the Planner to confirm the result.
- **Secondary Action Clean-up**: Relocate `Find Similar` to the bottom action area and use a standard `Search` icon. `Move to Bin` is handled by an external "gear icon" task.

## Acceptance Criteria (AC)

### AC 1: Standardized Primary Labels
- [ ] If no `plannerDayLabel` is provided:
    - Primary button label must be `Cook This`.
    - Pivot option 1 label must be `Cook Tonight`.
    - Pivot option 2 label must be `Plan for Later`.
- [ ] If `plannerDayLabel` is provided:
    - Primary button label must be `Plan for {plannerDayLabel}` (e.g., `Plan for Monday`).

### AC 2: Reusable Discovery Toggle Card
- [ ] Create a reusable `DiscoveryToggleCard` component.
- [ ] It must display "Ask the Family" as the title.
- [ ] It must display "Shows in Discovery voting" as the subtitle.
- [ ] It must include a functional toggle switch (Sage when on, Charcoal/20 when off).
- [ ] It must support optimistic state and an `isUpdating` spinner/loading state.
- [ ] In `RecipeDetailSheet`, this card must replace the old `Show/Hide from Discovery` button.

### AC 3: Find Similar Refresh
- [ ] The `Find Similar` button must use the `lucide-react` `Search` icon.
- [ ] The label must remain `Find Similar`.

### AC 4: Vertical Layout & Thumb Zone
- [ ] Actions must be ordered vertically:
    1. Primary Action / Pivot Options
    2. `Find Similar` (standard button style)
    3. `DiscoveryToggleCard` (large card style)
- [ ] All interactive elements must have clear spacing and be easily reachable in the bottom 40% of the screen.

### AC 5: Navigation Consistency
- [ ] Selecting `Cook Tonight` must assign the recipe to today and navigate to the Planner.
- [ ] Selecting `Plan for {day}` must assign the recipe to the target day and navigate to the Planner.

## Glossary
- **Action Pivot**: The state where the primary "Cook This" button expands into "Cook Tonight" and "Plan for Later".
- **DiscoveryToggleCard**: A large-format interactive card that toggles a recipe's `isDiscoverable` status for family voting.
- **Planner Day Label**: The human-readable name of the target day (e.g., "Monday", "Tomorrow").
