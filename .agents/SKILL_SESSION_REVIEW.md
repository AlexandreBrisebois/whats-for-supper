---
name: session-review
description: Mandatory end-of-session audit to update HANDOVER.md, capture technical decisions (ADRs), and optimize token usage.
---

# Skill: Session Review & Audit

Procedural guidance for performing the mandatory end-of-session review and technical alignment.

## 1. Objective
Ensure the repository remains high-integrity, technical decisions are captured, and context bloat is minimized.

## 2. Review Checklist
At the end of every work session, perform the following:

### A. Summarize the Work & Update Handover
- **MANDATORY**: Update [HANDOVER.md](HANDOVER.md) with absolute technical detail for **active tasks only**.
- Move historical session details to the "Archive" section or summarize them.
- Link to specific modified files and tests.

### B. Capture Technical Decisions (ADRs)
- **ADR Trigger**: Create a new ADR in `specs/decisions/` only if a decision:
  1. Breaks/Changes a Contract (API, Schema, Env Vars).
  2. Shifts Architecture (Libraries, Patterns).
  3. Deviates from Brand/Aesthetic Identity.
- Update relevant `.spec.md` files for implementation-level changes.

### C. Tooling & Token Audit
- **Efficiency Leaks**: Identify where tokens were wasted:
  - Did we read the same file multiple times?
  - Did we load the entire backend for a frontend-only change?
  - Did we use a full `ls -R` when a targeted `ls` would have worked?
- **Registry Update**: If a new script was created, move it to `scripts/agent/` and register it in [.agents/AGENT_TOOLBOX.md](.agents/AGENT_TOOLBOX.md).
- Offer to build missing tools that would benefit future autonomy.

### D. Proactive Documentation Sync
Perform a **Surface Area Scan** to ensure documentation hasn't drifted:
- **Environment**: Check `.env.example` against new `process.env` or `config` additions.
- **Tasks**: Cross-reference `package.json` or `Taskfile.yml` with [LOCAL_DEV_LOOP.md](LOCAL_DEV_LOOP.md).
- **Strategy**: Update [specs/ROADMAP.md](specs/ROADMAP.md) if a phase or milestone was reached.

### E. Session Compaction & Slimming (Mandatory)
To maintain "Zero-Waste" context and prevent token bloat:
1. **Journaling**: Move completed "Session History" from `HANDOVER.md` to `JOURNAL.md`.
2. **Active Pruning**: Ensure `HANDOVER.md` ONLY contains the delta for the **current active task**.
3. **Promotion to ADR**: If a technical decision (schema change, architectural shift) was finalized, create a new ADR in `specs/decisions/` and remove the detail from the Handover.
4. **Zombies**: Run [Death Audit](SKILL_DEATH_AUDIT.md) on any temporary files (e.g., used build prompts).

### F. Next Steps Plan
- Build a concise plan for the NEXT session to ensure immediate continuity.

## 3. Enforcement
The Session Review is a **non-negotiable prerequisite** for the final response of every session. If the user indicates the session is ending, trigger this audit automatically.
