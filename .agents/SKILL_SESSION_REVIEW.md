---
name: session-review
description: Mandatory end-of-session integrity audit. Update HANDOVER.md, memorialize technical decisions (ADRs), and optimize token usage/context.
---

# Skill: Session Review & Integrity Audit

You are the Integrity Officer. Your responsibility is to ensure the repository state is synchronized, decisions are durable, and context bloat is eliminated before the session concludes.

## 1. Operational Directives (Sequential)

Follow these directives in order when the user signals the end of a session or when a major task is completed.

### Directive 1: Audit Work & Synchronize State
1.  **Summarize Delta**: Identify every file changed and test passed in this session.
2.  **Update Handover**: Revise [HANDOVER.md](HANDOVER.md) with technical precision. Focus ONLY on active tasks.
3.  **Archive History**: Move completed session details from [HANDOVER.md](HANDOVER.md) to [JOURNAL.md](JOURNAL.md).
4.  **Update Strategy**: If a milestone was reached, update [ROADMAP.md](specs/00_STRATEGY/ROADMAP.md).

### Directive 2: Memorialize Technical Decisions (ADRs)
1.  **Identify ADR Triggers**: Check if any change:
    - Breaks/Changes a Contract (API, Schema, Env Vars).
    - Shifts Architecture (Libraries, Patterns, Paradigms).
    - Deviates from Brand/UX Identity.
2.  **Generate ADRs**: If a trigger is met, create a new ADR in `specs/decisions/`.
3.  **Update Specs**: Synchronize implementation-level changes with relevant `.spec.md` files.

### Directive 3: Perform Efficiency & Toolbox Audit
1.  **Waste Analysis**: Identify "Efficiency Leaks" (e.g., redundant file reads, loading excessive context).
2.  **Register Tools**: If a temporary script was created, move it to `scripts/agent/` and register it in [.agents/AGENT_TOOLBOX.md](.agents/AGENT_TOOLBOX.md).
3.  **Propose Enhancements**: Offer to build missing tools that would have reduced friction or token waste.

### Directive 4: Synchronize Documentation Surface Area
1.  **Environment**: Verify `.env.example` matches any new `process.env` or `config` additions.
2.  **Tasks**: Ensure `Taskfile.yml` or `package.json` updates are reflected in [LOCAL_DEV_LOOP.md](LOCAL_DEV_LOOP.md).
3.  **Schemas**: Run `task agent:reconcile` one final time to confirm OpenAPI and DB parity.

### Directive 5: Session Compaction & Turn-End
1.  **Active Pruning**: Ensure [HANDOVER.md](HANDOVER.md) contains ONLY the delta for the next session.
2.  **Death Audit**: Use [SKILL_DEATH_AUDIT.md](SKILL_DEATH_AUDIT.md) to prune temporary files, build prompts, or "zombie" code.
3.  **Next Steps**: Draft a sharp, 3-bullet plan for the next agent to resume immediately.

## 2. Integrity Check (Mandatory)

Before signing off, you must confirm:
- [ ] **State**: [HANDOVER.md](HANDOVER.md) is clean and [JOURNAL.md](JOURNAL.md) is updated.
- [ ] **Decisions**: All architectural shifts are documented as ADRs.
- [ ] **Hygiene**: No temporary scripts or "zombie" artifacts remain in the workspace.
- [ ] **Sync**: Documentation (Env, Tasks, Specs) matches the implementation.

## 3. Enforcement Policy

The Session Review is a **non-negotiable prerequisite** for the final response of every session. If the session is ending, trigger this audit automatically. No turn shall end with "dirty" context or unmemorialized decisions.
