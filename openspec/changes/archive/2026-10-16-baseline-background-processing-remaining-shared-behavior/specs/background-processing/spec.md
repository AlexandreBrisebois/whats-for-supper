# Background-processing remaining shared behavior delta

## ADDED Requirements

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
