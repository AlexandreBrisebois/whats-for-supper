# Tasks: Recipe Detail Action Labels Refresh

## Pre-Build Check
- [ ] **Verify Move to Bin Location**: Confirm that `Move to Bin` has been relocated to the gear icon at the top of the `RecipeDetailSheet`. If not, do not remove the existing button until the gear icon is implemented.

## Wave 1: Reusable Component Extraction
- [x] 1. **Component - Create `DiscoveryToggleCard.tsx`**
    - Extract the toggle logic and JSX from `StackActionBar.tsx`.
    - Props: `isDiscoverable: boolean`, `onToggle: (val: boolean) => Promise<void>`, `isLoading?: boolean`.
    - _Requirements: AC 2_
- [x] 2. **Refactor - Update `StackActionBar.tsx`**
    - Replace the inline toggle code with the new `<DiscoveryToggleCard />`.
    - Verify no regression in Stack Browser behavior.
    - _Requirements: AC 2_

## Wave 2: Label & Icon Refresh
- [x] 3. **RecipeDetailSheet - Update Labels**
    - Update `primaryActionLabel` logic to use `Cook This` and `Plan for {plannerDayLabel}`.
    - Update pivot labels to `Cook Tonight` and `Plan for Later`.
    - _Requirements: AC 1_
- [x] 4. **RecipeDetailSheet - Update Find Similar**
    - Change icon from `ArrowRightLeft` to `Search` (lucide).
    - Ensure button maintains existing `action-find-similar` test ID.
    - _Requirements: AC 3_

## Wave 3: UI Integration & Layout
- [ ] 5. **RecipeDetailSheet - Integrate `DiscoveryToggleCard`**
    - Replace the `Eye` button with the `<DiscoveryToggleCard />`.
    - Connect the `isDiscoverable` state and `handleToggleDiscovery` logic.
    - _Requirements: AC 2, AC 4_
- [ ] 6. **RecipeDetailSheet - Vertical Layout Adjustment**
    - Reorder elements: Primary Zone -> `Find Similar` -> `DiscoveryToggleCard`.
    - Ensure proper vertical spacing (`gap-3` or `gap-4`).
    - _Requirements: AC 4_

## Wave 4: Validation & Navigation
- [ ] 7. **Tests - Update Unit Tests**
    - Modify `RecipeDetailSheet.test.tsx` to assert new labels and component presence.
- [ ] 8. **Tests - E2E Verification**
    - Run `task agent:test:impact` for recipes and planner.
    - Verify `Plan for {day}` navigates correctly.
- [ ] 9. **Final Review**
    - Run `task agent:drift` and `task review`.

## waves
```json
[
  { "id": "wave-1", "tasks": [1, 2] },
  { "id": "wave-2", "tasks": [3, 4] },
  { "id": "wave-3", "tasks": [5, 6] },
  { "id": "wave-4", "tasks": [7, 8, 9] }
]
```
