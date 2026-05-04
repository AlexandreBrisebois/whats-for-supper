# workflow-429-retry Bugfix Design

## Overview

`WorkflowWorker.ProcessTaskAsync` has two catch blocks. When an AI processor throws a 429
rate-limit exception — either as `HttpRequestException` with `StatusCode == TooManyRequests`
or as a Google GenAI SDK exception whose message contains "429" / "high demand" /
"TooManyRequests" — it falls into the generic `catch (Exception ex)` block, which marks the
task `Failed` and the workflow instance `Paused`. This is wrong: a 429 is transient and
recoverable.

The fix is a single additional catch block (or a guard) inserted between the existing
`TransientWorkflowException` catch and the generic `Exception` catch. It detects 429-like
exceptions and routes them through the same retry path already used for
`TransientWorkflowException`. No changes to processors, no new abstractions beyond what is
strictly necessary.

---

## Glossary

- **Bug_Condition (C)**: An exception thrown by a processor that indicates HTTP 429 rate-limiting — either `HttpRequestException` with `StatusCode == HttpStatusCode.TooManyRequests`, or any exception whose `Message` contains "429", "high demand", or "TooManyRequests".
- **Property (P)**: When C holds and retries remain, the task SHALL be rescheduled as `Pending` with `RetryCount` incremented and `ScheduledAt = now + 2^RetryCount minutes`.
- **Preservation**: All behaviors that must remain unchanged — non-429 exceptions still fail immediately, `TransientWorkflowException` retry path is unaffected, successful completions are unaffected.
- **`ProcessTaskAsync`**: The method in `api/src/RecipeApi/Services/WorkflowWorker.cs` that executes a single workflow task and handles its outcome.
- **`_maxRetries`**: The configured retry budget (default 3). When `task.RetryCount >= _maxRetries`, even transient errors are treated as fatal.
- **`isBugCondition`**: Pseudocode predicate that identifies whether a thrown exception is a 429-indicator.

---

## Bug Details

### Bug Condition

The bug manifests when a processor throws a 429-indicating exception and the task still has
retries remaining. `ProcessTaskAsync` does not recognise these exceptions as transient, so
they bypass the `TransientWorkflowException` catch block and land in the generic
`catch (Exception ex)` block, which permanently fails the task.

**Formal Specification:**
```
FUNCTION isBugCondition(ex)
  INPUT: ex of type Exception
  OUTPUT: boolean

  IF ex IS HttpRequestException
    AND ex.StatusCode == HttpStatusCode.TooManyRequests
    RETURN true
  END IF

  IF ex.Message CONTAINS "429"
     OR ex.Message CONTAINS "high demand"
     OR ex.Message CONTAINS "TooManyRequests"
    RETURN true
  END IF

  RETURN false
END FUNCTION
```

### Examples

- **HttpRequestException 429, retries remaining**: Processor throws `new HttpRequestException("Rate limited", null, HttpStatusCode.TooManyRequests)` with `RetryCount = 0`. Expected: task rescheduled `Pending`, `RetryCount = 1`, `ScheduledAt ≈ now + 2 min`. Actual (bug): task marked `Failed`, instance `Paused`.
- **Google GenAI SDK exception, retries remaining**: Processor throws `new Exception("This model is currently experiencing high demand")` with `RetryCount = 1`. Expected: task rescheduled `Pending`, `RetryCount = 2`, `ScheduledAt ≈ now + 4 min`. Actual (bug): task marked `Failed`, instance `Paused`.
- **429 exception, retries exhausted**: Processor throws `HttpRequestException(TooManyRequests)` with `RetryCount = 3` (= `_maxRetries`). Expected: task marked `Failed`, instance `Paused` — same as any exhausted transient error.
- **Non-429 exception**: Processor throws `DivideByZeroException`. Expected (unchanged): task marked `Failed` immediately, instance `Paused`.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Non-429 exceptions (e.g., `DivideByZeroException`, `ArgumentException`, `InvalidOperationException`) MUST continue to mark the task `Failed` immediately and set the instance to `Paused`, without retrying.
- `TransientWorkflowException` retry path MUST remain exactly as-is — same status transitions, same backoff formula, same retry budget check.
- Successful task completion MUST continue to mark the task `Completed`, promote dependent tasks, and complete the workflow instance when all tasks are done.
- When a 429 retry is scheduled, the backoff formula MUST be identical to the `TransientWorkflowException` formula: `ScheduledAt = now + 2^RetryCount minutes`.

**Scope:**
All inputs that do NOT satisfy `isBugCondition(ex)` must be completely unaffected by this fix. This includes:
- All non-429 exceptions
- `TransientWorkflowException` (already handled before the new block)
- `OperationCanceledException` (already handled by the outer loop)
- Successful processor executions

**Note on Retry-After (Requirement 2.1 — Deferred):**
`HttpRequestException` does not carry response headers; the `Retry-After` value is only
available on the `HttpResponseMessage`, which is not surfaced by the exception. Requirement
2.1 (honour `Retry-After`) is therefore deferred. The fix falls back to exponential backoff
for all 429 cases, satisfying requirement 2.2 and 2.3. If a future SDK surfaces the header
through the exception, the backoff formula can be updated in one place.

---

## Hypothesized Root Cause

The root cause is straightforward and confirmed by reading the code:

1. **Missing catch clause for 429-like exceptions**: `ProcessTaskAsync` has exactly two catch blocks — `catch (TransientWorkflowException ex) when (task.RetryCount < _maxRetries)` and `catch (Exception ex)`. There is no clause that recognises `HttpRequestException` with status 429 or message-based 429 indicators. Any exception not matching `TransientWorkflowException` falls into the generic block.

2. **Processors propagate raw SDK exceptions**: `RecipeAgent`, `RecipeHeroAgent`, and `WebAcquisitionAgent` do not wrap 429 errors in `TransientWorkflowException`. This is intentional — the fix belongs in the worker, not the processors.

3. **No wrapping at the `IChatClient` boundary**: The `IChatClient` abstraction (Microsoft.Extensions.AI) surfaces 429s as `HttpRequestException`. The Google GenAI SDK may surface them as a different exception type whose message contains "429" or "high demand". Neither is `TransientWorkflowException`.

---

## Correctness Properties

Property 1: Bug Condition — 429 Exceptions Are Retried

_For any_ exception thrown by a processor where `isBugCondition(ex)` returns `true` AND
`task.RetryCount < _maxRetries`, the fixed `ProcessTaskAsync` SHALL reschedule the task as
`Pending` with `RetryCount` incremented by 1 and `ScheduledAt` set to
`now + 2^RetryCount minutes` (exponential backoff), identical to the `TransientWorkflowException`
retry path.

**Validates: Requirements 2.2, 2.3**

Property 2: Preservation — Non-429 Exceptions Still Fail Immediately

_For any_ exception thrown by a processor where `isBugCondition(ex)` returns `false`, the
fixed `ProcessTaskAsync` SHALL produce exactly the same outcome as the original code: task
status `Failed`, instance status `Paused`, no `RetryCount` increment, no `ScheduledAt` set.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

---

## Fix Implementation

### Changes Required

**File**: `api/src/RecipeApi/Services/WorkflowWorker.cs`

**Method**: `ProcessTaskAsync`

**Specific Changes**:

1. **Add a helper predicate `Is429Exception(Exception ex)`** as a private static method on `WorkflowWorker`. This keeps the catch-block guard readable and the detection logic testable in isolation.

   ```csharp
   private static bool Is429Exception(Exception ex) =>
       ex is HttpRequestException { StatusCode: HttpStatusCode.TooManyRequests }
       || ex.Message.Contains("429", StringComparison.OrdinalIgnoreCase)
       || ex.Message.Contains("high demand", StringComparison.OrdinalIgnoreCase)
       || ex.Message.Contains("TooManyRequests", StringComparison.OrdinalIgnoreCase);
   ```

2. **Insert a new catch block** between the `TransientWorkflowException` catch and the generic `Exception` catch:

   ```csharp
   catch (Exception ex) when (Is429Exception(ex) && task.RetryCount < _maxRetries)
   {
       task.RetryCount++;
       task.Status = TaskStatus.Pending;
       task.ScheduledAt = DateTimeOffset.UtcNow.AddMinutes(Math.Pow(2, task.RetryCount));
       task.ErrorMessage = ex.Message;
       task.UpdatedAt = DateTimeOffset.UtcNow;

       logger.LogWarning(ex,
           "Rate-limit (429) on task {TaskId}, retry {Retry}/{Max}, next at {ScheduledAt}",
           task.TaskId, task.RetryCount, _maxRetries, task.ScheduledAt);

       try
       {
           await db.SaveChangesAsync(ct);
       }
       catch (Exception saveEx)
       {
           logger.LogError(saveEx, "Failed to save 429 retry state for task {TaskId}", task.TaskId);
       }
   }
   ```

3. **Add `using System.Net;`** at the top of `WorkflowWorker.cs` if not already present (needed for `HttpStatusCode`).

The body of the new catch block is intentionally identical to the `TransientWorkflowException`
catch body — same status, same formula, same save pattern. This is not duplication to be
abstracted away; it is the minimal change that satisfies the requirements.

**File**: `api/src/RecipeApi.Tests/Services/WorkflowWorkerTests.cs`

Add tests covering Property 1 (fix checking) and Property 2 (preservation checking) — see Testing Strategy below.

---

## Testing Strategy

### Validation Approach

Two-phase: first confirm the bug exists on unfixed code (exploratory), then verify the fix
and preservation on fixed code.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix.
Confirm the root cause: 429 exceptions land in the generic catch block.

**Test Plan**: Write tests that throw `HttpRequestException(TooManyRequests)` and a
message-based 429 exception from a mock processor, then assert the task ends up `Pending`
(not `Failed`). Run on unfixed code — both tests will fail, confirming the bug.

**Test Cases**:
1. **HttpRequestException 429 retry test**: Throw `new HttpRequestException("Rate limited", null, HttpStatusCode.TooManyRequests)` with `RetryCount = 0`. Assert task is `Pending`, `RetryCount = 1`, `ScheduledAt ≈ now + 2 min`. (Will fail on unfixed code — task will be `Failed`.)
2. **Message-based 429 retry test**: Throw `new Exception("This model is currently experiencing high demand")` with `RetryCount = 0`. Assert task is `Pending`, `RetryCount = 1`. (Will fail on unfixed code.)

**Expected Counterexamples**:
- Task status is `Failed` instead of `Pending`
- Instance status is `Paused` instead of `Processing`
- `RetryCount` is 0 (not incremented)
- Root cause confirmed: no catch block matches 429-like exceptions

### Fix Checking

**Goal**: Verify Property 1 — for all inputs where `isBugCondition` holds and retries remain,
the fixed function produces the correct retry outcome.

**Pseudocode:**
```
FOR ALL ex WHERE isBugCondition(ex) AND task.RetryCount < _maxRetries DO
  result := ProcessTaskAsync_fixed(task, ex)
  ASSERT task.Status == Pending
  ASSERT task.RetryCount == old(task.RetryCount) + 1
  ASSERT task.ScheduledAt ≈ now + 2^task.RetryCount minutes
END FOR
```

**Test Cases**:
1. `Worker_HttpRequestException429_RetriesWithExponentialBackoff` — `HttpRequestException` with `TooManyRequests`, `RetryCount = 0` → `Pending`, `RetryCount = 1`, `ScheduledAt ≈ now + 2 min`.
2. `Worker_HttpRequestException429_SecondRetry_UsesCorrectBackoff` — same exception, `RetryCount = 1` → `RetryCount = 2`, `ScheduledAt ≈ now + 4 min`.
3. `Worker_MessageBased429_HighDemand_Retries` — `Exception("high demand")`, `RetryCount = 0` → `Pending`, `RetryCount = 1`.
4. `Worker_MessageBased429_Numeric_Retries` — `Exception("Error 429: quota exceeded")`, `RetryCount = 0` → `Pending`, `RetryCount = 1`.
5. `Worker_429Exception_ExhaustedRetries_FailsPermanently` — `HttpRequestException(TooManyRequests)`, `RetryCount = 3` (= `_maxRetries`) → `Failed`, instance `Paused`.

**Property-Based Angle**: Tests 1–4 together verify the property: for both `HttpRequestException`
and message-based 429 exceptions, the retry behavior (status, RetryCount increment, backoff
formula) is identical to `TransientWorkflowException` behavior.

### Preservation Checking

**Goal**: Verify Property 2 — for all inputs where `isBugCondition` does NOT hold, the fixed
function produces the same result as the original.

**Pseudocode:**
```
FOR ALL ex WHERE NOT isBugCondition(ex) DO
  ASSERT ProcessTaskAsync_original(task, ex) == ProcessTaskAsync_fixed(task, ex)
END FOR
```

**Test Cases**:
1. `Worker_NonTransient_NonRateLimit_Exception_StillFails` — `DivideByZeroException` → `Failed`, instance `Paused` (existing test `Worker_FatalError_PausesInstance` already covers this; verify it still passes).
2. `Worker_TransientWorkflowException_RetryPath_Unchanged` — `TransientWorkflowException` → `Pending`, `RetryCount = 1` (existing test `Worker_TransientError_RetriesWithExponentialBackoff` covers this; verify it still passes).
3. `Worker_ArgumentException_StillFails` — `ArgumentException("bad input")` whose message does NOT contain "429" or "high demand" → `Failed`, instance `Paused`.

### Unit Tests

- `Worker_HttpRequestException429_RetriesWithExponentialBackoff`
- `Worker_HttpRequestException429_SecondRetry_UsesCorrectBackoff`
- `Worker_MessageBased429_HighDemand_Retries`
- `Worker_MessageBased429_Numeric_Retries`
- `Worker_429Exception_ExhaustedRetries_FailsPermanently`
- `Worker_ArgumentException_StillFails` (preservation)

### Property-Based Tests

- **Property 1 (fix)**: For both `HttpRequestException(TooManyRequests)` and message-based 429 exceptions, the retry outcome (status, RetryCount delta, backoff formula) is identical to the `TransientWorkflowException` outcome. Parameterise over `RetryCount ∈ {0, 1, 2}` and both exception types.
- **Property 2 (preservation)**: For a representative set of non-429 exception types (`DivideByZeroException`, `ArgumentException`, `InvalidOperationException`, `NullReferenceException`), the outcome is always `Failed` + instance `Paused`, regardless of `RetryCount`.

### Integration Tests

- Full workflow run where a processor throws `HttpRequestException(TooManyRequests)` on the first attempt and succeeds on the second — verify the workflow eventually completes.
- Verify that a 429 retry does not promote dependent tasks prematurely (task stays `Pending`, not `Completed`).
