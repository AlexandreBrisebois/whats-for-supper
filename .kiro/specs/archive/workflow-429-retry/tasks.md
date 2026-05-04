# Implementation Plan

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - 429 Exceptions Permanently Fail Instead of Retrying
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **GOAL**: Surface counterexamples that demonstrate the bug: 429 exceptions land in the generic `catch (Exception ex)` block and mark the task `Failed` instead of rescheduling it as `Pending`
  - **Scoped PBT Approach**: Scope each property to the concrete failing cases to ensure reproducibility
  - Add to `api/src/RecipeApi.Tests/Services/WorkflowWorkerTests.cs`:
  - `Worker_HttpRequestException429_WithRetriesRemaining_ShouldRetry` — throw `new HttpRequestException("Rate limited", null, HttpStatusCode.TooManyRequests)` with `RetryCount = 0`; assert task is `Pending`, `RetryCount = 1`, `ScheduledAt ≈ now + 2 min`
  - `Worker_MessageBased429_WithRetriesRemaining_ShouldRetry` — throw `new Exception("This model is currently experiencing high demand")` with `RetryCount = 0`; assert task is `Pending`, `RetryCount = 1`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Both tests FAIL (task is `Failed` + instance `Paused` instead of `Pending`) — this is correct and proves the bug exists
  - Document counterexamples: task status is `Failed`, instance is `Paused`, `RetryCount` is 0 (not incremented)
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Apply the fix to `WorkflowWorker.cs`
  - Add `using System.Net;` at the top of `api/src/RecipeApi/Services/WorkflowWorker.cs` if not already present
  - Add private static helper `Is429Exception(Exception ex)` to `WorkflowWorker`:
    ```csharp
    private static bool Is429Exception(Exception ex) =>
        ex is HttpRequestException { StatusCode: HttpStatusCode.TooManyRequests }
        || ex.Message.Contains("429", StringComparison.OrdinalIgnoreCase)
        || ex.Message.Contains("high demand", StringComparison.OrdinalIgnoreCase)
        || ex.Message.Contains("TooManyRequests", StringComparison.OrdinalIgnoreCase);
    ```
  - Insert new catch block in `ProcessTaskAsync` between the `TransientWorkflowException` catch and the generic `Exception` catch:
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
        try { await db.SaveChangesAsync(ct); }
        catch (Exception saveEx) { logger.LogError(saveEx, "Failed to save 429 retry state for task {TaskId}", task.TaskId); }
    }
    ```
  - _Bug_Condition: `isBugCondition(ex)` — `HttpRequestException` with `StatusCode == TooManyRequests`, or `ex.Message` contains "429" / "high demand" / "TooManyRequests"_
  - _Expected_Behavior: task rescheduled as `Pending`, `RetryCount++`, `ScheduledAt = now + 2^RetryCount minutes`_
  - _Preservation: non-429 exceptions and `TransientWorkflowException` paths are completely unaffected_
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 3. Write fix-checking and preservation tests, then verify all tests pass
  - Add to `api/src/RecipeApi.Tests/Services/WorkflowWorkerTests.cs`:
  - **Fix-checking tests** (Property 1: Expected Behavior):
    - `Worker_HttpRequestException429_SecondRetry_UsesCorrectBackoff` — `RetryCount = 1` → `RetryCount = 2`, `ScheduledAt ≈ now + 4 min`
    - `Worker_MessageBased429_Numeric_Retries` — throw `new Exception("Error 429: quota exceeded")` with `RetryCount = 0` → `Pending`, `RetryCount = 1`
    - `Worker_429Exception_ExhaustedRetries_FailsPermanently` — throw `HttpRequestException(TooManyRequests)` with `RetryCount = 3` (= `_maxRetries`) → `Failed`, instance `Paused`
  - **Preservation test** (Property 2: Preservation):
    - `Worker_ArgumentException_StillFails` — throw `new ArgumentException("bad input")` (message does NOT contain "429" or "high demand") → `Failed`, instance `Paused`
  - **Property 1: Expected Behavior** — Re-run `Worker_HttpRequestException429_WithRetriesRemaining_ShouldRetry` and `Worker_MessageBased429_WithRetriesRemaining_ShouldRetry` from task 1; both must now PASS
  - **Property 2: Preservation** — Confirm existing tests `Worker_FatalError_PausesInstance` and `Worker_TransientError_RetriesWithExponentialBackoff` still pass
  - Run `task test` to confirm all tests pass
  - **EXPECTED OUTCOME**: All tests PASS — exploration tests now confirm the fix, preservation tests confirm no regressions
  - _Requirements: 2.2, 2.3, 2.4, 3.1, 3.2_

- [x] 4. Checkpoint — Ensure all tests pass
  - Run `task test` and confirm the full suite is green
  - Ensure all tests pass; ask the user if questions arise
