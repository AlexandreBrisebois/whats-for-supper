# Session 2: API Foundation & Project Structure

**Artifact:** `api/` folder with .NET 8 project structure, configs, Dockerfile

**Context needed:** Phase 0 spec + Project structure doc

**What to build:**
- `api/RecipeApi.csproj` — C# project file
- `api/src/RecipeApi/Program.cs` — App startup, DI config
- `api/src/RecipeApi/appsettings.json` — Config template
- `api/Dockerfile` — Container configuration
- Folder structure per spec

**Success:**
- `dotnet build` compiles successfully
- `dotnet run` starts without errors
- Health check endpoint returns OK

---

## Prompt

```
Task: Set up Phase 0 API project structure and configuration

You are creating the ASP.NET Core 8 foundation for Phase 0 API.

Requirements:
- Target: .NET 8.0
- Language: C#
- Database: Entity Framework Core with PostgreSQL
- Features: CORS, error handling middleware, structured logging

Deliverables:
1. api/RecipeApi.csproj
   - Dependencies: EF Core, Npgsql, pgvector, Newtonsoft.Json, Serilog
   - Target framework: net8.0
   - ImplicitUsings, Nullable enabled

2. api/src/RecipeApi/Program.cs
   - Configure services: DbContext, CORS, controllers, logging
   - Middleware: error handling, request logging
   - Migrations auto-run on startup
   - Configure PostgreSQL connection string from env

3. api/src/RecipeApi/appsettings.json
   - Logging configuration (Serilog)
   - CORS allowed origins
   - Connection strings template

4. api/Dockerfile
   - Multi-stage build (build → runtime)
   - Expose port 5000
   - Health check command: curl /health

5. api/.dockerignore
   - Exclude build artifacts, test results, .git

6. Folder structure:
   - api/src/RecipeApi/Controllers/
   - api/src/RecipeApi/Services/
   - api/src/RecipeApi/Models/
   - api/src/RecipeApi/Data/
   - api/src/RecipeApi/Dto/
   - api/src/RecipeApi/Middleware/
   - api/src/RecipeApi.Tests/

Target output:
- `dotnet build` succeeds
- Project structure matches spec
- Dockerfile builds successfully
- All dependencies resolve
```

---

## What to Expect

After this session:
- ✅ .NET 8 project ready for development
- ✅ Folder structure in place for Sessions 3-4
- ✅ Docker configuration ready
- ✅ All dependencies resolved

## Next Steps

1. Run `dotnet build` to verify compilation
2. Commit: `git commit -m "session 2: API foundation and project structure"`
3. Move to Session 3

