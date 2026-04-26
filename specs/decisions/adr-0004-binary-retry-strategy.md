---
title: Binary Retry Strategy for Workflow Task Failures
date: 2026-04-26
status: ACCEPTED
author: Claude (Session: Binary Retry Implementation)
---

# ADR-0004: Binary Retry Strategy for Workflow Task Failures

## Context

The workflow system processes multi-step recipes (extract → generate → sync). Each step can fail due to:
- **Transient errors** (network timeouts, temporary service unavailability)
- **Fatal errors** (invalid input data, permanent service failure)

The original error handling treated all exceptions identically: mark task as Failed, log, and move on. This approach:
- **Problem 1**: Loses retryable work (e.g., a temporary network glitch fails permanently)
- **Problem 2**: No circuit breaker to prevent cascading failures (a broken processor cascades to dependent tasks)
- **Problem 3**: Relies on manual intervention to distinguish error types

## Decision

Implement a **Binary Retry** strategy that classifies errors into exactly two categories:

### Transient Errors
Thrown as `TransientWorkflowException`. Auto-retry with exponential backoff:
```
Retry 1: ScheduledAt = NOW + 2^1 min = 2 min
Retry 2: ScheduledAt = NOW + 2^2 min = 4 min
Retry 3: ScheduledAt = NOW + 2^3 min = 8 min
Retry 4: MaxRetries exceeded → escalate to Fatal
```

### Fatal Errors
All other exceptions (including exceeded retries). Action:
1. Set task status to `Failed`
2. Set instance status to `Paused` (circuit breaker)
3. Capture error message + stack trace
4. **Manual intervention required** to resume (admin inspects failure, fixes issue, resets task)

## Rationale

### Why Binary (Not Fuzzy)?
- **Simplicity**: Two paths eliminate ambiguous middle ground
- **Operational clarity**: Clear intent for monitoring/alerting
- **Cost**: No need for retry budgets, jitter math, or probabilistic backoff

### Why Exponential Backoff?
- **Intuition**: Early retries are cheap; later retries are expensive
- **Stability**: Prevents thundering herd if transient service recovers
- **Configurability**: MaxRetries is tunable (default 3, ~15 min max wait)

### Why Instance Pause as Circuit Breaker?
- **Failure isolation**: Prevents a broken processor from cascading to dependent tasks
- **Operator awareness**: Paused instance is visible in the admin dashboard
- **Safety-first**: Requires deliberate action (manual reset) to resume, preventing silent corruption

## Consequences

### Positive
- ✅ Transient errors now auto-recover without manual intervention
- ✅ Cascading failures are halted (instance pause prevents downstream damage)
- ✅ Clear error taxonomy makes debugging easier
- ✅ Configuration-driven MaxRetries allows ops to tune without code changes
- ✅ No "poison loop" risk (Failed tasks are never auto-picked by worker)

### Negative
- ❌ Processors must explicitly throw `TransientWorkflowException` (or all errors treated as fatal)
- ❌ Manual intervention required for any fatal error (increases operational burden vs. automatic recovery)
- ❌ Exponential backoff may be too aggressive for some use cases (mitigation: tune MaxRetries)

## Alternatives Considered

### Alternative A: Fuzzy Classification (Retry Count + Exception Type)
Retry based on exception type (e.g., HttpRequestException retries, SqlException doesn't). 
- **Pro**: More nuanced
- **Con**: Requires deep knowledge of all possible exceptions; fragile as libraries evolve

### Alternative B: Always Retry with Backoff
Retry all errors exponentially, never mark as Fatal.
- **Pro**: Maximum resilience
- **Con**: Masks permanent failures; a broken processor would retry forever

### Alternative C: Circuit Breaker Pattern Only
Use circuit breaker to throttle, but no backoff scheduling.
- **Pro**: Prevents cascading failures
- **Con**: No auto-recovery for transient errors; requires manual reset for all failures

## Implementation

- **File**: `api/src/RecipeApi/Services/WorkflowWorker.cs` (ProcessTaskAsync, lines 242-287)
- **Config**: `api/appsettings.json` (WorkflowRetry.MaxRetries = 3)
- **Exceptions**: `api/src/RecipeApi/Workflow/Exceptions/{Transient,Fatal}WorkflowException.cs`

## Testing

- **Unit Test**: `Worker_TransientError_RetriesWithExponentialBackoff` verifies retry scheduling
- **Integration Test**: `Worker_FatalError_PausesInstance` verifies instance pausing

## Validation Checklist
- [x] Binary classification is unambiguous (each error falls into exactly one category)
- [x] Exponential backoff calculation is correct (2^RetryCount)
- [x] Instance pause prevents downstream task processing
- [x] Configuration is externalized (appsettings.json)
- [x] Poison loop prevention confirmed (worker only picks Pending, not Failed)

## Related Decisions
- ADR-0001: Workflow Dependency Promotion (tasks auto-promote when dependencies complete)
- ADR-0003: Throttle-Per-Processor (semaphores prevent processor overload)
