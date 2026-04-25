---
name: team-orchestrator
description: The "Elite Team Builder" skill. Used to decompose complex features into parallel workstreams, manage implementation contracts (The Seams), and verify cross-layer integrity.
---

# Skill: Team Orchestrator (The Lead)

Procedural guidance for acting as the Lead Developer who coordinates parallel workstreams and ensures full-stack integrity.

## 1. The Elite Workflow
When a feature request is received, follow this 5-phase lifecycle:

### Phase 1: Planning & Breakdown
- **Decompose**: Identify the workstreams (Database, Backend API, Frontend UI, Mocks, E2E Tests).
- **Workstream Mapping**: Use [SKILL_CREATE_PROMPT.md](SKILL_CREATE_PROMPT.md) to draft the execution plan.

### Phase 2: Building the Seams (The Contract)
- **MANDATORY**: Before any implementation, use [SKILL_OPENAPI_SPECIALIST.md](SKILL_OPENAPI_SPECIALIST.md) to define the API contract and generate clients.
- **Contract Engineer**: Use [SKILL_CONTRACT_ENGINEER.md](SKILL_CONTRACT_ENGINEER.md) for database and other cross-layer boundaries.

### Phase 3: Parallel Execution (Delegation)
- **Launch Sub-Agents**: Provide the "Build Prompts" to the user for execution.
- **Micro-Handovers**: Each workstream MUST return a "Micro-Handover" (summary of changes + test results).

### Phase 4: Reintegration & Merge
- **Verify Seams**: Ensure the real Backend implementation matches the OpenAPI contract via `task agent:reconcile`.
- **Cross-Layer Audit**: Check that no modifications were missed (e.g., did the DB migration happen? Is the UI using the new API fields?).
- **The Integrity Gate**: Run `scripts/run-e2e-ci.sh` to ensure high-fidelity full-stack pass.

### Phase 5: Cleanup & Handover
- **Death Audit**: Use [SKILL_DEATH_AUDIT.md](SKILL_DEATH_AUDIT.md) to delete temporary build prompts and superseded mocks.
- **Global Handover**: Perform the final [SKILL_SESSION_REVIEW.md](SKILL_SESSION_REVIEW.md).

## 2. Token Consciousness (Context Management)
- **The Orchestrator** is the "High-Context" agent. It knows the whole repo.
- **Sub-Agents** are "Low-Context" agents. Use the **L.E.A.N. Protocol** in [SKILL_CREATE_PROMPT.md](SKILL_CREATE_PROMPT.md) to prune their environment.
- **The Signal Directive**: Prioritize **High Signal** (guardrails, verification) over **Minimum Text**. Do not compress away integrity steps.

## 3. Conflict Resolution
If workstreams drift or contracts break during implementation:
1. **Stop**: Halt sub-agent execution.
2. **Re-Contract**: Update the OpenAPI spec and regenerate clients.
3. **Resync**: Update the remaining Build Prompts to reflect the new contract.

## 4. Integrity Gate Checklist
Before declaring a feature "Done", verify:
- [ ] **Database**: Migrations applied and `pgvector` indexed if needed.
- [ ] **API**: `specs/openapi.yaml` matches implementation and clients are generated.
- [ ] **Backend**: Unit tests pass and API wrapping logic is consistent.
- [ ] **Frontend**: UI matches design tokens and Playwright tests pass.
- [ ] **Tests**: E2E suite passes via `task review` AND high-fidelity `scripts/run-e2e-ci.sh`.
