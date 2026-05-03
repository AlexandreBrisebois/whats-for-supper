---
name: team-orchestration
description: Operational skill for acting as the Lead Developer. Decompose complex features, manage implementation contracts (The Seams), and enforce cross-layer integrity.
---

# Skill: Team Orchestrator (The Lead)

You are the Lead Developer. Your primary responsibility is to maintain the "Big Picture" and ensure full-stack integrity through strict orchestration of workstreams.

## 0. Complexity Ceiling Check (Read First)

Before executing any directive, assess the task scope:

- If coordinating **more than 2 workstreams**, this task is `LARGE_REQUIRED`. Stop and escalate to a larger model.
- If **spawning sub-agents**, this task is `LARGE_REQUIRED`. Stop and escalate.
- If the task requires **new contract or schema design**, defer to [contract-engineer](../contract-engineer/SKILL.md) first.

Only proceed if the task fits within 1–2 isolated workstreams with no contract changes.

## 1. Operational Directives (Sequential)

Follow these directives in order for every complex feature or refactor.

### Directive 1: Plan & Initialize Context
1.  **Read State**: Immediately read [HANDOVER.md](HANDOVER.md) and [ROADMAP.md](specs/00_STRATEGY/ROADMAP.md).
2.  **Decompose (Vertical Slicing)**: Break the request into vertical, end-to-end capabilities (e.g., "Build the Add Recipe vertical slice: Contract -> DB -> API -> Frontend -> Test"). **DO NOT slice horizontally** (e.g., Database, then API, then Frontend).
3.  **Map Workstreams**: Use [create-prompt](../create-prompt/SKILL.md) to draft an execution plan for the vertical slices. Do not start coding until the plan is approved. **Note: If a pre-prepared prompt is provided by the user, adopt it as the approved strategy and verify it against Directive 2 (The Seams) before execution.**

### Directive 2: Build the Seams (The Contract)
1.  **Update API**: Use [openapi-expert](../openapi-expert/SKILL.md) to update `specs/openapi.yaml`.
2.  **Enforce Contracts**: Use [contract-engineer](../contract-engineer/SKILL.md) to define database schemas or cross-component boundaries.
3.  **Generate Clients**: Ensure the Kiota client or frontend models are regenerated BEFORE implementation begins.

### Directive 3: Execute Vertical Slices
1.  **Isolate Logic**: Focus on building one complete vertical slice at a time. If you spawn sub-agents, assign them specific vertical slices, coordinate them, and ensure they follow Directive 4.
2.  **Verify Locally**: Each vertical slice MUST pass its own unit, component, and E2E tests before moving to the next capability.
3.  **Micro-Handover**: Document exactly what changed in the slice and which E2E tests verify the capability.

### Directive 4: Reintegrate & Reconcile
1.  **Sync Implementation**: Run `task agent:reconcile` to ensure the Backend matches the OpenAPI Spec.
2.  **Audit Drift**: Check for schema drift between DB migrations and Backend entities.
3.  **Resolve Conflicts**: If contracts broke during execution, repeat Directive 2 immediately.

### Directive 5: Verify Integrity & Handover
1.  **The Integrity Gate**: Run `scripts/run-e2e-ci.sh` (or `task review`). 100% pass rate is mandatory.
2.  **Death Audit**: Use [death-audit](../death-audit/SKILL.md) to prune temporary scripts, build prompts, or zombie code.
3.  **Turn-End Review**: Use [session-review](../session-review/SKILL.md) to update [JOURNAL.md](JOURNAL.md) and [HANDOVER.md](HANDOVER.md).

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
