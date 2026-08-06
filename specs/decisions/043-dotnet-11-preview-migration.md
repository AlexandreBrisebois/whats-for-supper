# ADR 043: .NET 11 Preview Migration

## Status
Accepted

## Context
The Recipe API previously targeted .NET 10 and ASP.NET Core OpenAPI 10. OpenAPI.NET 3.x is incompatible with the ASP.NET Core 10 OpenAPI source generator, preventing the API from using the current OpenAPI.NET package line.

As of this decision, .NET 11 is available only as Preview 6. Its ASP.NET Core OpenAPI integration supports OpenAPI.NET 3.x, and aligned Preview 6 releases are available for EF Core and the Npgsql provider.

## Decision
The Recipe API and its test project target .NET 11 Preview 6. The repository pins SDK `11.0.100-preview.6.26359.118`, uses aligned ASP.NET Core and EF Core Preview 6 packages, uses Npgsql EF Core `11.0.0-preview.6`, and upgrades OpenAPI.NET to `3.9.0`.

CI, Docker images, debugging configuration, and active engineering guidance use the same .NET 11 preview baseline. The public OpenAPI contract remains authoritative; framework-generated output must not introduce contract drift.

## Consequences
- **Positive**: The API can use the current OpenAPI.NET 3.x object model.
- **Positive**: Local, CI, and container builds share an explicit SDK baseline.
- **Negative**: The backend depends on prerelease framework, ORM, database-provider, and container artifacts.
- **Risk**: Preview updates may introduce breaking changes before .NET 11 reaches general availability.
- **Requirement**: Restore, vulnerability, contract reconciliation, API tests, Docker builds, and the complete repository test suite must pass for each preview update.
