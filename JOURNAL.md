# Handover Journal: Historical Archive

This file contains the historical session logs and technical archives for the "What's For Supper" project. Refer to this only when deep-diving into historical technical context or past decisions that have not yet been promoted to ADRs.

---

## Technical Archive (Summarized)

- **[2026-04-21] API Restoration & Hardening**: Fixed JSON deserialization issues in `ManagementService.RestoreAsync` (Parse-then-Extract pattern). Clamped invalid ratings.
- **[2026-04-21] Discovery Schema & Voting**: Implemented `RecipeVote` with composite keys and discovery indexes.
- **[2026-04-17] Workspace Hygiene**: Moved `.env` to `docker/`, unified `Taskfile.yml` as the entry point.
- **[2026-04-17] Universal Agent Protocol**: Created `AGENT.md` and reorganized meta-docs.

### [2026-04-26] Agentic Framework Optimization (Flash & Haiku)
**Status**: IN_PROGRESS 🚧
- **Objective**: Refactor the project's meta-documentation and skill library for maximum performance on Gemini 3 Flash and Haiku 4.5.
- **Uncompressed Protocol**: Refactored `AGENT.md` to eliminate intent diffusion, replacing metaphorical "Laws" with explicit "Operational Directives".
- **Contract-First Testing**: Optimized `SKILL_TESTING.md` by removing legacy `mock-api.js` references and consolidating the workflow around OpenAPI/Prism.
- **PostgreSQL Schema Logic**: Optimized `SKILL_DATABASE.md` with a clear two-tier command registry (Local for generation, Container for application).
- **Zero Ambiguity**: Replaced technical compression (TDD, E2E, PWA) with explicit descriptions to ensure 100% instruction adherence across model families.
- **Developer Experience**: Refactored `.agents/SKILL_DOTNET_DEVELOPER.md`, `.agents/SKILL_NEXTJS_DEVELOPER.md`, and `.agents/SKILL_OPENAPI_SPECIALIST.md` into directive-driven manuals.
- **Architectural Seams**: Refactored `.agents/SKILL_CONTRACT_ENGINEER.md` into a sequential, directive-driven manual. Promoted `task agent:slice` and `task agent:drift` to core operational directives to ensure zero-drift integration between OpenAPI, C#, and TypeScript.
- **Result**: Core "Source of Truth" and Developer skills optimized for fast, high-intent agents. Remaining utility skills queued for follow-up review.

---

## Session History

### [2026-04-25] Full-Stack Contract & Schema Realignment
**Status**: COMPLETED ✅
- **Objective**: Resolve schema drift across the entire API surface and align DTOs with the OpenAPI contract.
- **Drift Remediation**: Fixed 22+ issues by applying `[JsonPropertyName]` and aligning nullability/requiredness in C# DTOs.
- **Route Mapping**: Updated `openapi.yaml` to include Management and Import routes, achieving 100% route coverage.
- **Tooling**: Refactored `drift.py` to support modern C# features (records, `required` modifiers) and explicit JSON mapping.
- **Result**: Zero Drift verified via `task agent:drift`. All system tests passing via `task review`.

### [2026-04-23] Automated API Contract Workflow (Kiota & Prism)
**Status**: COMPLETED ✅
- **Architectural Shift**: Replaced manual `openapi-typescript` and custom Node mock server with an automated generation and mocking pipeline.
- **Kiota**: Implemented `@microsoft/kiota` to generate a strictly-typed client SDK (`ApiClient`) directly from `specs/openapi.yaml`.
- **Prism Mocking**: Replaced `mock-api.js` with Stoplight Prism (`prism mock`), guaranteeing 100% contract parity during frontend development.
- **Verification**: Updated `reconcile_api.py` to recognize Prism's absolute parity while preserving it as the safety check against the C# Backend.
- **POC**: Refactored `pwa/src/lib/api/planner.ts` to consume the generated Kiota client, applying necessary type casting to maintain existing frontend constraints.
- **Documentation**: Updated `SKILL_API_DISCOVERY.md` to reflect the new automated "Contract-First" workflow. Added ADR `015-automated-api-contract-workflow.md`.

### [2026-04-23] Merge SmartDefaults Into Planner Grid: Unified Grid Integration
**Status**: COMPLETED ✅
- **Feature**: Merged SmartDefaults component into the 7-day planner grid for a single unified view.
- **Approach**: Test-first implementation with 5 new e2e tests. Parallel API fetching and smart merge logic.
- **API Changes**: Added `getSmartDefaults(weekOffset)` to `pwa/src/lib/api/planner.ts` with `PreSelectedRecipe` and `SmartDefaultsResponse` interfaces.
- **Frontend Implementation**:
  - Extended `UILocalScheduleDay` with `_isPending`, `_voteCount`, `_unanimousVote` fields for UI state tracking
  - Parallel fetch of schedule + smart defaults on load using `Promise.all()`
  - Smart defaults merged into grid: empty slots auto-populated with consensus recipes
  - Vote count badges added (sage green for unanimous, ochre for partial)
  - 30-second polling extended to refresh both persisted and pending slot vote counts
  - `handleFinalize()` updated to assign all pending slots before locking
- **Component Cleanup**: Removed SmartDefaults component block from JSX and deleted `pwa/src/components/planner/SmartDefaults.tsx`
- **Testing**: All 5 new e2e tests passing:
  - SmartDefaults section not visible
  - Merged recipes in grid visible
  - Vote badges displayed correctly
  - Drag/reorder works
  - Finalize assigns pending slots and locks
- **Build Status**: ✅ TypeScript zero errors; `npm run build` succeeds; 10/10 planner tests passing
- **References**: [pwa/src/lib/api/planner.ts](pwa/src/lib/api/planner.ts), [pwa/src/app/(app)/planner/page.tsx](pwa/src/app/(app)/planner/page.tsx), [pwa/e2e/planner.spec.ts](pwa/e2e/planner.spec.ts)

### [2026-04-23] Planner Voting Feature: Real-Time Vote Count Persistence
**Status**: COMPLETED ✅
- **Feature**: Implemented family voting consensus tracking with real-time display on planner.
- **Design Approach**: Test-first design with 8 locked design decisions documented in `PLANNER_VOTING_DESIGN.md`.
- **Backend Implementation**:
  - Added `VoteCount` field to `CalendarEvent` to persist family consensus votes
  - Modified `LockScheduleAsync()` to persist vote counts from `RecipeVotes` before clearing
  - Updated `GetScheduleAsync()` to return vote counts in `ScheduleRecipeDto`
  - Created migration `20260423160000_AddVoteCountToCalendarEvent` with index for data mining
- **Frontend Implementation**:
  - Updated TypeScript types to include optional `voteCount` in recipe data
  - Added 30-second polling to `PlannerPage` that:
    - Silently updates vote counts without interrupting mom's interactions
    - Preserves schedule structure and drag/drop functionality
    - Stops polling when voting is locked
- **Testing**: All 89 tests passing, including 5 new voting-specific tests covering:
  - Vote count persistence when locking schedule
  - Vote count clearing from RecipeVotes table
  - Real-time vote counts in smart defaults
  - Unanimous vote detection
  - Historical vote count retrieval
- **Data Flow Verified**: 
  1. Family votes in Discovery → RecipeVotes accumulates
  2. SmartDefaults reads live vote counts every 30 seconds
  3. Planner displays updating vote badges
  4. Mom clicks "End Voting" → counts persist to CalendarEvent, RecipeVotes cleared
  5. Historical vote counts available for data mining
- **Documentation**: Created 3 comprehensive spec documents (design, tests, summary)
- **Reference**: [api/docs/PLANNER_VOTING_DESIGN.md](api/docs/PLANNER_VOTING_DESIGN.md), [api/docs/VOTING_FEATURE_TESTS.md](api/docs/VOTING_FEATURE_TESTS.md), [pwa/src/app/(app)/planner/page.tsx:60-140](pwa/src/app/(app)/planner/page.tsx#L60).

### [2026-04-23] Quick Find Modal: Hero Image Fix
**Status**: COMPLETED ✅
- **Issue**: QuickFindModal was rendering Image component with empty/undefined `src`, causing console errors: "empty string passed to src attribute" and "Image is missing required src property".
- **Root Cause Analysis**:
  - Frontend: Image component rendered without checking if `image` prop existed or was empty
  - Backend: `FillTheGapAsync` returned raw `Recipe` entities instead of DTOs, missing image URL construction
- **Frontend Fix**:
  - Added conditional rendering: only render Image if `recipes[currentIndex].image` exists and is not empty
  - Added fallback placeholder with fork & knife emoji (🍽️) and "No image available" text for missing images
- **Backend Fix**:
  - Changed `FillTheGapAsync` return type from `List<Recipe>` to `List<ScheduleRecipeDto>`
  - Map Recipe entities to ScheduleRecipeDto with proper image URLs: `/api/recipes/{recipeId}/hero`
  - Apply same mapping to fallback DiscoveryRecipes
- **Verification**: API builds successfully with zero warnings; frontend console errors eliminated.
- **Reference**: [pwa/src/components/planner/QuickFindModal.tsx](pwa/src/components/planner/QuickFindModal.tsx), [api/src/RecipeApi/Services/ScheduleService.cs](api/src/RecipeApi/Services/ScheduleService.cs), [api/src/RecipeApi/Dto/ScheduleDays.cs](api/src/RecipeApi/Dto/ScheduleDays.cs).

### [2026-04-23] Smart Voting Defaults: Consensus-Based Pre-Selection
**Status**: COMPLETED ✅
- **Feature**: Implemented intelligent pre-selection of meals based on family consensus (51%+ threshold using `Math.ceil((familySize + 1) / 2)`).
- **Backend Logic** (`GetSmartDefaultsAsync`):
  - Calculates consensus threshold dynamically for families of any size
  - Queries `RecipeVotes` filtered for Like votes only
  - Groups votes by recipe and filters recipes ≥ threshold
  - Orders by unanimous votes (100%) DESC, then `LastCookedDate` DESC (freshest first)
  - Assigns to 7-day slots while respecting existing `CalendarEvents`
  - Returns `SmartDefaultsDto` with pre-selected recipes, vote counts, and open slots
- **Frontend Component** (`SmartDefaults.tsx`):
  - Displays 7-day week grid with pre-selected and open slots
  - Consensus badges showing "3 of 4 voted"
  - Sage Green (#8A9A5B) or Ochre (#E1AD01) highlights for unanimous recipes
  - Dynamic progression: recipes move in/out as page refreshes show updated votes
  - Refresh button to show latest vote state
  - Thumb-friendly design aligned with Mère-Designer persona
- **Integration**:
  - Added `SmartDefaults` component to `PlannerPage` (weekOffset === 0 only)
  - Changed "Start Cooking" button to cooking emoji (👨‍🍳) for minimal UI footprint
  - Wired callbacks: `onSlotClick` opens pivot sheet, `onRefresh` triggers page reload
- **Testing**:
  - Fixed e2e test (`planner.spec.ts::should trigger Cook Mode`) to find emoji button
  - Added `waitFor({ state: 'visible' })` to eliminate race condition
- **Reference**: [api/src/RecipeApi/Services/ScheduleService.cs:152-239](api/src/RecipeApi/Services/ScheduleService.cs#L152), [api/src/RecipeApi/Dto/SmartDefaultsDto.cs](api/src/RecipeApi/Dto/SmartDefaultsDto.cs), [pwa/src/components/planner/SmartDefaults.tsx](pwa/src/components/planner/SmartDefaults.tsx), [pwa/src/app/(app)/planner/page.tsx:26-357](pwa/src/app/(app)/planner/page.tsx#L26), [pwa/e2e/planner.spec.ts:103-108](pwa/e2e/planner.spec.ts#L103).
- **Build Status**: ✅ Both API and PWA compile with zero warnings.

### [2026-04-23] Backend Schedule API Implementation & Migration Fix
**Status**: COMPLETED ✅
- **Core Implementation**: Created all 5 schedule endpoints (`GET /api/schedule`, `POST /api/schedule/lock`, `POST /api/schedule/move`, `POST /api/schedule/assign`, `GET /api/schedule/fill-the-gap`).
- **Data Model**: Implemented `CalendarEvent` entity with `CalendarEventStatus` enum (Planned, Locked, Cooked, Skipped).
- **Business Logic**: 
  - `GetScheduleAsync` returns 7-day schedule with recipe data and week lock status.
  - `LockScheduleAsync` updates `Recipe.LastCookedDate` and purges all `RecipeVotes`.
  - `MoveScheduleEventAsync` swaps recipes between days, handles null cases.
  - `AssignRecipeAsync` upserts calendar events with Planned status.
  - `FillTheGapAsync` returns 5 matched recipes ordered by least-recently-cooked, falls back to discovery recipes.
- **Migration Fix**: Column naming issue in initial migration (`Status` vs `status`) was corrected by adding `.HasColumnName("status")` to entity config.
- **Testing**: All 84 existing tests pass; 5 new ScheduleService unit tests implemented.
- **Reference**: [api/src/RecipeApi/Services/ScheduleService.cs](api/src/RecipeApi/Services/ScheduleService.cs), [api/src/RecipeApi/Controllers/ScheduleController.cs](api/src/RecipeApi/Controllers/ScheduleController.cs), [api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs](api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs), [api/Migrations/20260423151137_AddCalendarEvents.cs](api/Migrations/20260423151137_AddCalendarEvents.cs).

### [2026-04-23] Supper Planner PWA Implementation
**Status**: COMPLETED ✅
- **UI/UX**: Implemented the weekly dashboard with "Solar Earth" aesthetics, progress indicators, and reorderable daily cards.
- **Planning Pivot**: Built the bottom sheet with Quick Find, Search, and Ask paths.
- **Lockdown Flow**: Implemented the decisve "Finalize" workflow with success state transitions.
- **Verification**: Passed 5/5 Playwright E2E tests (`planner.spec.ts`).
- **Reference**: [pwa/src/app/(app)/planner/page.tsx](pwa/src/app/(app)/planner/page.tsx), [pwa/e2e/planner.spec.ts](pwa/e2e/planner.spec.ts).

### [2026-04-22] Session Review & Documentation Stabilization
**Status**: COMPLETED ✅
- **Lanes Organization**: Reorganized `specs/` into a directory-based hierarchy.
- **Lossless Consolidation**: Merged 10+ redundant files into 4 authoritative "Law" files.
- **Reference**: [specs/00_STRATEGY/ROADMAP.md](specs/00_STRATEGY/ROADMAP.md).

### [2026-04-21] PWA Discovery UI Integration (TDD)
**Status**: COMPLETED ✅
- **Core Integration**: Connected `DiscoveryPage.tsx` to real API endpoints via `DiscoveryService`.
- **Category Rotation**: Implemented sequential stack fetching.
- **Identity**: Confirmed `x-family-member-id` as the authoritative key.
- **Reference**: [pwa/src/lib/api/discovery.ts](pwa/src/lib/api/discovery.ts), [pwa/e2e/discovery.spec.ts](pwa/e2e/discovery.spec.ts).

### [2026-04-21] API Discovery Services & Match Logic (TDD)
**Status**: COMPLETED ✅
- **Core Logic**: Created `DiscoveryService.cs` with matching threshold (≥ 50%) and difficulty inference (<5 ingred + <20m).
- **API Surface**: Exposed `GET /categories`, `GET /discovery`, and `POST /vote`.
- **Reference**: `DiscoveryServiceTests.cs`.
