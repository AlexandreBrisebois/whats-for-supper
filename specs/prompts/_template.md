# PROMPT_V2 Template

Use this template for all new workstream prompts. This format is optimized for "Vertical Slices" and "Contract-First" development.

---

# WORKSTREAM: [slug]

**Model-Label**: SMALL_SAFE | MEDIUM_REQUIRED | LARGE_REQUIRED
**Why-This-Model**: [Justify the choice based on complexity and optimization]
**Launch-Targets**: Kiro, Antigravity, Claude
**Owner-Skill**: [e.g., nextjs-dev, dotnet-dev, designer]

## Objective
[Describe the single, exact outcome of this vertical slice]

## Scope

**TARGET**:
- [file path]
- [file path]

**FORBIDDEN**:
- [Area that must not be touched to avoid drift/conflicts]

## Required Context
- **Spec Anchor**: [Link to specs/features/<slug>/design.md]
- **Design Intent**: [Snippet of the specific requirement being implemented]
- **Related Seams**: [Minimal type or contract reference needed]

---

## Task
1. [Bounded instruction]
2. [Bounded instruction]
3. [Bounded instruction]

> [!IMPORTANT]
> Implement ONLY this task. Do NOT refactor unrelated code.

## TDD Gate
- [ ] Add or update the failing test FIRST.
- [ ] Confirm failure before implementation.
- [ ] Implement until the test passes.

## Verification
- `[exact command to run]`
- `[exact command to run]`

## Escalate If
- More than 3 files need edits.
- Contract/schema changes are required (and not in scope).
- New ambiguity appears.
- Unrelated tests fail.

## Micro-Handover
- [ ] Changed files
- [ ] Tests run and results
- [ ] Deviations from Task
- [ ] Risks / drift discovered
