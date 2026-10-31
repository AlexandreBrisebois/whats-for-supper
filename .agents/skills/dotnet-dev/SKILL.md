---
name: dotnet-dev
description: Implement or fix WFS C# backend behavior, including controllers, services and persistence integration. Use for backend code changes, not frontend-only or specification-only work.
---

# WFS backend development

Use the selected behavior and [contract/testing](../../core/contract-testing.md)
for contract order, test-first slices and acceptance. Use the
[execution harness](../../core/execution-harness.md) for completion. Runtime and
language versions are owned by `global.json` and the affected project/build files.
Resolve the SDK separately from the target/runtime; check `api/Dockerfile`,
`api/Directory.Build.props` and both NuGet locks for provider compatibility.
Use [SDK selection guidance](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json)
and official documentation matching the discovered framework/package release;
generic examples do not establish prerelease API availability.

Start at the affected controller or service and its existing tests. Follow
[shared investigation](../../core/context-loading.md#investigation) when the path
or cause is uncertain. Preserve the Controllers, Services, Dto, Models and Data
ownership boundaries; reuse existing registration and routing conventions.

Load specialist detail only for the selected decision:

| Work | Reference |
|---|---|
| Designing an interface, async flow or dependency lifetime | [Architecture](architecture-guidelines.md) |
| Choosing a test seam or replacing a dependency | [Testing and mocking](testing-and-mocking.md) |
| Changing an API contract, generated client or mocks | [OpenAPI procedure](../openapi-expert/SKILL.md) |
| Changing PostgreSQL SQL, EF mappings, indexes, migrations or persistence concurrency | [Database procedure](../database/SKILL.md) |

## Implementation and testing

Use existing xUnit tests under `api/src/RecipeApi.Tests/`. Run focused feedback with
`task test:api -- --filter <expression>`. Choose a unit test for isolated behavior;
use the existing `TestWebApplicationFactory` and database fixtures when acceptance
crosses those seams. Inspect the selected fixture's provider and replacements:
an in-memory provider cannot establish PostgreSQL constraints or relational behavior.
Preserve persisted workflow side effects that subsequent reads depend on.
For auth acceptance, select the auth-enabled factory; for worker execution or
startup wiring, inspect whether the selected fixture runs those production paths.

Keep file-scoped namespaces and existing implicit/explicit using conventions.
Use collection expressions where compatible with the target type and behavior.
Extend established controller routes and dependency injection; add an abstraction
only when the selected behavior needs it. Keep persistence conversions explicit.
Request validation, auth, JSON wrapping and error behavior follow the approved
operation and existing controller/middleware pipeline in `Program.cs`. Inspect
those seams and their tests before adopting a framework-default response or a
minimal-API example. Preserve existing HttpClient registration and secret handling;
keep credentials out of logs and test evidence.

Use targeted discovery or drift commands when their output answers a current
question. Static route/schema comparison does not establish live parity; the
shared verifier selects applicable final checks.
