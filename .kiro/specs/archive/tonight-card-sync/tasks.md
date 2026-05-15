# Tasks: Tonight Menu Card Detail Sync

This workstream follows a strict TDD pattern to ensure the `todayStore` correctly hydrates recipe details without manual refreshes.

## Phase 1: Red (Failing Tests)

### Vertical Slice: Optimistic Hydration
- [x] **Task 1.1**: Update `todayStore.test.ts` to mock the recipe details API.
- [x] **Task 1.2**: Add a test case verifying that `assignRecipe` triggers an immediate background fetch for full details.
- [x] **Task 1.3**: Verify the test fails because `assignRecipe` currently only sets minimal info and does not fetch details.

### Vertical Slice: Smart Sync Reconciliation
- [x] **Task 1.4**: Add a test case for `sync()` where an optimistic write is recent (< 2s) but the server response contains a matching recipe ID with fuller details.
- [x] **Task 1.5**: Verify the test fails because `sync()` currently ignores updates during the optimistic window.

## Phase 2: Green (Implementation)

### Vertical Slice: Eager Detail Fetch
- [x] **Task 2.1**: Modify `todayStore.ts` to import `apiClient` or a recipe fetcher.
- [x] **Task 2.2**: Update `assignRecipe` to fetch full details immediately after the optimistic state is set.
- [x] **Task 2.3**: Verify Task 1.1 - 1.3 tests pass.

### Vertical Slice: Detail Reconciliation
- [x] **Task 2.4**: Update the `sync()` function in `todayStore.ts` to allow merging details if the `recipe.id` matches the current `optimistic` state.
- [x] **Task 2.5**: Verify Task 1.4 - 1.5 tests pass.

## Phase 3: Polish & Integrity
- [x] **Task 3.1**: Ensure `applyServerUpdate` (SSE) also respects the same "detail merge" logic if needed.
- [x] **Task 3.2**: Run full unit test suite: `npx vitest src/store/todayStore.test.ts`.
- [x] **Task 3.3**: **E2E Verification (home-goto)**: Update `Confirming GOTO plans the meal` to verify detail hydration on flip.
- [x] **Task 3.4**: **E2E Verification (home-recipe)**: Update `Quick Find...` to verify detail hydration on flip.
- [x] **Task 3.5**: **E2E Verification (home-race)**: Add a test verifying that `sync()` correctly merges details while in the optimistic window.
- [x] **Task 3.6**: Manual verification: Set a recipe for today and flip the card instantly.
