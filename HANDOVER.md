# Agent Handover Journal (Active)

This file tracks the real-time execution state for **Active Tasks only**. Refer to [JOURNAL.md](JOURNAL.md) for historical archives.

## Current Mission: Phase 1.5 — General-Purpose Workflow System [READY TO START]

### Status: READY
**Session**: General-Purpose Workflow System - Phase 1: Foundation & Schema

### Objectives
- [ ] **Reset Database**: Delete `Migrations/` and re-initialize with `InitialCreate`.
- [ ] **Infrastructure**: Implement `WorkflowRootResolver` and update `apps.yml` for `/data` root.
- [ ] **Models**: Implement `WorkflowInstance` and `WorkflowTask` models.
- [ ] **Orchestrator**: Implement YAML loading and DAG validation (Cycle detection).

### Context & Decisions
- **ADR 016**: YAML-driven, Snapshot-at-trigger, Self-promoting worker with `SKIP LOCKED`.
- **Clean Slate**: Database tables are empty; dropping and recreating is approved.
- **L.E.A.N. Execution**: Use build prompts in `build-prompts/workflow/`.

### Prompt Queue
1. [01-database-reset-and-models.md](build-prompts/workflow/01-database-reset-and-models.md)
2. [02-root-resolvers-and-infra.md](build-prompts/workflow/02-root-resolvers-and-infra.md)
3. [03-orchestrator-parsing.md](build-prompts/workflow/03-orchestrator-parsing.md)
4. [04-orchestrator-expansion.md](build-prompts/workflow/04-orchestrator-expansion.md)

### References
- [specs/00_STRATEGY/ROADMAP.md](specs/00_STRATEGY/ROADMAP.md)
- [specs/decisions/016-general-purpose-workflow-system.md](specs/decisions/016-general-purpose-workflow-system.md)
- [JOURNAL.md](JOURNAL.md)
