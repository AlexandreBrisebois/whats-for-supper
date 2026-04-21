# Agent Handover Journal (UNCOMPRESSED)

This file tracks the real-time execution state across AI sessions to ensure zero context loss.

## [2026-04-17] Universal Agent Protocol & Repo Reorganization

### Status: COMPLETED ✅
**Agent**: Antigravity (Gemini 1.5 Pro)

### Executed Changes
- **Roadmap Consolidation**:- [x] Folded `build-prompts/roadmap/session-smart-pivot.md` into `specs/ROADMAP.md`.
- [x] Deleted redundant `build-prompts/roadmap/` directory.
- [x] Created `AGENT.md` (Universal Agent Protocol).
- [x] Created `HANDOVER.md` (This file).
- [x] Reorganized Meta-docs (Moved to `docs/meta/`).
- [x] Root Cleanup (Deleted `TASK_REFERENCE.md`, `database/`, and junk files).
- [x] Implement Agent Toolbox (`scripts/agent/` and `Taskfile.yml` updates).

### Technical Details & Decisions
- **Database Consolidation**: Per user clarification, the legacy `database/` folder at the root was removed. The .NET 10 API uses EF Core migrations in `api/Migrations` via `MigrateAsync()` at startup.
    - Deleted `gitignore .gitignore` (typo).
- **Agent Toolbox**:
    - Created `scripts/agent/map_api.py`: A Python script to auto-generate a Markdown API map from C# controllers.
    - Updated `Taskfile.yml`: Added `agent:summary`, `agent:api`, and `agent:status` tasks.

### Technical Context for Next Agent
- **API Map**: Run `python3 scripts/agent/map_api.py` (or `task agent:api` if available) to see the current endpoint state.
- **Workflow**: For every new task, check `build-prompts/` for an execution plan.
- **Handover**: YOU MUST update this file at the end of your session. DO NOT compress or summarize; provide raw technical details.

### Current Project State
The repository is now "Agent-Optimized." The root is clean, the tech stack is confirmed (.NET 10, Next.js), and the discovery tools are in place. The next task in the roadmap is **Phase 0 - MVP Completion** or moving into **Phase 1 - Import**.

### Toolbox Reference
| Tool | command | Purpose |
|------|---------|---------|
| API Map | `python3 scripts/agent/map_api.py` | Generates endpoint table |
| Summary | `ls -R docs/meta/` | Check reorganized docs |
| **PWA Tests (Mock)** | `task review` | Standard pre-commit check (Stable) |
| **PWA Tests (Live)** | `task test:pwa:live` | Integration check against real API |

## [2026-04-17] E2E Stabilization & Identity Architecture

### Status: COMPLETED ✅
**Agent**: Antigravity (Gemini 1.5 Pro)

### Executed Changes
- **Identity Migration**:
    - [x] Removed `middleware.ts`.
    - [x] Implemented `IdentityValidator.tsx` (Client-side gatekeeper) to future-proof against Next.js middleware deprecations/instability.
    - [x] Centralized all public/protected route redirections in `IdentityValidator`.
- **E2E Stabilization**:
    - [x] Switched CI (`ci.yml`) to use `mock-api.js` instead of the full .NET backend for PWA tests.
    - [x] Implemented **Stateful Mock API** (in-memory persistence) to support onboarding flows.
    - [x] Unified local/CI configurations in `playwright.config.ts`.
- **Developer Experience**:
    - [x] Added `task test:pwa:ci` and `task test:pwa:live` to `Taskfile.yml`.
    - [x] Playwright now auto-manages the Mock API lifecycle locally.

### Technical Details & Decisions
- **Router Collisions**: Removed redundant `router.replace` calls from the Validator on the onboarding page to allow the page's own success handler to "win" without race conditions.
- **Port Strategy**: Standardized Mock API on port `5001` and Live API on port `5000`.

### Technical Context for Next Agent
- **Identity Flow**: The `IdentityValidator` wraps the entire app in `layout.tsx`. It handles the Landing page (`/`) redirect based on cookie presence.
- **Mocks**: When updating PWA data fetching, ensure the `mock-api.js` is updated to reflect the new schema/endpoint to keep CI green.
- **Trust**: If `task review` passes locally, it WILL pass in CI. If not, check if `MOCK_API_PORT` changed.

## [2026-04-17] AI Agent Docker & Configuration
### Status: COMPLETED ✅
**Agent**: Antigravity (Gemini 3 Flash)

### Executed Changes
- **Environment Updates**:
    - [x] Updated `.env.example` with `GEMINI_API_KEY`, `OLLAMA_API_ENDPOINT`, and `OLLAMA_MODEL_ID`.
- **Infrastructure Orchestration**:
    - [x] Updated `docker/compose/apps.yml` to pass AI variables to the `api` service.
    - [x] Mapped `AgentSettings__Endpoint` and `AgentSettings__ModelId` from user variables to .NET internal configuration.

### Technical Details & Decisions
- **Ollama Persistence**: The default endpoint for the API in Docker is set to `http://host.docker.internal:11434/v1` to bridge to a host-managed Ollama instance without requiring a containerized model in the MVP.
- **Gemini Strategy**: `RecipeHeroAgent` uses the direct `Google.GenAI` SDK; thus, it only requires the `GEMINI_API_KEY` and does not need a custom endpoint configuration.
- **Convention**: Follows ASP.NET Core environment variable naming conventions (`Section__Key`) to override `appsettings.json`.

### Technical Context for Next Agent
- **Verification**: Run `task health` to verify container health. 
- **Setup**: Users must provide a `GEMINI_API_KEY` in their local `.env` for `RecipeHeroAgent` to function. If missing, the agent will throw an `InvalidOperationException` upon invocation.

## [2026-04-17] Workspace Hygiene & Env Relocation
### Status: COMPLETED ✅
**Agent**: Antigravity (Gemini 3 Flash)

### Executed Changes
- **Configuration Relocation**:
    - [x] Moved `.env` and `.env.example` to the `docker/` directory to declutter the project root.
    - [x] Updated `Taskfile.yml` (`COMPOSE_CMD`) to explicitly use `--env-file docker/.env`.
- **Deep Clean & Alignment**:
    - [x] Synchronized database user/name defaults in templates (`recipe_app`, `recipe_app_db`) with reality.
    - [x] Pruned legacy/redundant sections (Redis, Old Ollama, Docker Registry/Prod URLs) from templates.
    - [x] Unified PWA environment variable naming on `NEXT_PUBLIC_API_BASE_URL` and `API_INTERNAL_URL`.
- **Documentation Synchronization**:
    - [x] Updated `README.md`, `PROJECT_STRUCTURE.md`, and `LOCAL_DEV_LOOP.md` to reflect new paths and modern `task` workflows.

### Technical Details & Decisions
- **None of the docker stuff happens at root**: Adhered to this philosophy by moving all orchestration configs into `docker/`, while maintaining the root `Taskfile.yml` as the single entry point.
- **Variable Consolidation**: Removed `CONFIG.API_URL` from PWA's `config.ts` because it was inconsistent with the `client.ts` uses of `BASE_URL`.
- **Documentation Migration**: Purged `docker-compose up` references from the README in favor of `task init` and `task up` to ensure users benefit from the Traefik/Docker hybrid architecture.

### Technical Context for Next Agent
- **Setup**: New users should run `task init` (which handles `cp docker/.env.example docker/.env` automatically now).
- **Environment**: If you need to add an environment variable for Docker, add it to `docker/.env.example` and `docker/.env`.
- **PWA Context**: `pwa/.env.local` is still used for local PWA dev outside of Docker, but `NEXT_PUBLIC_API_BASE_URL` is the authoritative key now.

## [2026-04-21] Discovery Schema & Voting Implementation
### Status: COMPLETED ✅
**Agent**: Antigravity (Gemini 3 Flash)

### Executed Changes
- **New Models**:
    - [x] Updated `Recipe` model with `IsDiscoverable`, `Category`, and `Difficulty`.
    - [x] Created `RecipeVote` model and `VoteType` enum for consensus-based planning.
- **Database Architecture**:
    - [x] Configured `RecipeVote` with a composite key (`RecipeId`, `FamilyMemberId`).
    - [x] Added `DbSet<RecipeVote>` to `RecipeDbContext`.
    - [x] Added performance indexes for `IsDiscoverable` and `Category`.
    - [x] Implemented check constraints for `RecipeVote.Vote` (1-2).
- **Persistence**:
    - [x] Generated EF Core migration `AddDiscoveryAndVoting` (`20260421153613`).
- **Developer Experience**:
    - [x] Created `AGENT_ENV.md` to standardize `PATH` and tool locations for future sessions.
    - [x] Installed `dotnet-ef` in the agent environment.

### Technical Details & Decisions
- **Composite Key**: `RecipeVote` uses a composite key to ensure a family member can only vote once per recipe.
- **Vote Enum**: Used a `short` conversion for the `VoteType` enum to match existing pattern in `RecipeRating`.
- **Index Strategy**: Added indexes to `IsDiscoverable` and `Category` to support high-performance filtering during the "Discovery" swiping flow.

### Technical Context for Next Agent
- **Environment**: ALWAYS run `export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/local/share/dotnet:/Users/alex/.dotnet/tools:$PATH"` at the start of the session (see `AGENT_ENV.md`).
- **Migrations**: The migration is generated but NOT applied to the local database yet because Docker was down. Run `task migrate` once Docker is up.
- **Testing**: New model tests are in `api/src/RecipeApi.Tests/Models/RecipeDiscoveryTests.cs`.
- **Match Logic**: Logic moved to `DiscoveryService` for centralized management.

## [2026-04-21] API Discovery Services & Match Logic (TDD)
### Status: COMPLETED ✅
**Agent**: Antigravity (Gemini 3 Flash)

### Executed Changes
- **Core Logic**:
    - [x] Created `DiscoveryService.cs`: Implemented recipe filtering (unvoted), category listing, match calculation (≥ 50% threshold), and difficulty inference.
    - [x] Integrated `DiscoveryService` into `RecipeImportWorker.cs`: Automated difficulty classification during sync.
- **API Surface**:
    - [x] Created `DiscoveryController.cs`: Exposed `GET /categories`, `GET /discovery`, and `POST /vote`.
    - [x] Updated `RecipeDto.cs` and `RecipeService.cs`: Included `Description`, `Category`, and `Difficulty` in standard API responses.
- **Testing (TDD)**:
    - [x] Created `DiscoveryServiceTests.cs`: Verified all business rules (matching, difficulty boundaries, category filtering).
    - [x] Achieved 100% pass rate on 78 total API tests.

### Technical Details & Decisions
- **Difficulty Inference**: Uses `XmlConvert` for ISO 8601 `totalTime` parsing. Easy: <5 ingred + <20m; Hard: >12 ingred or >45m.
- **Match Strategy**: Recipes are marked as matches if ≥ 50% of family members like them. Logic is centralized to prevent PWA/Worker drift.
- **Persistence Hooks**: Difficulty is calculated and persisted during the `RecipeImportWorker` synchronization phase, ensuring it's available for standard `GET` requests immediately.

### Technical Context for Next Agent
- **Verification**: Run `dotnet test api/src/RecipeApi.Tests --filter FullyQualifiedName~DiscoveryServiceTests`.
- **Header**: Ensure all frontend discovery requests include the `X-Family-Member-Id` header.
- **Next Step**: Implement the "Express Discovery Hub" (Smart Pivot) in the PWA using these new endpoints.

## [2026-04-21] PWA Discovery UI Integration (TDD)
### Status: COMPLETED ✅
**Agent**: Antigravity (Gemini 3 Flash)

### Executed Changes
- **Core Integration**:
    - [x] Connected `DiscoveryPage.tsx` to real API endpoints via `DiscoveryService`.
    - [x] Implemented **Category Rotation**: The UI now fetches all categories first, then fetches recipe stacks sequentially as the previous stack is exhausted.
    - [x] Updated image handling to use the standardized `/api/recipes/{id}/hero` endpoint.
- **API Surface**:
    - [x] Created `pwa/src/lib/api/discovery.ts`: Standardized Axios-based client for discovery operations.
- **Testing (TDD)**:
    - [x] Updated `pwa/mock-api.js`: Added support for `/api/discovery/categories`, `/api/discovery`, and `/api/discovery/:id/vote`.
    - [x] Created `pwa/e2e/discovery.spec.ts`: Implemented Playwright tests for category flow, empty states, and voting persistence.
    - [x] Fixed `IdentityValidator` redirection in E2E by correctly setting the `x-family-member-id` cookie.

### Technical Details & Decisions
- **Identity Key**: Confirmed `x-family-member-id` as the authoritative identity key (both in cookies and headers). Fixed legacy references to `member_id` in E2E scripts.
- **Stateful Navigation**: Managed `currentCategoryIndex` in local component state to drive the rotation logic without excessive API calls.
- **Empty State UX**: Polished the empty state to match the "Solar Earth" aesthetic, including a "Refresh Feed" button that re-triggers the category discovery loop.

### Technical Context for Next Agent
- **Verification**: Run `export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/local/share/dotnet:$PATH" && cd pwa && npx playwright test e2e/discovery.spec.ts`.
- **Environment**: Ensure `PATH` includes `/opt/homebrew/bin` for Node/NPM/Task access on this Mac environment.
- **Next Step**: Implement the **Weekly Planner** UI integration to utilize the "Match" logic (recipes with ≥ 50% likes).


## [2026-04-21] API Restoration & Hardening
### Status: COMPLETED ✅
**Agent**: Antigravity (Gemini 3 Flash)

### Executed Changes
- **Data Repair**:
    - [x] Fixed `recipes/5df6b7da-4537-4b06-bae6-e8278ce2d1a9/recipe.info`: Corrected invalid `rating: -1` to `rating: "unknown"`.
- **Backend Hardening**:
    - [x] Refactored `ManagementService.RestoreAsync`:
        - Replaced model-based `JsonSerializer.Deserialize<Recipe>` with `JsonDocument` parsing to avoid `JsonException` on `Ingredients` (mismatch between `string` property and JSON `array`).
        - Added `Rating` validation using `Enum.IsDefined` to clamp invalid values to `Unknown` (0) and satisfy database check constraints.
        - Simplified mapping to support both `recipeIngredient` (Schema.org) and `ingredients` (Legacy) keys.
    - [x] Hardened `RecipeImportWorker.SyncDiskToDb`: Synchronized robust JSON parsing logic to ensure consistent behavior across automated imports and manual restorations.

### Technical Details & Decisions
- **JSON Compatibility Strategy**: Adoped a "Parse-then-Extract" pattern rather than direct deserialization for the `Recipe` EF model. Because the `Ingredients` column in Postgres is `jsonb` but the C# property is a `string` (storing the raw JSON content), `JsonSerializer` fails when meeting an actual JSON array in a file. Using `JsonDocument` to get `GetRawText()` for the array solves this concisely.
- **Constraint Safety**: Added an explicit guard against invalid enum values in the `ManagementService`. This prevents a single corrupt metadata file from failing a multi-record `SaveChangesAsync` call.

### Technical Context for Next Agent
- **Verification**: Run `task restore` (if mapped) or trigger the `/api/management/seed` endpoint. The process is now resilient to corrupted `rating` fields and inconsistent `ingredients` naming.
- **Next Step**: Proceed with PWA Discovery Hub implementation. The database is now stable and restored.
