---
name: build-prompt-creation
description: Decompose implementation plans into self-contained, parallelizable, and TDD-driven "Build Prompts" managed by the Team Orchestrator.
---

# Skill: Build Prompt Creation

Procedural guidance for decomposing implementation plans into self-contained, parallelizable, and TDD-driven "Build Prompts."

## 1. Objective
Break down complex features into atomic tasks that can be executed in separate, lean context windows, ensuring that the intent is fully crystallized through a shared understanding with the user and governed by the [Team Orchestrator](SKILL_TEAM_ORCHESTRATOR.md).

## 2. Crystallize Intent & Optimize Context
Before generating any prompts, you **MUST**:
1. **Stress-Test the Plan**: Use [SKILL_SHARED_UNDERSTANDING.md](SKILL_SHARED_UNDERSTANDING.md) to resolve all ambiguities.
2. **Apply L.E.A.N. Context**: Use these rules to gather the minimum necessary files:
   - **L - Localize**: Only include files within the immediate functional slice.
   - **E - Essentialize**: Provide only "The Seams" (Mock API lines, Type snippets) if the whole file isn't needed.
   - **A - Abstract**: Use `task agent:summary` instead of deep-diving into irrelevant folders.
   - **N - Nullify**: Explicitly ignore large, irrelevant directories (bin, obj, node_modules).
3. **Draft Choice**: Present the refined intent and the **Context Pruning List** to the user for final validation.

## 3. Naming & Sequencing
- **Sequential**: `##-{descriptive-slug}.md` (e.g., `01-api_discovery_schema.md`).
- **Parallel Workstreams**: `##-{workstream}-##-{descriptive-slug}.md` (e.g., `01-pwa-01-discovery_ui.md`).

## 3. Build Prompt Template
Each generated prompt MUST include:
- **Persona**: A specialized identity (e.g., "Sr. Backend Engineer").
- **Strict Scope**: Explicitly list files that MUST NOT be touched to prevent drift.
- **Contract Link**: Link to "The Seams" (Mock API lines, Type definitions) created via [SKILL_CONTRACT_ENGINEER.md](SKILL_CONTRACT_ENGINEER.md).
- **Execution Limit**: "Goal: Implement ONLY behavior X. Do not refactor Y."
- **TDD Protocol**: 
  - **Backend**: Force implementation via xUnit tests.
  - **Frontend**: Force implementation via Playwright E2E tests.
- **Mandatory Handover**: Requirement to provide a **Micro-Handover** summarizing changes and test results.
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
