# Skill: Build Prompt Creation

Procedural guidance for decomposing implementation plans into self-contained, parallelizable, and TDD-driven "Build Prompts."

## 1. Objective
Break down complex features into atomic tasks that can be executed in separate, lean context windows.

## 2. Naming & Sequencing
- **Sequential**: `##-{descriptive-slug}.md` (e.g., `01-api_discovery_schema.md`).
- **Parallel Workstreams**: `##-{workstream}-##-{descriptive-slug}.md` (e.g., `01-pwa-01-discovery_ui.md`).

## 3. Build Prompt Template
Each generated prompt MUST include:
- **Persona**: A specialized identity (e.g., "Sr. Backend Engineer").
- **Context**: Relative links to `AGENT.md`, relevant Specs, and specific ADRs.
- **TDD Protocol**: 
  - **Backend**: Force implementation via xUnit tests.
  - **Frontend**: Force implementation via Playwright E2E tests.
- **Mandatory Handover**: Requirement to update `HANDOVER.md` and perform a session review.
- **Verification Rule**: Explicit adherence to Section 6 of `AGENT.md`.

## 4. Workstream Identification
Group dependencies to enable parallel dev:
- **Database**: Schema, migrations, snapshots.
- **Backend**: API endpoints, services, business logic, unit tests.
- **Frontend**: UI components, state management, E2E tests.
- **Mocks**: Stateful mock API updates (pwa/mock-api.js).

## 5. Storage
Propose storage in `build-prompts/phase-{theme}/`. Allow the user to override the theme name.

## 6. Ambiguity Handling
If the implementation plan has conflicting or incomplete instructions:
1. **Push Back**: Identify the conflict.
2. **Propose Options**: Offer 2-3 technical solutions.
3. **Draft Choice**: Recommend the best approach and explain why.
4. **User Gate**: Wait for user selection before generating the prompt.
