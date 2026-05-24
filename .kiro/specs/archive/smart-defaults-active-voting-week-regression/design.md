# Design: Smart Defaults On Active Voting Week (Regression Fix)

## Scope
Fix planner-store week selection logic so smart defaults load for whichever week is actively open for voting.

## Contract Integrity
No OpenAPI changes.
- `GET /api/schedule?weekOffset={W}`
- `GET /api/schedule/{W}/smart-defaults`

The contract already accepts `weekOffset` as a path parameter for smart defaults. Regression is client-side gating.

## Vertical Trace (As-Is -> To-Be)
1. Discovery voting updates vote counts and consensus state (existing behavior).
2. Planner page calls week store for a selected week `W`.
3. Week store loads schedule for `W`.
4. If `status === 1`, week store must load smart defaults for `W`.
5. `buildScheduleDays` merges pending suggestions into open slots for `W`.

## Failure Point
In `pwa/src/store/weekStore.ts`, smart-default fetches are gated/hardcoded with week `0` in multiple paths:
1. `init(weekOffset)` currently checks `weekOffset === 0 && status === 1`.
2. `openVoting()` currently fetches `getSchedule(0)` and `getSmartDefaults(0)`.
3. `sync()` currently fetches `getSmartDefaults(0)` when status is voting open.

This creates a week mismatch whenever voting is active on non-zero week offsets.

## Minimal Design Change
1. Replace literal/hardcoded `0` with effective current week offset `W`.
2. Replace `weekOffset === 0` gating with status-based gating (`status === 1`).
3. Keep merge semantics unchanged (`buildScheduleDays` remains source of truth).
4. Keep SSE handlers unchanged (already week-agnostic at payload level).

## State Ownership
- Owner: `useWeekStore` (`pwa/src/store/weekStore.ts`).
- Derived rule: smart defaults should be requested when current schedule status is voting open.
- No new store fields introduced.

## Test Strategy (Red -> Green)

### Unit (Primary Regression Guard)
File: `pwa/src/store/weekStore.test.ts`
1. `init(1)` with mocked `getSchedule(1).status=1` must call `getSmartDefaults(1)`.
2. `init(1)` with status `0` or `2` must not call `getSmartDefaults`.
3. `openVoting()` when `get().weekOffset=1` must call `getSchedule(1)` and `getSmartDefaults(1)`.
4. `sync()` when `get().weekOffset=1` and schedule status `1` must call `getSmartDefaults(1)`.
5. Negative guard: none of these paths call `getSmartDefaults(0)` unless current week is actually `0`.

### Integration (Optional but Recommended)
File: `api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs`
1. Add/confirm an integration test that `GetSmartDefaultsAsync(weekOffset)` returns week-bounded open slots for non-zero week offsets.
2. This protects against accidental backend week-boundary drift even though current bug is frontend.

### E2E (Behavioral User-Facing Guard)
File: `pwa/e2e/planner-smart-defaults-week-offset.spec.ts` (new) or existing planner voting spec.
1. Freeze time to Monday (`page.clock.setFixedTime`) per repo deterministic strategy.
2. Mock schedule for `weekOffset=1` with `status=1` and smart-default payload containing at least one voted recipe.
3. Navigate planner to next week via `data-testid="next-week"`.
4. Assert voted pending card signal is visible (e.g., `data-testid="vote-count"` with expected count, on week 1).
5. Assert no fallback-to-week-0 artifact appears.

## Data-TestID Index
No new UI test IDs required. Use existing:
1. `next-week`
2. `vote-count`
3. `week-range`
4. `planner-tab`

## Non-Goals
1. Voting model redesign.
2. Smart-default ranking algorithm changes.
3. Discovery page filtering changes.
4. Contract/schema migration.
