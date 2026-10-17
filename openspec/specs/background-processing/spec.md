# Background processing Specification

## Purpose

Expose the persisted lifecycle of accepted background workflows, dependency-based task progression and bounded automatic retries, so callers can distinguish saved work from execution and completion.

## Evidence and qualifications (non-normative)

Promoted under A80 from the reviewed `baseline-background-processing-workflow-lifecycle` delta. BSL-background-processing-001–006 in the [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md) records source identities, complete requirement/scenario mappings and inspected assertion limits. These requirements describe implementation-supported behavior; runtime/database/model qualification remains deferred under A34.

U89–U94 retain definition-error contract disagreement, unqualified concurrency and delivery, separate completion/failure persistence, broad exception heuristics and status-schema/fixture limits. No exactly-once execution, transactional filesystem/database effects, guaranteed delivery, immediate execution, eventual success, complete recovery or automatic issue resolution is established. Promoted recipe-capture and recipe-quality retain acquisition, readiness, failure notifications, contextual re-import and Settings recovery ownership. All prior qualifications, including U01/U75–U88, feature-enabled PDF/U70–U74 and A69, remain with their existing owners. The source change remains active; promotion is documentation only.

## Requirements

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

### Requirement: Apply shared household authentication to generic workflow operations

The five generic workflow operations SHALL require the shared household authentication policy. They SHALL NOT additionally require a selected family-member identity, recipe attribution or an administrative role.

#### Scenario: Authenticated household request
- **WHEN** a household-authenticated caller invokes a generic trigger, instance detail, active list, task diagnostics or task reset operation without selecting a family member
- **THEN** the operation passes the shared access gate without a member or role check

#### Scenario: Unauthenticated request
- **WHEN** a request lacks valid shared household credentials
- **THEN** the workflow action is not authorized and the API returns 401

### Requirement: Bind generic workflow trigger parameters without an API schedule

POST /api/workflows/{workflowId}/trigger SHALL bind a JSON parameters dictionary of string values and pass it to orchestration with no initial schedule argument. Instance and task identity routes SHALL require GUID-shaped path values.

#### Scenario: Trigger dictionary
- **WHEN** a valid JSON parameters dictionary is submitted to a stored workflow
- **THEN** its values reach the promoted acceptance rules and a successful trigger has unscheduled root tasks

#### Scenario: Malformed JSON body
- **WHEN** an authenticated trigger request has malformed JSON or an incompatible parameters value shape
- **THEN** request binding rejects it before orchestration

#### Scenario: Malformed identity route
- **WHEN** an instance-detail, task-diagnostics or task-reset path contains a non-GUID identity
- **THEN** it does not match that GUID-constrained action

### Requirement: List workflow instances by persisted active status

GET /api/workflows/active SHALL return 200 with a data array containing only instances whose stored status is Processing or Paused, ordered by descending updatedAt. Each summary SHALL expose id, workflowId, status, createdAt, updatedAt and taskCount.

#### Scenario: Filter stored parent states
- **WHEN** saved instances have Pending, Processing, Paused, Completed and Failed statuses
- **THEN** only Processing and Paused instances appear, newest updatedAt first

#### Scenario: No active instances
- **WHEN** no instance has a selected active status
- **THEN** the response is 200 with an empty data array

#### Scenario: Summary projection
- **WHEN** an active-list read succeeds
- **THEN** each summary exposes its stored identity, workflow name, PascalCase status and timestamps plus the mapped taskCount field without returning task details

### Requirement: Read stored task diagnostics by task identity

GET /api/workflows/tasks/{taskId}/diagnostics SHALL return stored diagnostics for an existing task with its parent, without requiring Failed status. Successful responses SHALL use 200 data; an absent task SHALL return 404 with message "Task not found.".

#### Scenario: Stored diagnostic fields
- **WHEN** a task with its parent is read successfully
- **THEN** data contains taskId, instanceId, workflowId, taskName, processorName, status, retryCount, errorMessage, stackTrace, createdAt and updatedAt from persistence

#### Scenario: Diagnostics outside failure
- **WHEN** an existing non-Failed task with its parent is read
- **THEN** diagnostics are returned with its stored status and nullable errorMessage and stackTrace

#### Scenario: Missing diagnostic task
- **WHEN** the requested task identity is absent
- **THEN** the API returns 404 with the task-not-found message

### Requirement: Reset an existing task without a failed-state guard

POST /api/workflows/tasks/{taskId}/reset SHALL apply reset to any existing task without testing its current status: set Pending, zero retryCount, schedule at current UTC time and clear errorMessage and stackTrace. After a successful save it SHALL return 200 data.message "Task reset successfully."; an absent task SHALL return 404.

#### Scenario: Reset each stored task state
- **WHEN** an existing Waiting, Pending, Processing, Completed or Failed task is reset and persistence succeeds
- **THEN** that task becomes Pending with retryCount zero, a current UTC schedule and cleared diagnostics

#### Scenario: Reset missing task
- **WHEN** the task identity is absent
- **THEN** the API returns 404 with message "Task not found." and performs no reset save

#### Scenario: Sequential repeated reset
- **WHEN** a task is reset again after a successful reset with no intervening execution
- **THEN** the same identity is reset again with a newly assigned current schedule; no new task or workflow is created

#### Scenario: Reset save fails
- **WHEN** reset persistence raises an unhandled exception
- **THEN** the API does not return its success acknowledgement; no successful persisted reset is inferred

### Requirement: Retain task context and selectively resume a reset parent

Reset SHALL retain task identity, payload, result, dependency names, createdAt and updatedAt, and SHALL NOT reset siblings. A found Paused parent SHALL become Processing in the reset save; other parent states and parent timestamps SHALL remain unchanged. Reset SHALL NOT cancel a running processor or validate dependencies.

#### Scenario: Retained task state
- **WHEN** a task with an existing result, payload, dependencies and timestamps is reset without concurrent mutation
- **THEN** those fields and identities remain unchanged while reset fields change

#### Scenario: Paused parent
- **WHEN** reset finds a Paused parent and its save succeeds
- **THEN** the parent becomes Processing without advancing its updatedAt; sibling task states are retained

#### Scenario: Other parent status
- **WHEN** reset finds a Pending, Processing, Completed or Failed parent
- **THEN** the reset leaves that parent status and timestamps unchanged

#### Scenario: Parent lookup absent
- **WHEN** an existing task has no loaded parent and the parent lookup returns no row
- **THEN** the handler still attempts its task save; successful persistence is subject to the store relationship constraints

#### Scenario: Later dispatch eligibility
- **WHEN** a reset task remains Pending with its current schedule now due
- **THEN** it is eligible for the promoted worker selection regardless of retained dependency names or parent status; execution time and successful recovery are not certified

### Requirement: Attempt stale-task reclamation from the hosted loop

After initialization, the hosted worker SHALL attempt reclamation on its first loop and on later iterations when elapsed UTC time since its last completed reclamation call is strictly greater than five minutes. Reclamation SHALL precede pending-task selection in that iteration and SHALL NOT establish a reclamation deadline.

#### Scenario: Initial loop entry
- **WHEN** initialization succeeds and the uncancelled worker enters its first iteration
- **THEN** it attempts reclamation before pending-task selection

#### Scenario: Periodic invocation
- **WHEN** a later iteration observes more than five minutes since the last reclamation call returned
- **THEN** it calls reclamation and then records the current UTC time for the next interval

#### Scenario: Strict interval
- **WHEN** elapsed time is exactly five minutes at the interval check
- **THEN** the interval predicate does not trigger reclamation in that check

### Requirement: Requeue processing tasks strictly older than the stale cutoff

Reclamation SHALL select Processing tasks with updatedAt strictly earlier than current UTC time minus fifteen minutes. On a successful reclamation save it SHALL set them Pending, increment retryCount, advance updatedAt and replace errorMessage with a reclamation message containing the prior updatedAt in universal sortable form.

#### Scenario: Stale processing task
- **WHEN** reclamation finds a Processing task older than its cutoff and saves successfully
- **THEN** it becomes Pending with retryCount incremented once and errorMessage "Reclaimed by Zombie Reaper (stuck in Processing since <prior updatedAt:u>)"

#### Scenario: Cutoff and status exclusion
- **WHEN** a task equals the cutoff, is newer than it, or is not Processing
- **THEN** that reclamation query does not select it

#### Scenario: Timestamp source
- **WHEN** a Processing task has an old createdAt or scheduledAt but updatedAt is not older than the cutoff
- **THEN** its other timestamps alone do not make it stale

### Requirement: Retain reclamation context without applying retry or parent gates

Reclamation SHALL retain schedule, stackTrace, result, payload, dependencies, createdAt and task identity, and SHALL leave parent status and timestamps unchanged. It SHALL NOT check the automatic retry limit, parent state or processor liveness before requeuing a stale task.

#### Scenario: Retained schedule and diagnostics
- **WHEN** a selected stale task has a future schedule, stack trace and result
- **THEN** successful reclamation retains them; the future schedule still prevents dispatch until due

#### Scenario: Retry allowance exhausted
- **WHEN** a stale Processing task already has retryCount at or above the automatic retry maximum
- **THEN** reclamation increments it and requeues it without applying that maximum

#### Scenario: Parent and dependencies retained
- **WHEN** a stale task belongs to a Paused parent and has dependencies
- **THEN** reclamation leaves the parent and dependencies unchanged; a later due selection uses the promoted Pending-task rules

#### Scenario: Processor still running
- **WHEN** a task is selected as stale while its processor invocation is still running
- **THEN** reclamation does not cancel or coordinate that invocation, and does not establish exclusive execution or which later write wins

### Requirement: Contain reclamation failures at the loop boundary

Reclamation SHALL attempt one save for its selected task mutations, no save when no stale tasks are found, and catch and log query/save failures including cancellation exceptions. A returned failed attempt SHALL still advance the loop reclamation timestamp; it SHALL NOT certify persistence or successful restart.

#### Scenario: No stale tasks
- **WHEN** the reclamation query returns no tasks
- **THEN** no reclamation save is issued

#### Scenario: Query or save failure
- **WHEN** reclamation throws during its query or save
- **THEN** the failure is caught and logged; its return allows the loop to advance the interval timestamp without claiming any task was reclaimed

#### Scenario: Cancellation during reclamation
- **WHEN** a token cancellation causes the reclamation query or save to throw
- **THEN** reclamation catches it; subsequent loop work remains subject to the same cancelled token and outer cancellation handling

### Requirement: Poll pending work with capped idle backoff

After a batch attempt returns a positive selected-task count, the worker SHALL reset idle backoff and wait 500 milliseconds. Empty batches SHALL increase idle backoff from 1000 milliseconds, doubling to a 60000 millisecond cap. These delays SHALL NOT bound task start or completion time.

#### Scenario: Selected batch
- **WHEN** pending processing returns a positive selected count after its awaited attempts
- **THEN** the next normal-loop delay is 500 milliseconds even if a selected task was skipped or failed

#### Scenario: Idle batches
- **WHEN** consecutive iterations return zero selected tasks
- **THEN** delays are 1000, 2000, 4000, 8000, 16000, 32000 and then 60000 milliseconds, remaining capped

#### Scenario: Outer cancellation
- **WHEN** the normal loop delay or pending-work processing propagates an OperationCanceledException
- **THEN** the loop exits rather than treating that exception as a normal new batch

#### Scenario: Other loop error
- **WHEN** the outer loop catches a non-cancellation exception
- **THEN** it logs the error and attempts a token-cancellable 1000 millisecond delay before continuing

### Requirement: Use local processor slots for dispatch

The hosted worker SHALL initialize processor slots from WorkflowThrottle: ExtractRecipe defaults to one slot with maximum one, GenerateHero to two with maximum two, and SyncRecipe to Default, default five. Unrecognized processor names SHALL receive five local slots. Slots SHALL be released after an entered execution attempt.

#### Scenario: Configured common processors
- **WHEN** valid slot configuration is initialized
- **THEN** ExtractRecipe, GenerateHero and SyncRecipe use their configured initial counts and stated local maxima

#### Scenario: Unrecognized processor
- **WHEN** a processor name absent from the initialized entries reaches dispatch
- **THEN** its local slot count is five even when WorkflowThrottle.Default differs

#### Scenario: Slot scope
- **WHEN** dispatch waits for a slot and then runs or fails
- **THEN** the entered slot is released afterward; these per-worker slots do not establish distributed limits or duplicate-execution prevention

### Requirement: Persist returned processor results without clearing prior results on null

When successful completion persistence succeeds, a non-null processor return SHALL replace the stored task result with camelCase JSON. A null return SHALL retain any existing result. This storage rule SHALL NOT add a result field to the approved task-detail wire contract.

#### Scenario: Non-null return
- **WHEN** a processor returns a value and completion saving succeeds
- **THEN** the task result stores its camelCase JSON representation

#### Scenario: Null return with prior result
- **WHEN** a reset or retried task has an old result and its processor returns null normally
- **THEN** successful completion retains that old result rather than clearing it

### Requirement: Start child workflows through shared acceptance

The StartWorkflow processor SHALL require a nonblank workflowId in its JSON payload, pass supplied parameters or an empty dictionary into shared acceptance, and return the child workflow ID, instance ID and resolved schedule. A missing or blank schedule cron SHALL produce no initial child schedule.

#### Scenario: Immediate child acceptance
- **WHEN** a valid StartWorkflow payload omits schedule cron and child acceptance succeeds
- **THEN** a new child instance is persisted through the promoted rules with unscheduled roots and a returned child identity

#### Scenario: Scheduled child acceptance
- **WHEN** a valid payload contains a nonblank cron expression
- **THEN** the resolved next UTC occurrence becomes the child root schedule through shared acceptance

#### Scenario: Invalid launch payload
- **WHEN** StartWorkflow receives missing payload, malformed JSON or a missing or blank workflowId
- **THEN** the attempt throws before child acceptance and follows the promoted worker failure policy

#### Scenario: Independent child lifecycle
- **WHEN** a child is accepted and the launching task later completes
- **THEN** launch completion does not await child completion or establish a persisted parent-child dependency, atomic parent/child saves or deduplication across repeated launch attempts

### Requirement: Resolve child cron schedules against future UTC minutes

Child cron scheduling SHALL resolve a whole ${NAME} or ${NAME:-fallback} expression from nonblank configuration then nonblank fallback, and reject missing values. It SHALL parse five numeric cron fields and select the first matching whole UTC minute strictly after the supplied clock instant, searching no further than five years from its initial cursor.

#### Scenario: Configured expression
- **WHEN** the cron text is a whole configuration expression with a nonblank configured value
- **THEN** the trimmed configured value is used before any fallback

#### Scenario: Fallback or missing configuration
- **WHEN** the whole configuration expression has no nonblank configured value
- **THEN** a nonblank fallback is used, otherwise scheduling throws

#### Scenario: Next matching minute
- **WHEN** a valid cron matches the current minute and a later minute
- **THEN** the search begins at the next whole UTC minute and selects the first later match

#### Scenario: Numeric cron fields
- **WHEN** a valid expression uses comma lists, ascending ranges, wildcards or positive slash steps in minute, hour, day-of-month, month and day-of-week fields
- **THEN** all five fields must match; day-of-week 0 and 7 both identify Sunday

#### Scenario: Invalid or impossible schedule
- **WHEN** an expression has invalid fields or has no matching minute within the search horizon
- **THEN** scheduling throws before child acceptance; no guaranteed recurring workflow is created

### Requirement: Prune only old terminal workflow history

When invoked, workflow-history pruning SHALL select Completed or Failed parents with updatedAt strictly earlier than its clock time minus retentionDays, remove those instances and their tasks on successful persistence, and return pruned instance/task counts. The processor SHALL default retentionDays to seven when absent or a numeric value cannot be read as a 32-bit integer.

#### Scenario: Old terminal history
- **WHEN** pruning is invoked with seven days and old Completed/Failed instances plus recent terminal and old nonterminal instances exist
- **THEN** successful persistence removes only old terminal instances and their tasks and returns their counts

#### Scenario: Strict retention boundary
- **WHEN** an instance updatedAt equals the computed cutoff
- **THEN** it is retained

#### Scenario: Paused failed work
- **WHEN** a task is Failed but its parent is Paused
- **THEN** that parent is retained because pruning uses parent terminal status

#### Scenario: Default and explicit retention
- **WHEN** the processor receives an absent retentionDays or an integer retentionDays in valid JSON
- **THEN** it uses seven for absence and the supplied integer as-is, without a positive-value validation rule

#### Scenario: Pruned identity reread
- **WHEN** an instance and its tasks were successfully pruned
- **THEN** subsequent generic reads for those removed identities return the promoted missing-target outcomes; no history restoration is implied
