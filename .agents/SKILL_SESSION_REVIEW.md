# Skill: Session Review & Audit

Procedural guidance for performing the mandatory end-of-session review and technical alignment.

## 1. Objective
Ensure the repository remains high-integrity, technical decisions are captured, and token usage is continuously optimized.

## 2. Review Checklist
At the end of every work session, perform the following:

### A. Summarize the Work & Update Handover
- **MANDATORY**: Update [HANDOVER.md](HANDOVER.md) with absolute technical detail (DO NOT COMPRESS).
- List logical and technical progress.
- Link to specific modified files and tests.

### B. Capture Technical Decisions (ADRs)
- Identify any "on-the-fly" design decisions made.
- Update relevant files in `specs/decisions/` or create new ADRs if required.
- Update `specs/` if the implementation deviated from the original plan.

### C. Token Optimization Review
- Analyze the session's token usage.
- **Alternative Approaches**: Propose leaner methods the user could have used.
- **Pattern Identification**: Identify repeated sequences that could be automated.

### D. Tooling & Sandbox Audit
- **Identify Missing Tools**: What tool or script would have optimized this session?
- **Reuse Recognition**: Did you create a useful script? Propose moving it to `scripts/agent/` or the toolbox.
- **Tool Creation**: Offer to build the missing tool if it benefits future autonomy.

### E. Documentation Sync
- Check if `README.md`, `LOCAL_DEV_LOOP.md`, or other guides need updates based on new infrastructure or patterns.

### F. Next Steps Plan
- Build a concise plan for the NEXT session to ensure immediate continuity.

## 3. Communication
Present the review clearly to the user, highlighting the coaching feedback on token usage and tool suggestions.
