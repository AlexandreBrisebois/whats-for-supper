# Backend test seams and replacements

Load this reference when choosing a test seam or replacing a dependency. Use
isolated tests for pure behavior and real internal seams for integration acceptance.
Assert observable results and required side effects, including persisted rows,
constraints and ordering where the requirement includes them. Avoid private-method
tests and incidental call-count assertions that only mirror implementation.

## Select the fixture that exercises the requirement

Inspect `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` and
the selected tests before attributing coverage to the factory's name:

| Boundary | Current fixture behavior and implication |
|---|---|
| Authentication | `CreateAsync` disables auth; use `CreateWithAuthAsync` for auth assertions. `AuthEnforcementTests.cs` covers missing/wrong credentials, valid access and anonymous health. |
| Persistence | Defaults to EF InMemory and ignores its transaction warning. A PostgreSQL override and dedicated PostgreSQL fixtures exercise relational paths; InMemory cannot establish PostgreSQL constraints, transactions, raw SQL or LINQ translation. |
| Orchestration | Replacement triggers persist workflow/task state needed by subsequent reads. Their acceptance does not establish real worker execution, retries or background delivery. |
| Application startup | The factory constructs its own registrations/pipeline rather than running production `Program.cs` unchanged. TestServer acceptance does not establish production wiring, deployment or live browser behavior. |

For provider behavior, use the affected PostgreSQL regression fixture and the
[shared database runner guidance](../../core/execution-harness.md#effects-blockers-and-supporting-commands).
Raw `test:api` feedback can skip environment-gated PostgreSQL tests; inspect actual
executed/skipped results. `SchemaIntegrityTests.cs` provides static/model evidence,
not migration execution. SQL and migration evidence selection belongs to
[database](../database/SKILL.md).

Existing tests under `api/src/RecipeApi.Tests/Integration/` illustrate useful seams:
`GroceryCheckConcurrencyPostgresTests.cs` reads the committed result in a fresh
scope; `RecipeLexicalSearchPostgresTests.cs` separates provider fallback from caller
cancellation; `OnlineRecoveryPostgresTests.cs` checks preflight and repeat restore.
Choose the assertions relevant to the approved behavior, preserving each fixture's
scope and qualifications. Source inspection alone does not qualify these scenarios.

## Replace dependencies deliberately

Use deterministic doubles at external API, clock/randomness and filesystem
boundaries when needed. Preserve the state transitions callers observe: a workflow
fake returning success without required WorkflowInstance/WorkflowTask persistence
is insufficient. A stubbed embedding response cannot establish model quality or
vector-index recall. Preserve real orchestration when that execution is the subject.

Prefer typed operations at external boundaries where they clarify the contract;
do not create a wrapper solely for a mock. Stateful mocks may need conditional
dispatch, retries and failures when those behaviors are contractual. Generated
client and HTTP mock synchronization remain with [OpenAPI](../openapi-expert/SKILL.md)
and shared contract/testing rules.

Microsoft's [EF testing guidance](https://learn.microsoft.com/en-us/ef/core/testing/choosing-a-testing-strategy)
discourages EF InMemory as a database substitute. Retain existing tests for their
actual narrower assertions; add provider evidence where required without turning
the selected change into a wholesale fixture rewrite.
