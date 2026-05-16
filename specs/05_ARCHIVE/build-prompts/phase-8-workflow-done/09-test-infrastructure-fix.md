# Build Prompt 09: Workflow Tests - Fix In-Memory Database Context Sharing

**Persona**: Sr. Systems Engineer / Test Infrastructure Specialist  
**Goal**: Fix EF Core in-memory database context lifecycle issues preventing WorkflowWorker tests from executing tasks.

---

## Root Cause Analysis

The workflow implementation (binary retry strategy) is **correct and compiles without errors**. Tests fail because:

1. **Worker.ProcessPendingTasksAsync()** creates a new scope and gets a fresh `RecipeDbContext`
2. Test's `_db` context (different instance) inserts tasks
3. Fresh context in worker's scope cannot see test-inserted data despite same in-memory DB name
4. **Result**: Tasks remain Pending (never processed) instead of being marked Completed/Failed

**Evidence**: 
- All existing tests fail with "Expected: Completed, Actual: Pending"
- Task exists in DB (assertions pass before ProcessPendingTasksAsync)
- Worker never executes processor (RetryCount stays 0, no error message captured)

---

## Strict Scope

**MODIFY**:
- `api/src/RecipeApi.Tests/Services/WorkflowWorkerTests.cs` — Fix context lifecycle

**TARGET TESTS** (currently failing):
- Line 90: `Worker_PicksUpPendingTasks_WhenScheduled`
- Line 278: `Worker_TransientError_RetriesWithExponentialBackoff`  
- Line 434: `Worker_FatalError_PausesInstance`

**FORBIDDEN** (do not touch):
- `api/src/RecipeApi/Services/WorkflowWorker.cs` — logic is correct, do NOT refactor
- `api/appsettings.json` — config is correct
- `api/src/RecipeApi/Workflow/Exceptions/*` — exception classes are correct

---

## Root Cause Hypothesis (Pick One)

### Option A: DbContext Scope Isolation
The in-memory database is NOT being shared across scopes due to EF Core's context instance isolation. **Fix**: Ensure all DbContext instances within a test use the same underlying in-memory database.

**Evidence pointing here**: Different scopes getting different "views" of the same in-memory DB.

### Option B: Task.Delay / Background Service Timing
The `await _worker.StartAsync(_cts.Token)` at line 127 does NOT guarantee `InitializeThrottles` has completed before line 139's `ProcessPendingTasksAsync` is called. **Fix**: Explicitly wait for initialization.

**Evidence pointing here**: Worker initialization may fail silently, causing ProcessPendingTasks to skip all work.

### Option C: Processor Registration Across Scopes
The `MockWorkflowProcessor` registered at line 47-49 is factory-bound to a shared list (`_executedProcessorNames`). When a new scope is created inside `ProcessTaskAsync` (line 215), the processor may not resolve correctly. **Fix**: Ensure processor resolution works across scopes.

---

## Diagnostic Test (Run First)

Add this minimal test to **isolate the issue**:

```csharp
[Fact]
public async Task Diagnostic_CanQueryTaskFromDifferentDbContextInSameScope()
{
    // Arrange: Insert via _db
    var now = DateTimeOffset.UtcNow;
    var instance = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "test", Status = WorkflowStatus.Processing };
    var task = new WorkflowTask
    {
        TaskId = Guid.NewGuid(),
        InstanceId = instance.Id,
        ProcessorName = "ExtractRecipe",
        Status = TaskStatus.Pending,
        ScheduledAt = now.AddSeconds(-1),
        Instance = instance
    };
    _db.WorkflowInstances.Add(instance);
    _db.WorkflowTasks.Add(task);
    await _db.SaveChangesAsync();

    // Act: Query via fresh scope (simulate ProcessPendingTasks)
    using var scope = _serviceProvider.CreateScope();
    var freshDb = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
    var found = await freshDb.WorkflowTasks
        .FirstOrDefaultAsync(t => t.Status == TaskStatus.Pending && t.ScheduledAt <= now);

    // Assert: Should find the task
    Assert.NotNull(found);
    Assert.Equal(task.TaskId, found.TaskId);
}
```

**Run this first**: If it fails, issue is **Option A (scope isolation)**. If it passes, issue is **Option B or C**.

---

## Fix Strategy (TDD Protocol)

### 1. Run Diagnostic Test
```bash
cd api
dotnet test src/RecipeApi.Tests/RecipeApi.Tests.csproj --filter "Diagnostic_CanQueryTaskFromDifferentDbContextInSameScope" -v normal
```

### 2. Based on Result:

**If Diagnostic Fails (Scope Isolation Issue)**:
- Check if `UseInMemoryDatabase` is being called multiple times with different database names
- Verify that all DbContext registrations use the same database name: `$"WorkflowWorkerTest_{Guid.NewGuid():N}"`
- **Problem**: Each test likely gets a unique GUID, creating separate databases per test
- **Fix**: Use a **shared, static database name** per test class instance, or ensure the `_db` and worker's scope share the same database instance

**If Diagnostic Passes (Initialization/Resolution Issue)**:
- Add explicit wait for `_initialized = true` before calling `ProcessPendingTasksAsync`
- Verify processors are available in worker's execution scope via logging

### 3. Implement & Verify

Run affected tests one by one:
```bash
dotnet test src/RecipeApi.Tests/RecipeApi.Tests.csproj \
  --filter "Worker_PicksUpPendingTasks_WhenScheduled" -v normal
```

All three target tests must **PASS** with:
- Task status = `Completed`
- RetryCount = 0 (for successful execution)
- No errors logged

---

## Verification Command

```bash
cd /Users/alex/Code/whats-for-supper/api

# Run all WorkflowWorker tests
dotnet test src/RecipeApi.Tests/RecipeApi.Tests.csproj \
  --filter "WorkflowWorkerTests" \
  --logger "console;verbosity=normal"

# Expected output: All 9 tests PASS (including 2 new retry/fatal tests + 7 existing)
# NO "Expected: Completed, Actual: Pending" failures
```

---

## Mandatory Handover

When tests are fixed, provide:
1. **Root cause identified** (Option A, B, or C)
2. **Specific changes made** (file paths, line numbers, what was fixed)
3. **Test results**:
   - All 9 WorkflowWorkerTests PASS
   - Diagnostic test PASSES (if added)
4. **Confirmation**: "Binary retry implementation is verified end-to-end"
