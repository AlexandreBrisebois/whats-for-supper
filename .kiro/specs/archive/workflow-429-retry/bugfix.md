# Bugfix Requirements Document

## Introduction

When an AI model API (Gemini via `IChatClient` or the Google GenAI SDK) returns a 429 "This model is currently experiencing high demand" rate-limit error, the `WorkflowWorker` permanently fails the task and pauses the workflow instance. This is incorrect: a 429 is a transient, recoverable condition that should trigger the existing exponential-backoff retry mechanism, not a fatal failure.

The bug affects all three AI-backed processors — `RecipeAgent` (ExtractRecipe, GenerateDescription, SynthesizeRecipe), `RecipeHeroAgent` (GenerateHero), and `WebAcquisitionAgent` (FetchUrlContent) — because they all propagate raw SDK exceptions (`HttpRequestException` with status 429, or Google GenAI SDK exceptions) that are not `TransientWorkflowException` and therefore fall into the fatal catch block in `WorkflowWorker.ProcessTaskAsync`.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an AI processor throws an `HttpRequestException` with HTTP status 429 AND the task has retries remaining THEN the system marks the task as `Failed` (status 4) and sets the workflow instance to `Paused`

1.2 WHEN an AI processor throws a Google GenAI SDK exception indicating rate-limiting (429 / "high demand") AND the task has retries remaining THEN the system marks the task as `Failed` (status 4) and sets the workflow instance to `Paused`

1.3 WHEN a task is marked `Failed` due to a 429 error THEN the system does not increment `RetryCount` or set a future `ScheduledAt`, so the task is never retried

### Expected Behavior (Correct)

2.1 WHEN an AI processor throws an `HttpRequestException` with HTTP status 429 AND the response includes a `Retry-After` header AND the task has retries remaining THEN the system SHALL reschedule the task as `Pending` with `RetryCount` incremented and `ScheduledAt` set to `now + Retry-After` seconds (honouring the server's requested delay)

2.2 WHEN an AI processor throws an `HttpRequestException` with HTTP status 429 AND the response does NOT include a `Retry-After` header AND the task has retries remaining THEN the system SHALL reschedule the task as `Pending` with `RetryCount` incremented and `ScheduledAt` set to `now + 2^RetryCount` minutes (exponential backoff)

2.3 WHEN an AI processor throws a Google GenAI SDK exception indicating rate-limiting (429 / "high demand") AND the task has retries remaining THEN the system SHALL reschedule the task as `Pending` with `RetryCount` incremented and `ScheduledAt` set to `now + 2^RetryCount` minutes (exponential backoff)

2.4 WHEN an AI processor throws a 429-like exception AND the task has exhausted its retry budget (`RetryCount >= MaxRetries`) THEN the system SHALL mark the task as `Failed` and the instance as `Paused` (same as any other transient error that exhausts retries)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a processor throws a non-429 exception (e.g., `DivideByZeroException`, `ArgumentException`, `InvalidOperationException`) THEN the system SHALL CONTINUE TO mark the task as `Failed` immediately and set the instance to `Paused`, without retrying

3.2 WHEN a processor throws a `TransientWorkflowException` AND the task has retries remaining THEN the system SHALL CONTINUE TO reschedule the task with exponential backoff (existing retry path is unchanged)

3.3 WHEN a processor throws a `TransientWorkflowException` AND the task has exhausted retries THEN the system SHALL CONTINUE TO mark the task as `Failed` and the instance as `Paused`

3.4 WHEN a task completes successfully THEN the system SHALL CONTINUE TO mark it `Completed`, promote dependent tasks, and complete the workflow instance when all tasks are done

3.5 WHEN a 429 retry is scheduled without a `Retry-After` hint THEN the system SHALL CONTINUE TO use the same exponential backoff formula as other transient retries: `ScheduledAt = now + 2^RetryCount minutes`

3.6 WHEN a 429 retry is scheduled WITH a `Retry-After` hint THEN the system SHALL use the server-provided delay instead of the exponential backoff formula, while still incrementing `RetryCount`
