---
name: death-audit
description: Proactive identification and elimination of "Zombie" documentation (redundant, divergent, or superseded context) to maintain repository integrity.
---

# Skill: Death Audit 💀

Procedural guidance for identifying and proposing the deletion of redundant documentation and dead code.

## 1. Objective
Minimize "Context Bloat" by ensuring every piece of information has a single, authoritative Source of Truth.

## 2. Identifying "Zombie" Content
A file or section is a "Zombie" if it meets any of these criteria:
- **Redundancy**: The information is already covered in a primary Spec (e.g., `API_DESIGN.md`).
- **Divergence**: The information describes a pattern we abandoned (e.g., old auth logic).
- **Manual Mapping**: It is a manually maintained list (like a file tree) that can be tool-generated.
- **Ambiguity**: It has a name similar to another file but is older or less detailed.

## 3. High-Fidelity/Lossless Consolidation
When consolidating "Zombie" content into an authoritative Source of Truth:
- **No Detail Left Behind**: technical specificities (endpoints, JSON schemas, logic heuristics, edge cases) MUST be preserved.
- **Avoid Vague Summaries**: Do not compress complex logic into generic descriptions. 
- **Verbatim Migration**: Prefer moving detailed blocks verbatim into the new "Lane" rather than paraphrasing.

## 4. The Audit Process
When starting a session or performing a Session Review:
1. **Name Collision Check**: `ls specs/` and check for files with overlapping names.
2. **"Source of Truth" Verification**: If you are about to update a guide, check if a more "Authoritative" file exists elsewhere.
3. **Draft the "Death Proposal"**:
   - **Target**: The file(s) to be deleted.
   - **Salvage**: A comprehensive list of technical details and sections to be merged.
   - **Rationale**: Why the deletion improves clarity.
4. **Detail Preservation Check**: Before final deletion, confirm that every "Salvaged" item is accurately represented in the new target file.

## 5. Execution
- **Never delete silently**.
- Always build a shared understanding of the "Death Proposal" with the user.
- After deletion, **Surface Area Scan**: Search the repo for broken links to the deleted file and fix them.

## 6. Standard Hierarchy (Master Reference)
- **Manuals**: `LOCAL_DEV_LOOP.md` (Operational / "How-To").
- **Strategy**: `specs/00_STRATEGY/` (Roadmap / "When").
- **The Law (Specs)**: `specs/01_FRONTEND/`, `02_BACKEND/`, `03_AI_WORKER/` (The Component "What").
- **Ops & Quality**: `specs/04_OPS_TESTING/` (Infrastructure / Testing).
- **Archive**: `specs/05_ARCHIVE/` (Historical milestones).
- **ADRs**: `specs/decisions/` (The "Why").
- **Tactical**: `HANDOVER.md` (The Active Mission).
