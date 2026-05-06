# Implementation Plan: Workflow Retry Backoff

## Overview

Replace the hardcoded exponential backoff in `WorkflowWorker` with a configurable, schedule-driven system. The implementation follows a contract → tests → implementation order: define the POCO and register it, build the pure `RetryScheduler`, test it exhaustively, then wire it into `WorkflowWorker`.

## Tasks

- [x] 1. Add `WorkflowRetryOptions` POCO and register it in `Program.cs`
  - Create `api/src/RecipeApi/Services/WorkflowRetryOptions.cs` with properties: `RetryScheduleMinutes int[]` (default `[1, 5, 20, 60, 300]`), `MaxRetries int` (default `10`), `QuietWindowStartHour int` (default `1`), `QuietWindowEndHour int` (default `5`)
  - Add `builder.Services.Configure<WorkflowRetryOptions>(builder.Configuration.GetSection("WorkflowRetry"))` to `Program.cs` alongside the other service registrations
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Implement `RetryScheduler`
  - [x] 2.1 Create `api/src/RecipeApi/Services/RetryScheduler.cs`
    - Primary constructor accepts `WorkflowRetryOptions options`
    - Implement `ComputeNextScheduledAt(int retryCount, DateTimeOffset utcNow)`:
      - `index = retryCount - 1`; if `index < RetryScheduleMinutes.Length` return `utcNow + TimeSpan.FromMinutes(RetryScheduleMinutes[index])`
      - Otherwise call `ComputeQuietWindowStart(utcNow)` and return the result
    - Implement private `ComputeQuietWindowStart(DateTimeOffset utcNow)`:
      - Compute `todayWindowStart = utcNow.Date + TimeSpan.FromHours(QuietWindowStartHour)`
      - If `utcNow < todayWindowStart` use today's window start; otherwise use tomorrow's window start
      - Add random jitter in `[0, windowDurationMinutes)` minutes to spread tasks across the window
    - _Requirements: 2.1, 2.2, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.2 Write property test for schedule-index fidelity (Property 1)
    - Add `FsCheck.Xunit` package reference to `RecipeApi.Tests.csproj` (version `3.*`)
    - Create `api/src/RecipeApi.Tests/Services/RetrySchedulerTests.cs`
    - `// Feature: workflow-retry-backoff, Property 1: schedule-index fidelity`
    - For any non-empty `PositiveInt[]` schedule and any `retryCount` in `[1..N]`, `ComputeNextScheduledAt(retryCount, utcNow)` must equal `utcNow.AddMinutes(schedule[retryCount - 1])`
    - Use `[Property(MaxTest = 500)]`
    - _Requirements: 2.5_

  - [x] 2.3 Write property test for future-only quiet-window scheduling (Property 2)
    - In `RetrySchedulerTests.cs`
    - `// Feature: workflow-retry-backoff, Property 2: future-only`
    - For any `DateTimeOffset utcNow`, when `retryCount > RetryScheduleMinutes.Length`, the result must be strictly greater than `utcNow`
    - Use `[Property(MaxTest = 500)]`
    - _Requirements: 3.6_

  - [x] 2.4 Write property test for window-containment (Property 3)
    - In `RetrySchedulerTests.cs`
    - `// Feature: workflow-retry-backoff, Property 3: window-containment`
    - For any `DateTimeOffset utcNow`, the UTC hour of the quiet-window result must satisfy `QuietWindowStartHour ≤ hour < QuietWindowEndHour`
    - Use `[Property(MaxTest = 500)]`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.7_

  - [x] 2.5 Write property test for monotonicity (Property 4)
    - In `RetrySchedulerTests.cs`
    - `// Feature: workflow-retry-backoff, Property 4: monotonicity`
    - For any non-decreasing schedule of length ≥ 2 and any pair of indices `N < M` both within bounds, `ComputeNextScheduledAt(N+1, t) ≤ ComputeNextScheduledAt(M+1, t)`
    - Implement `NonDecreasingScheduleArb` and `IndexPairArb` helpers
    - Use `[Property(MaxTest = 500)]`
    - _Requirements: 4.1_

- [x] 3. Write unit tests for `RetryScheduler` (example-based)
  - In `RetrySchedulerTests.cs`, add `[Fact]`-based tests covering:
    - Each index in the default schedule returns `utcNow + correct minutes` (5 facts, one per index)
    - `retryCount > schedule.Length` falls through to quiet-window path
    - Quiet-window: `utcNow` before window → result is today's window
    - Quiet-window: `utcNow` inside window → result is tomorrow's window
    - Quiet-window: `utcNow` after window → result is tomorrow's window
    - Default `WorkflowRetryOptions` values: `RetryScheduleMinutes = [1,5,20,60,300]`, `MaxRetries = 10`, `QuietWindowStartHour = 1`, `QuietWindowEndHour = 5`
  - _Requirements: 1.3, 1.4, 2.1, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint — run the test suite
  - Ensure all `RetryScheduler` tests pass. Ask the user if questions arise.

- [x] 5. Update `WorkflowWorker` to use `RetryScheduler`
  - [x] 5.1 Inject `IOptions<WorkflowRetryOptions>` via primary constructor in `WorkflowWorker`
    - Add `IOptions<WorkflowRetryOptions> retryOptions` parameter to the primary constructor
    - Remove the `_maxRetries` field; read `MaxRetries` from the resolved options
    - Construct a `RetryScheduler` instance from the resolved options during `InitializeThrottles`
    - On startup, log the loaded schedule and quiet-window boundaries at `Information` level
    - Validate `RetryScheduleMinutes` for monotonicity; log a `Warning` if violated (do not reorder or reject)
    - _Requirements: 1.5, 4.2, 4.3, 5.2, 6.2_

  - [x] 5.2 Unify the two retry catch blocks into one
    - Replace the separate `catch (TransientWorkflowException ...)` and `catch (Exception ex) when (Is429Exception(ex) ...)` blocks with a single unified catch block that handles both
    - Call `_retryScheduler.ComputeNextScheduledAt(task.RetryCount, DateTimeOffset.UtcNow)` to compute `ScheduledAt`
    - Log at `Warning` level with: task ID, processor name, `RetryCount`, `MaxRetries`, failure type (`"transient"` or `"rate-limit"`), and `ScheduledAt`; include `"quiet-window"` label when the schedule is exhausted
    - _Requirements: 2.3, 2.4, 5.1, 5.2_

- [x] 6. Update `appsettings.json` with the full `WorkflowRetry` section
  - Replace the existing `"WorkflowRetry": { "MaxRetries": 3 }` entry with:
    ```json
    "WorkflowRetry": {
        "RetryScheduleMinutes": [1, 5, 20, 60, 300],
        "MaxRetries": 10,
        "QuietWindowStartHour": 1,
        "QuietWindowEndHour": 5
    }
    ```
  - _Requirements: 6.1_

- [x] 7. Update `WorkflowWorkerTests` to assert new schedule values
  - In `Worker_TransientError_RetriesWithExponentialBackoff`:
    - Update the in-memory config to include `RetryScheduleMinutes` matching the default schedule
    - Update the `WorkflowWorker` construction to pass the new `IOptions<WorkflowRetryOptions>` parameter
    - Change the first-retry assertion from `+2 min` to `+1 min` (index 0 of default schedule)
    - Change the second-retry assertion from `+4 min` to `+5 min` (index 1 of default schedule)
    - Rename the test to `Worker_TransientError_RetriesWithConfiguredSchedule` to reflect the new behaviour
  - Update the constructor and any other tests that construct `WorkflowWorker` directly to pass the new options parameter
  - _Requirements: 2.1_

- [x] 8. Integration smoke test
  - [x] 8.1 Add `Worker_429Error_RetriesWithSameScheduleAsTransient` integration test
    - In `WorkflowWorkerTests.cs`, add a test that throws an `HttpRequestException` with status `TooManyRequests` and `RetryCount = 0`
    - Assert: task is `Pending`, `RetryCount = 1`, `ScheduledAt ≈ utcNow + 1 min` (same as transient path)
    - Confirms the unified catch block handles both failure types identically
    - _Requirements: 2.4_

  - [x] 8.2 Add `Worker_ExhaustedRetries_MarksTaskFailed` integration test
    - In `WorkflowWorkerTests.cs`, add a test where `RetryCount` is already at `MaxRetries`
    - Assert: task is `Failed`, instance is `Paused`
    - _Requirements: 2.3_

- [x] 9. Final checkpoint — ensure all tests pass
  - Ensure all tests pass. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests require adding `FsCheck.Xunit` to `RecipeApi.Tests.csproj` — do this in task 2.2
- The `RetryScheduler` is a pure class with no DI dependencies beyond the options; construct it directly in `WorkflowWorker` rather than registering it in the container
- `WorkflowWorker` is a singleton (`AddHostedService`), so `IOptions<WorkflowRetryOptions>` (not `IOptionsSnapshot`) is the correct injection
- The `WorkflowWorkerTests` constructor builds `WorkflowWorker` directly — all tests in that file need updating when the constructor signature changes (task 7)
