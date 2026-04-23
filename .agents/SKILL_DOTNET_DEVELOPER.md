---
name: senior-dotnet-developer
description: Senior-level guidance for .NET 10 development, focusing on modern C#, clean architecture, and TDD.
---

# Skill: Senior .NET 10 Developer

Procedural guidance for backend development using .NET 10 and latest C# features.

## 1. The TDD Workflow (Mandatory)
1. **API Specs**: Define the contract in `specs/`.
2. **Tests**: Write xUnit/Integration tests in `api/src/RecipeApi.Tests/`.
3. **Logic**: Implement the service/controller logic to satisfy the tests.
4. **Refactor**: Continuously refactor for clarity and performance.

## 2. Modern C# & .NET 10 Standards
- **Primary Constructors**: Use them for dependency injection in classes and structs.
- **File-Scoped Namespaces**: Always use `namespace MyNamespace;` to reduce indentation.
- **Collection Expressions**: Use `[]` for arrays, lists, and spans.
- **Minimal APIs**: Prefer Minimal API patterns for lightweight endpoints.
- **Global Usings**: Keep common namespaces in a global file.
- **Clean Architecture**: Stick to Vertical Slices. Keep logic close to the data it manages.

### Example
```csharp
namespace RecipeApi.Services;

public interface IRecipeService { /* ... */ }

// ✅ Modern C# 13 style with Primary Constructor
public class RecipeService(RecipeDbContext db, ILogger<RecipeService> logger) : IRecipeService
{
    public async Task<RecipeDto> GetRecipeAsync(Guid id) 
    {
        // Collection expressions
        string[] tags = ["quick", "healthy"]; 
        // ...
    }
}
```

## 3. Data & Persistence
- **EF Core**: Use `DbContext` with modern patterns.
- **PostgreSQL**: Leverage `pgvector` for AI-related search logic.
- **Migrations**: Always test migrations before applying (see `SKILL_DATABASE.md`).

## 4. Test Robustness
- **Testcontainers**: Use real PostgreSQL containers for integration tests to ensure migration and query integrity.
- **Fast Feedback**: Use in-memory databases only for pure unit tests that don't depend on Postgres-specific features.
