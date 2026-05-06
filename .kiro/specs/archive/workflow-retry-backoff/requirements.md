# Requirements Document

## Introduction

The `WorkflowWorker` background service currently retries transient failures (AI model overload, HTTP 429 rate-limit) using an aggressive exponential backoff that exhausts all retries within 14 minutes. This is insufficient for AI image-generation workloads where models may be overloaded for hours. This feature replaces the hardcoded retry schedule with a configurable, spread-out schedule that retries over hours and ultimately defers deeply-retried tasks to a quiet overnight window (1 am–5 am UTC) when AI model load is lower and users are unlikely to notice a delay.

## Glossary

- **WorkflowWorker**: The .NET `BackgroundService` that polls for pending `WorkflowTask` rows and executes them via registered `IWorkflowProcessor` implementations.
- **RetryScheduler**: The component (class or static utility) responsible for computing the next `ScheduledAt` timestamp for a retried task.
- **RetrySchedule**: The ordered list of `TimeSpan` offsets applied to successive retry attempts (e.g. +1 min, +5 min, +20 min, …).
- **QuietWindow**: The daily UTC time range reserved for deeply-retried tasks; defaults to 01:00–05:00 UTC.
- **RetryCount**: The zero-based integer stored on `WorkflowTask` that records how many retry attempts have been made.
- **TransientFailure**: Any exception caught by the `TransientWorkflowException` or `Is429Exception` catch blocks in `WorkflowWorker.ProcessTaskAsync`.
- **MaxRetries**: The upper bound on `RetryCount` beyond which a task is marked `Failed` rather than rescheduled.
- **WorkflowRetry**: The `appsettings.json` configuration section that governs retry behaviour.

---

## Requirements

### Requirement 1: Configurable Retry Schedule

**User Story:** As a system operator, I want to configure the retry delay schedule in `appsettings.json`, so that I can tune retry timing without redeploying the application.

#### Acceptance Criteria

1. THE `WorkflowRetry` configuration section SHALL accept a `RetryScheduleMinutes` array of positive integers representing the delay in minutes for each successive retry attempt.
2. THE `WorkflowRetry` configuration section SHALL accept a `MaxRetries` integer that sets the maximum number of retry attempts before a task is permanently failed.
3. WHEN the `RetryScheduleMinutes` array is absent or empty, THE `WorkflowWorker` SHALL apply a default schedule of `[1, 5, 20, 60, 300]` minutes.
4. WHEN `MaxRetries` is absent, THE `WorkflowWorker` SHALL default to `10`.
5. THE `WorkflowWorker` SHALL read the `WorkflowRetry` configuration section at startup and apply it for the lifetime of the process.

---

### Requirement 2: Schedule-Driven Retry Timing

**User Story:** As a developer, I want transient failures to be retried on a spread-out schedule, so that AI model overload conditions have time to resolve before the next attempt.

#### Acceptance Criteria

1. WHEN a `TransientFailure` occurs and `RetryCount` is less than the length of `RetryScheduleMinutes`, THE `RetryScheduler` SHALL set `ScheduledAt` to `UtcNow` plus the delay at index `RetryCount` in `RetryScheduleMinutes`.
2. WHEN a `TransientFailure` occurs and `RetryCount` is greater than or equal to the length of `RetryScheduleMinutes` and less than `MaxRetries`, THE `RetryScheduler` SHALL set `ScheduledAt` to the next available `QuietWindow` start time.
3. WHEN a `TransientFailure` occurs and `RetryCount` is greater than or equal to `MaxRetries`, THE `WorkflowWorker` SHALL mark the task as `Failed` and the workflow instance as `Paused`.
4. THE `RetryScheduler` SHALL apply the same schedule to both `TransientWorkflowException` failures and HTTP 429 / rate-limit failures.
5. FOR ALL valid `RetryScheduleMinutes` arrays, the delay applied at retry index N SHALL equal `RetryScheduleMinutes[N]` minutes when N is within the bounds of the array (schedule-index fidelity property).

---

### Requirement 3: Quiet-Window Scheduling

**User Story:** As a family user, I want deeply-retried tasks to be deferred to overnight hours, so that recipe images are ready by morning without the app appearing broken during the day.

#### Acceptance Criteria

1. THE `WorkflowRetry` configuration section SHALL accept `QuietWindowStartHour` and `QuietWindowEndHour` integers (0–23, UTC) representing the boundaries of the quiet window; defaults are `1` and `5` respectively.
2. WHEN the `RetryScheduler` schedules a task into the `QuietWindow`, THE `RetryScheduler` SHALL set `ScheduledAt` to a `DateTimeOffset` whose UTC time-of-day falls within `[QuietWindowStartHour, QuietWindowEndHour)`.
3. WHEN the current UTC time is before today's `QuietWindowStartHour`, THE `RetryScheduler` SHALL schedule the task in today's quiet window.
4. WHEN the current UTC time is within today's quiet window, THE `RetryScheduler` SHALL schedule the task in tomorrow's quiet window.
5. WHEN the current UTC time is after today's `QuietWindowEndHour`, THE `RetryScheduler` SHALL schedule the task in tomorrow's quiet window.
6. FOR ALL values of `UtcNow`, the `ScheduledAt` produced by quiet-window scheduling SHALL be strictly greater than `UtcNow` (future-only property).
7. FOR ALL values of `UtcNow`, the UTC time-of-day of the quiet-window `ScheduledAt` SHALL satisfy `QuietWindowStartHour ≤ hour < QuietWindowEndHour` (window-containment property).

---

### Requirement 4: Monotonically Non-Decreasing Schedule

**User Story:** As a developer, I want the retry schedule to never schedule a later retry sooner than an earlier one, so that the backoff behaviour is predictable and auditable.

#### Acceptance Criteria

1. FOR ALL consecutive pairs of entries in `RetryScheduleMinutes` at indices N and N+1, the value at N+1 SHALL be greater than or equal to the value at N (monotonicity property).
2. WHEN `WorkflowWorker` loads a `RetryScheduleMinutes` array that violates the monotonicity property, THE `WorkflowWorker` SHALL log a warning and continue using the configured values as-is.
3. THE `RetryScheduler` SHALL NOT reorder or modify the configured `RetryScheduleMinutes` values at runtime.

---

### Requirement 5: Retry Logging and Observability

**User Story:** As a system operator, I want each retry attempt to be logged with its schedule position and next scheduled time, so that I can diagnose stuck workflows without querying the database.

#### Acceptance Criteria

1. WHEN a task is rescheduled after a `TransientFailure`, THE `WorkflowWorker` SHALL log a `Warning`-level message containing: task ID, processor name, `RetryCount`, `MaxRetries`, the failure reason (transient or rate-limit), and the computed `ScheduledAt`.
2. WHEN a task is scheduled into the `QuietWindow`, THE `WorkflowWorker` SHALL include the label `"quiet-window"` in the log message to distinguish it from schedule-driven retries.
3. WHEN a task exceeds `MaxRetries`, THE `WorkflowWorker` SHALL log an `Error`-level message containing: task ID, processor name, final `RetryCount`, and the exception message.

---

### Requirement 6: Default Configuration in appsettings.json

**User Story:** As a developer, I want the new retry configuration to ship with sensible defaults in `appsettings.json`, so that the application works correctly after deployment without manual configuration.

#### Acceptance Criteria

1. THE `appsettings.json` file SHALL contain a `WorkflowRetry` section with `RetryScheduleMinutes` set to `[1, 5, 20, 60, 300]`, `MaxRetries` set to `10`, `QuietWindowStartHour` set to `1`, and `QuietWindowEndHour` set to `5`.
2. WHEN the application starts with the default configuration, THE `WorkflowWorker` SHALL log the loaded retry schedule and quiet-window boundaries at `Information` level.
