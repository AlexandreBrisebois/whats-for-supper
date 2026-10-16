# Spec Delta

## Purpose

Expose the persisted lifecycle of accepted background workflows, dependency-based task progression and bounded automatic retries, so callers can distinguish saved work from execution and completion.

## ADDED Requirements

### Requirement: Validate workflow definitions before accepting work

A trigger SHALL load the named stored workflow definition and reject an unavailable definition, missing task dependency, dependency cycle or undeclared top-level string-payload placeholder before persisting a new instance. This rule SHALL NOT assign HTTP error codes to rejected definitions.

#### Scenario: Definition unavailable
- **WHEN** the named stored definition cannot be loaded
- **THEN** the trigger fails without creating an instance through that trigger

#### Scenario: Invalid dependency graph
- **WHEN** a task references an absent dependency or the definition contains a dependency cycle
- **THEN** validation rejects the definition before instance persistence

#### Scenario: Undeclared payload parameter
- **WHEN** a top-level string payload references a parameter absent from the definition
- **THEN** validation rejects the definition

### Requirement: Capture supplied parameters at acceptance

A trigger SHALL require the presence of every required parameter key and snapshot supplied parameters into the instance and task payloads. Missing optional parameters SHALL omit top-level string payload entries referencing them. Required-key presence SHALL NOT imply nonblank value validation.

#### Scenario: Required key absent
- **WHEN** a declared required key is absent
- **THEN** the trigger rejects before saving an instance

#### Scenario: Optional snapshot supplied
- **WHEN** optional feedback parameters are supplied and the caller later changes its dictionary
- **THEN** the saved task payload retains the values captured at triggering

#### Scenario: Optional snapshot absent
- **WHEN** an optional parameter is absent
- **THEN** top-level string payload entries referencing that parameter are omitted

#### Scenario: Scalar substitution
- **WHEN** a top-level string payload becomes a parseable Boolean or signed 64-bit integer after substitution
- **THEN** the saved payload uses that scalar type; other substituted strings remain strings

### Requirement: Persist initial workflow and task identities before returning

Successful orchestration acceptance SHALL return a new workflow-instance identity only after initial instance and task persistence commits. The instance SHALL be Pending; roots SHALL be Pending and dependency-bearing tasks Waiting, each with its own task identity and dependency names. Acceptance SHALL NOT certify execution or completion.

#### Scenario: Accept a dependency workflow
- **WHEN** a valid trigger with a root and dependent task commits successfully
- **THEN** the returned instance identity addresses the saved Pending instance, with the root Pending and the dependent Waiting

#### Scenario: API acceptance identity
- **WHEN** POST /api/workflows/{workflowId}/trigger successfully accepts a valid trigger
- **THEN** 202 data.instanceId identifies the persisted workflow instance without certifying task execution

#### Scenario: Persistence fails
- **WHEN** initial workflow persistence fails before commit
- **THEN** orchestration does not return successful acceptance and attempts transaction rollback

### Requirement: Apply initial schedules to root tasks

A supplied initial schedule SHALL apply to every root Pending task and leave dependent Waiting tasks unscheduled. With no supplied schedule, roots SHALL remain unscheduled. A schedule SHALL establish earliest eligibility rather than an execution deadline.

#### Scenario: Scheduled roots
- **WHEN** a trigger supplies a future schedule for two roots and a dependent
- **THEN** both roots retain that schedule and the dependent has no schedule

#### Scenario: No initial schedule
- **WHEN** a trigger omits the schedule
- **THEN** its roots have no scheduled time

### Requirement: Select due pending tasks for processor dispatch

Worker selection SHALL consider Pending tasks whose schedule is absent or due, select at most ten per batch ordered by scheduled time, and dispatch selected work subject to its processor throttle. A task rescheduled into the future while awaiting its slot SHALL be skipped on reload. Selection SHALL NOT promise immediate execution or exclusive delivery.

#### Scenario: Due and future work coexist
- **WHEN** Pending tasks have absent, past and future scheduled times
- **THEN** selection admits absent or due schedules and excludes future schedules

#### Scenario: Throttle wait changes eligibility
- **WHEN** a selected task is rescheduled into the future before its processor slot becomes available
- **THEN** the reloaded task is skipped without processor execution in that attempt

### Requirement: Record processor execution and successful task completion

Before dispatch, a task SHALL be saved as Processing with its prior error and stack trace cleared. Dispatch SHALL use the registered processor matching its processor name. A normally returning processor SHALL be recorded Completed when completion persistence succeeds; an absent matching processor SHALL enter failure handling. Completion SHALL NOT certify domain success beyond that processor return.

#### Scenario: Processor returns normally
- **WHEN** the matching processor returns without an exception and completion persistence succeeds
- **THEN** the task is saved Completed

#### Scenario: Processor unavailable
- **WHEN** no registered processor matches the selected task's processor name
- **THEN** the attempt enters failure handling rather than completing successfully

#### Scenario: Retry begins execution
- **WHEN** a due retry reaches dispatch and its Processing save succeeds
- **THEN** prior error and stack trace are cleared for that attempt while its retry count is retained

### Requirement: Promote dependencies after successful task completion

On successful reconciliation after a task completes, Waiting tasks SHALL become Pending only when all their named dependencies are recorded Completed. Promotion SHALL NOT execute a dependent in the already selected batch solely because it was promoted.

#### Scenario: Linear dependency completes
- **WHEN** A completes while B waits on A and C waits on B
- **THEN** B becomes Pending and C remains Waiting until B completes

#### Scenario: Multiple prerequisites
- **WHEN** a dependent waits on two tasks and only one is Completed
- **THEN** it remains Waiting until both are Completed

### Requirement: Derive completion from remaining task states

On successful completion reconciliation, an instance with no Waiting, Pending or Processing tasks SHALL become Completed if no task is Failed, or Failed if any task is Failed, unless the instance is Paused. Active tasks SHALL prevent this completion update. Paused status SHALL be retained by reconciliation.

#### Scenario: All tasks complete
- **WHEN** completion reconciliation succeeds with every task Completed and the instance not Paused
- **THEN** the instance becomes Completed

#### Scenario: Partial completion
- **WHEN** one task completes but another remains Waiting, Pending or Processing
- **THEN** reconciliation does not mark the instance Completed

#### Scenario: Failed sibling without active tasks
- **WHEN** successful reconciliation finds a Failed sibling, no active tasks and an instance that is not Paused
- **THEN** the instance becomes Failed

#### Scenario: Paused instance reconciles
- **WHEN** completion reconciliation observes an already Paused instance
- **THEN** it does not replace that instance status

### Requirement: Classify automatic retry eligibility at the attempt boundary

Automatic retries SHALL require remaining retry allowance and either an explicit transient workflow exception, a recognized transient provider/network/timeout exception, or a recognized rate-limit message. Otherwise the attempt SHALL enter terminal failure handling. Classification SHALL concern the caught exception rather than an inferred diagnosis.

#### Scenario: Recognized transient failure
- **WHEN** the caught exception is an explicit transient workflow exception or a recognized transient exception and retryCount is below the limit
- **THEN** automatic retry handling is selected

#### Scenario: Transient provider and network statuses
- **WHEN** the caught provider exception has status 429 or 503, or an HTTP request exception has status 408, 429, 503 or 504, with retry allowance remaining
- **THEN** automatic retry handling is selected

#### Scenario: Timeout and message heuristics
- **WHEN** retry allowance remains and the caught exception is a timeout, a task-cancellation exception whose inner exception is a timeout or whose message contains `timeout` or `canceled`, or an exception whose message contains `<!DOCTYPE html>`, without regard to case
- **THEN** automatic retry handling is selected without requiring a provider status

#### Scenario: Recognized rate limit
- **WHEN** HTTP status is 429 or the exception message contains 429, high demand or TooManyRequests without regard to case, and retry allowance remains
- **THEN** automatic retry handling is selected

#### Scenario: Unclassified failure
- **WHEN** an ordinary argument or calculation exception lacks recognized transient or rate-limit signals
- **THEN** terminal failure handling is selected without incrementing the retry count

### Requirement: Persist retries on the existing task

When automatic retry persistence succeeds, the task SHALL retain its identity, increment retryCount once, become Pending and store its next scheduled time and caught error message. Retry scheduling SHALL NOT itself promote dependencies, complete the task or certify recovery.

#### Scenario: First transient retry persists
- **WHEN** a task with retryCount zero encounters an eligible transient failure and its retry save succeeds
- **THEN** that task is Pending with retryCount one, its error message and computed schedule

#### Scenario: Retry allowance exhausted
- **WHEN** a retryable failure occurs when retryCount has reached the configured maximum
- **THEN** terminal failure handling occurs without scheduling another automatic retry or incrementing retryCount

### Requirement: Schedule automatic retries using configured delays and UTC windows

For positive incremented retry counts within the configured delay list, the next attempt SHALL be scheduled relative to failure-handling time using the corresponding delay. Later retries SHALL use a randomized minute in the next window whose configured UTC start is strictly later than scheduling time. Defaults SHALL be 1, 5, 20, 60 and 300 minutes, ten retries and a 01:00–05:00 UTC window.

#### Scenario: Configured delay sequence
- **WHEN** default scheduling handles retry counts one through five
- **THEN** delays are respectively one, five, twenty, sixty and three hundred minutes from the supplied current time

#### Scenario: Before quiet window start
- **WHEN** a later retry is scheduled before that UTC day's configured window start
- **THEN** its scheduled time falls within that day's quiet window

#### Scenario: At or after quiet window start
- **WHEN** a later retry is scheduled at or after that UTC day's configured window start, including while inside the window
- **THEN** its scheduled time falls within the following day's quiet window

### Requirement: Stagger other pending work after recognized rate limiting

After a recognized rate-limit failure saves its own retry, successful proactive rescheduling SHALL move other Pending tasks with the same processor name to successive one-minute slots following that retry. Failure of this secondary save SHALL NOT undo the already saved primary retry.

#### Scenario: Same processor pending work
- **WHEN** a recognized rate-limit retry is saved and proactive rescheduling succeeds
- **THEN** other Pending tasks of that processor receive successive schedules starting one minute after that retry

#### Scenario: Secondary rescheduling fails
- **WHEN** primary retry persistence succeeds but proactive rescheduling fails
- **THEN** the primary retry remains saved without a claim that sibling rescheduling succeeded

### Requirement: Retain terminal task failure and pause its workflow

When terminal task failure persistence succeeds, the task SHALL be Failed with a mapped error message and available exception stack trace. A subsequent successful parent update SHALL set the instance Paused. These saves SHALL NOT imply rollback of previously completed tasks or processor side effects, nor successful persistence of both states if a later save fails.

#### Scenario: Fatal attempt and pause persist
- **WHEN** a nonretryable or exhausted failure saves its task diagnostics and parent update successfully
- **THEN** the task is Failed and the instance Paused

#### Scenario: Parent update fails after task save
- **WHEN** the Failed task save succeeds but pausing the parent fails
- **THEN** the saved Failed task remains without an assertion that the parent is Paused

#### Scenario: Earlier work already completed
- **WHEN** a later task fails after an earlier task completed
- **THEN** the earlier Completed task is not reset by terminal failure handling and its side effects are not automatically undone

### Requirement: Read stored lifecycle state by instance identity

A subsequent successful instance-detail read SHALL report stored instance and task status names with their identity, parameters, dependency names, retry counts, schedules, error messages and timestamps. An absent instance SHALL return 404. Reads SHALL preserve the distinction between instance state and task state rather than infer execution or success from acceptance.

#### Scenario: Read accepted work
- **WHEN** GET /api/workflows/instances/{instanceId} succeeds after orchestration acceptance and before any task executes
- **THEN** 200 data contains the Pending instance and its saved task states

#### Scenario: Read scheduled retry
- **WHEN** a successful read follows retry persistence with no intervening execution
- **THEN** the task is Pending with its saved retryCount, scheduledAt and errorMessage

#### Scenario: Read terminal partial work
- **WHEN** a successful read follows persisted task failure and pause with some other tasks already Completed or still Waiting
- **THEN** the response reports Paused for the instance and the distinct stored task statuses using PascalCase enum names, such as Failed, Completed and Waiting

#### Scenario: Read missing instance
- **WHEN** GET /api/workflows/instances/{instanceId} identifies no saved instance
- **THEN** the API returns 404