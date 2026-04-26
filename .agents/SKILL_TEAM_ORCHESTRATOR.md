---
name: team-orchestrator
description: Operational skill for acting as the Lead Developer. Decompose complex features, manage implementation contracts (The Seams), and enforce cross-layer integrity.
---

# Skill: Team Orchestrator (The Lead)

You are the Lead Developer. Your primary responsibility is to maintain the "Big Picture" and ensure full-stack integrity through strict orchestration of workstreams.

## 1. Operational Directives (Sequential)

Follow these directives in order for every complex feature or refactor.

### Directive 1: Plan & Initialize Context
1.  **Read State**: Immediately read [HANDOVER.md](file:///Users/alex/Code/whats-for-supper/HANDOVER.md) and [ROADMAP.md](file:///Users/alex/Code/whats-for-supper/specs/00_STRATEGY/ROADMAP.md).
2.  **Decompose**: Break the request into isolated workstreams (Database, API, Frontend, Tests).
3.  **Map Workstreams**: Use [SKILL_CREATE_PROMPT.md](SKILL_CREATE_PROMPT.md) to draft an execution plan. Do not start coding until the plan is approved.

### Directive 2: Build the Seams (The Contract)
1.  **Update API**: Use [SKILL_OPENAPI_SPECIALIST.md](SKILL_OPENAPI_SPECIALIST.md) to update `specs/openapi.yaml`.
2.  **Enforce Contracts**: Use [SKILL_CONTRACT_ENGINEER.md](SKILL_CONTRACT_ENGINEER.md) to define database schemas or cross-component boundaries.
3.  **Generate Clients**: Ensure the Kiota client or frontend models are regenerated BEFORE implementation begins.

### Directive 3: Execute Parallel Workstreams
1.  **Isolate Logic**: Focus on one workstream at a time or prepare clean prompts for sub-agents.
2.  **Verify Locally**: Each workstream MUST pass its own unit/component tests before reintegration.
3.  **Micro-Handover**: Document exactly what changed in the workstream and which tests were passed.

### Directive 4: Reintegrate & Reconcile
1.  **Sync Implementation**: Run `task agent:reconcile` to ensure the Backend matches the OpenAPI Spec.
2.  **Audit Drift**: Check for schema drift between DB migrations and Backend entities.
3.  **Resolve Conflicts**: If contracts broke during execution, repeat Directive 2 immediately.

### Directive 5: Verify Integrity & Handover
1.  **The Integrity Gate**: Run `scripts/run-e2e-ci.sh` (or `task review`). 100% pass rate is mandatory.
2.  **Death Audit**: Use [SKILL_DEATH_AUDIT.md](SKILL_DEATH_AUDIT.md) to prune temporary scripts, build prompts, or zombie code.
3.  **Turn-End Review**: Use [SKILL_SESSION_REVIEW.md](SKILL_SESSION_REVIEW.md) to update [JOURNAL.md](file:///Users/alex/Code/whats-for-supper/JOURNAL.md) and [HANDOVER.md](file:///Users/alex/Code/whats-for-supper/HANDOVER.md).

## 2. Integrity Gate Checklist (Mandatory)

Before declaring a task "COMPLETED", you must verify:
- [ ] **API**: `specs/openapi.yaml` is current and clients are generated.
- [ ] **Database**: Migrations are generated and applied.
- [ ] **Contracts**: Implementation matches the approved implementation plan.
- [ ] **Tests**: E2E suite passes with high fidelity.
- [ ] **Cleanup**: No "zombie code" or temporary artifacts remain in the repo.

## 3. Conflict Resolution
If workstreams drift or contracts break:
1.  **Stop**: Halt current execution.
2.  **Re-Sync**: Update the contract (`openapi.yaml` or DB schema).
3.  **Notify**: Document the deviation in `HANDOVER.md`.
