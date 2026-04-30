---
name: death-audit
description: Operational protocol for the systematic identification and elimination of "Zombie" code and documentation.
---

# Skill: Death Audit 💀

This protocol governs the identification, salvage, and elimination of redundant, divergent, or superseded content to maintain repository integrity and prevent "Context Bloat".

## 1. Primary Objective
Eliminate information entropy. Ensure every technical detail resides in a single, authoritative Source of Truth.

## 2. Phase 1: Zombie Identification Checklist
You must scan the repository for content meeting any of the following "Zombie" criteria. Treat this as a mandatory checklist:

1.  **Redundancy**: Is the information already defined in a primary Specification or Registry (e.g., `specs/openapi.yaml`, `AGENT.md`)?
2.  **Divergence**: Does the content describe patterns, logic, or dependencies we have officially abandoned?
3.  **Manual Mapping**: Is this a manually maintained list (e.g., file trees, endpoint lists) that can be tool-generated via `ls`, `grep`, or `task` commands?
4.  **Ambiguity**: Does the file share a similar name or purpose with another file but lacks the same level of depth or currency?
5.  **Shadow Logic**: Is there "commented out" code or logic blocks that have been superseded by new implementations?

## 3. Phase 2: Lossless Salvage Protocol
Before proposing any deletion, you must ensure 100% technical fidelity is maintained.

1.  **Extract Specifics**: Identify every endpoint, JSON schema, logic heuristic, edge case, and architectural decision within the target content.
2.  **Verify Target**: Identify the authoritative Source of Truth (refer to Section 6: Standard Hierarchy).
3.  **Verbatim Migration**: Move extracted technical blocks **verbatim** to the target file. 
    - **Directive**: Do not paraphrase. Do not summarize. High-fidelity migration requires raw technical detail.
4.  **Cross-Reference**: Verify that the salvaged content does not conflict with existing logic in the target file.

## 4. Phase 3: The Death Proposal
You must never delete code or documentation silently. You must present a "Death Proposal" to the user.

### Proposal Structure (Required):
1.  **Elimination Target**: Absolute path to the file(s) or section(s) to be removed.
2.  **Salvage Report**: List of specific technical details migrated to the Source of Truth.
3.  **Target Destination**: The file(s) where the salvaged information now resides.
4.  **Rationale**: Clear explanation of why this removal reduces ambiguity and improves velocity.

## 5. Phase 4: Execution & Verification
Once the user approves the Death Proposal, execute the following sequence:

1.  **Delete**: Remove the target file or section.
2.  **Surface Area Scan**: 
    - Run `grep -r "[filename]" .` to identify broken links or references.
    - Update all identified references to point to the new Source of Truth.
3.  **Dependency Check**: Ensure no automated tasks or build scripts rely on the deleted content.
4.  **Final Reconcile**: Run `task agent:reconcile` (if applicable) to confirm system integrity.

## 6. Standard Hierarchy (Master Reference)
Use this hierarchy to determine the authoritative Source of Truth:

| Tier | Category | Path / Resource |
| :--- | :--- | :--- |
| **1** | **Operational Registry** | [AGENT.md](AGENT.md) |
| **2** | **Tactical Mission** | [HANDOVER.md](HANDOVER.md) |
| **3** | **Long-term Strategy** | [specs/00_STRATEGY/ROADMAP.md](specs/00_STRATEGY/ROADMAP.md) |
| **4** | **API Contract** | [specs/openapi.yaml](specs/openapi.yaml) |
| **5** | **Component Specs** | `specs/01_FRONTEND/`, `02_BACKEND/`, `03_AI_WORKER/` |
| **6** | **Decision Logs** | `specs/decisions/` (ADRs) |
| **7** | **Operational Manuals**| `LOCAL_DEV_LOOP.md`, [.agents/agent-toolbox.md](.agents/agent-toolbox.md) |
| **8** | **Historical Archive** | `specs/05_ARCHIVE/` |
