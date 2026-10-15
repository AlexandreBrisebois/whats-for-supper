---
name: dotnet-dev
description: Directive-driven guidance for contract-first, TDD backend development using .NET 11 Preview and C# 14.
---

# Skill: Senior .NET 11 Backend Engineer

This skill provides sharp, directive-driven guidance for high-performance backend development using .NET 11 Preview and C# 14.

OpenSpec owns the selected change, artifacts and task progression. This skill
provides domain implementation guidance within that scope; it does not select
additional tasks or impose a separate specification lifecycle.

## 1. Required Reading
Load the relevant reference for the selected backend change:
- [architecture-guidelines.md](architecture-guidelines.md): Deep Modules, Interface Design, and Domain-Driven refactoring rules.
- [testing-and-mocking.md](testing-and-mocking.md): System boundary mocking and Dependency Injection rules.

## 2. Core Operational Directives
1.  **Contract-First**: Follow [contract/testing](../../core/contract-testing.md): approved contract → tests → implementation. For API changes use [API design principles](../openapi-expert/api-design-principles.md) and the [OpenAPI procedure](../openapi-expert/SKILL.md). A mismatch does not authorize changing approved intent.
2.  **Test-Driven Execution**: Every feature must begin with a failing xUnit test in `api/src/RecipeApi.Tests/`.
3.  **Bounded architecture**: Follow existing Controllers, Services, Dto, Models and Data organization. Keep the change to the selected capability; do not reorganize unrelated code.

## 3. Sequential Development Workflow
Follow these steps for every backend change:

1.  **Context Alignment**:
    - Follow [shared investigation guidance](../../core/context-loading.md#investigation) to trace affected seams. Use `task agent:slice -- <route>` when route discovery helps.
    - Read the existing implementation in `api/src/RecipeApi/Controllers/` and its affected services/DTOs.
2.  **Contract Update**:
    - Resolve API intent first; modify `specs/openapi.yaml` only for an authorized surface change.
    - Run `task gen:client` after an approved contract edit, then `task typecheck`. Reconciliation supplements schema validation; it is not proof of all behavior.
3.  **Red (Fail)**:
    - Create a new test class or method in `api/src/RecipeApi.Tests/`.
    - Use `WebApplicationFactory` and `Testcontainers` for integration tests.
    - Run the focused behavior test to confirm it fails for the intended missing or incorrect behavior.
4.  **Green (Pass)**:
    - Implement the affected controller or service using the established route conventions.
    - Run the focused behavior test and affected integration tests to confirm they pass. Final verification under the [execution harness](../../core/execution-harness.md) still requires the full API suite.
5.  **Refactor & Verify**:
    - Run `task agent:drift` to catch any C# vs Spec field mismatches.
    - Follow the [execution harness](../../core/execution-harness.md) for applicable checks and final repository verification via `task verify`.

## 4. C# 14 & .NET 11 Standards
- **File-Scoped Namespaces**: Mandatory for all files.
- **Collection Expressions**: Use `[]` for all array/list/span initializations.
- **Endpoints**: Extend the existing controller conventions; use a different routing architecture only when approved by the selected design.
- **Implicit Using**: Follow project implicit usings and existing explicit imports.

## 5. Data & Persistence
- **EF Core 11**: Use `DbContext` with Interceptors for auditing (if required).
- **PostgreSQL / pgvector**: Use `Npgsql.EntityFrameworkCore.PostgreSQL` for vector search.
- **Migrations**:
    - Declarative SQL and compatibility transitions use psqldef, not EF migration generation.
    - Preview: `task db:schema:push DRY_RUN=true` (schema only). Apply: `task migrate` (includes compatibility SQL).
    - Refer to [Database Specialist](../database/SKILL.md).

## 6. Testing Strategy
- **Integration Tests (Primary)**: Use `Testcontainers` to spin up a real PostgreSQL instance.
- Use focused unit tests for isolated behavior; retain integration tests for affected boundaries and side effects.
- **Mocking**: Use `NSubstitute` or `Moq` sparingly; prefer real dependencies in integration tests.

## 7. Tooling & Automation
- **Parity Check**: `task agent:api` (Discovery) and `task agent:reconcile` (Validation).
- **Slice View**: `task agent:slice -- /path`.
- **Drift Detection**: `task agent:drift`.
