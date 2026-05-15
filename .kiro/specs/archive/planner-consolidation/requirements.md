# Planner Finalization Consolidation - Requirements

## Vision
Simplify the Planner lifecycle by removing the redundant "Plan Next Week" button and merging its "Commit Suggestions" intelligence into the top-level "Close Voting" action. This ensures that closing voting is a definitive "Lock and Commit" event, reducing UI clutter and manual steps for the user.

## Product Decisions
- **Unified Closure**: "Close Voting" is the single authoritative action for finalizing a week's plan.
- **Implicit Commitment**: When voting is closed, all current consensus suggestions (`_isPending`) are automatically promoted to official assignments.
- **Explicit Context**: Closing voting does NOT trigger automatic navigation or auto-opening of the next week (Solution 1). The user remains on the current week to review the finalized menu.
- **UI Minimalism**: The bottom-of-page CTA block (Button and Status Pill) is removed in favor of the persistent iPad/Mobile top-level action row.

## Acceptance Criteria
1. **AC-1: Suggestion Promotion**: Clicking "Close Voting" MUST iterate through all schedule slots and call `assignRecipeToDay` for any slot containing a pending suggestion (`_isPending: true`) that has a recipe assigned.
2. **AC-2: Atomic Lock**: After suggestions are committed, the schedule MUST be locked via the `lockSchedule` API call.
3. **AC-3: Redundancy Elimination**: The "Plan Next Week" button (`data-testid="finalize-button"`) MUST be removed from `planner/page.tsx`.
4. **AC-4: Status Removal**: The "Menu's In!" pill (`data-testid="finalized-status"`) MUST be removed from `planner/page.tsx`.
5. **AC-5: Verification Parity**: E2E tests MUST be updated to verify the finalized state using the top-level control row (e.g., checking that "Ask the Family" is visible and "Close Voting" is hidden) rather than the removed bottom pill.

## Glossary
- **Pending Suggestion**: A recipe pre-selected by the "Smart Defaults" system based on family votes, but not yet officially assigned to a calendar slot in the database.
- **Locking**: The process of setting a WeeklyPlan's status to `2` (Locked), which prevents further voting and changes.
