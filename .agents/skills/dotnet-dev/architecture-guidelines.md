# Backend interfaces and execution boundaries

Load this reference for a selected interface, async-flow or lifetime decision.
Preserve the current controller/service/data boundaries and registration conventions;
an abstraction should remove caller knowledge or coordination needed by the change.
Prefer pure calculations where useful, retaining observable persistence and workflow
effects. Refactor after Green only within the selected behavior; method length or
similar-looking code alone does not justify a new layer or adjacent cleanup.

## Async work and ownership

Follow the affected request or worker's cancellation token through I/O and awaited
work. Distinguish caller cancellation from a provider timeout or retryable failure
using the selected contract and regression assertions; do not turn every cancellation
into a fallback or retry. `RecipeLexicalSearchPostgresTests.cs` already distinguishes
semantic timeout fallback from propagated caller cancellation.

Inspect DI ownership in `api/src/RecipeApi/Program.cs` and the affected service.
Do not capture a scoped DbContext in a singleton or share one context across
concurrent operations; await its operations and dispose owned scopes/resources.
`GroceryCheckCoordinator.cs` creates a fresh async scope per processed operation;
`WorkflowWorker.cs` creates separate execution scopes for parallel work. These
examples do not establish distributed serialization or exactly-once execution.
The selected requirements and tests own those guarantees.

Reuse the registered HttpClient factory/clients and inspect handler lifetime and
response disposal when changing outbound I/O. Do not add a client pool, context
pool or retry policy merely because an example uses one. PostgreSQL transaction,
isolation and locking details remain in [database](../database/SKILL.md).

For the discovered versions, consult official
[EF context lifetime and concurrency guidance](https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/)
and [HttpClient lifetime guidance](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines).
Use them to resolve the selected decision, without replacing approved WFS behavior
with generic framework defaults.
