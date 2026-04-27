# ADR 020: Automated Core Workflow Seeding

## Status
Accepted ✅

## Context
As the number of "Core" workflows (Import, Backup, Restore) grows, we need a reliable way to ensure they are available in both development and production environments (especially within containers). Previously, workflows were manually written to a `/data/workflows` folder on the host or hardcoded as strings in `Program.cs`.

## Decision
We implemented an **Automated Seeding Strategy** that bundles workflow definitions within the application project.

### 1. Project-Based Storage
All "Core" workflow definitions (YAML files) are stored in the API project under `src/RecipeApi/Workflows`.

### 2. Content Bundling
The `.csproj` was updated to include these files as `Content` with `CopyToOutputDirectory="PreserveNewest"`. This ensures they are part of the build artifact and the Docker container image.

### 3. Startup Synchronization
Implemented a `WorkflowSeeder` that runs during application startup (in `Program.cs`). It scans the bundled `Workflows` directory and copies/overwrites them into the external `WorkflowsRoot` (the volume directory).

## Consequences
- **Maintenance**: Maintainers can manage core workflows as standard project files with full git versioning.
- **Portability**: New environments (including clean Docker installs) will automatically have the core workflows available on the first run.
- **Consistency**: Overwriting on startup ensures that updates to workflow logic (e.g. adding a new task to `recipe-import`) are propagated to the environment without manual intervention.
- **Isolation**: Custom workflows added by users in the external directory are preserved (unless they share the same filename as a core workflow).
