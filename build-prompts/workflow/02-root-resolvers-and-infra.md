# Build Prompt 02: Infrastructure & Root Resolvers

**Persona**: Infrastructure & DevOps Specialist
**Goal**: Align the application's directory resolution logic with the new `/data` root architecture and update the Docker orchestration to match.

## Strict Scope
- **NEW**: `api/src/RecipeApi/Infrastructure/WorkflowRootResolver.cs`
- **MODIFY**: `docker/compose/apps.yml`
- **DO NOT TOUCH**: `RecipesRootResolver.cs` (logic should remain similar but verify default alignment).

## Contract & Decisions
- **Decision: Consolidated Data Root**: We are moving towards a single `/data` mount point in Docker. 
- **Internal Paths**: 
    - Recipes: `/data/recipes`
    - Workflows: `/data/workflows`

## Requirements
1.  **WorkflowRootResolver**:
    - Create a singleton class (similar to `RecipesRootResolver`).
    - Resolve the workflows root directory.
    - Priority: `WORKFLOWS_ROOT` env var → `appsettings.json` "WorkflowsRoot" → `/data/workflows` (default).
2.  **Docker Compose Alignment**:
    - In `docker/compose/apps.yml`, update the `api` service.
    - Update volume mount: `${DATA_VOLUME_SOURCE:-../../data}:/data`
    - Add environment variable: `WORKFLOWS_ROOT: /data/workflows`
    - Ensure `RECIPES_ROOT` is set to `/data/recipes`.
3.  **Dependency Injection**:
    - Register `WorkflowRootResolver` as a singleton in `Program.cs`.

## TDD Protocol
1.  Write a unit test in `RecipeApi.Tests` that mocks `IConfiguration` and verifies the `WorkflowRootResolver` returns the correct path for all three priority levels (Env, Config, Default).
2.  Verify that the `api` container starts successfully with the new volume mapping (if Docker is running).

## Mandatory Handover
- Confirmation of the new resolver logic.
- Summary of `apps.yml` changes.
