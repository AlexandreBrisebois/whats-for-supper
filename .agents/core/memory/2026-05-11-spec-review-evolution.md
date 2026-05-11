# Spec Review Evolution: From Transient Context to Persistent Backlog
**Date**: 2026-05-11

## 1. Context
This reflection captures the shift in how multi-spec coordination is handled in the "What's For Supper" repository. It documents the transition from a broad "review these specs" request to the structured **Branching Review** protocol.

## 2. The Structural Innovation: The Branch Manifest
The creation of the `.kiro/specs/cnf-cross-spec-review` artifact solved the "Swollen Context" problem by:
- **Serializing Intelligence**: Capturing the agent's initial intuition about blind spots (R1-R14) before they are lost in the noise of implementation.
- **Atomic Decision Branches**: Treating each branch as a standalone unit. This allows for deep dives into specific risks without needing to hold the entire system in memory.
- **Status Tracking**: Providing a clear "Done" state for the review process itself.

## 3. The Process Innovation: The Decision-Oriented Interview
The review process shifted from "passive feedback" to "active steering":
- **Constraint-First**: Identifying "Dead Ends" and "Blind Spots" specifically through the **Mère-Designer** lens.
- **Solution-Focused**: Forcing the model to offer 2-3 solutions and a recommendation, rather than just pointing out problems.
- **Human-in-the-Loop**: Using the **1-by-1 loop** to prevent silent architectural assumptions.

## 4. The "Spec-Reviewer" Archetype
This session established the **Spec-Reviewer** (The Cynical Auditor) as the counterpart to the **Spec-Writer**. 
- **The Writer** is paranoid about gaps in a single feature.
- **The Reviewer** is cynical about complexity, drift, and bloat across the entire system.
- Focus areas: **Horizontal Seams** (handshakes between features) and **Vertical Risks** (cross-layer issues).

## 5. Resulting Doctrine
This evolution led to the creation of the [.agents/prompts/spec-reviewer.md](file:///Users/alex/Code/whats-for-supper/.agents/prompts/spec-reviewer.md) prompt, codifying the **Branching Protocol** as the standard for pre-build quality gates.

---
*Reference: Conversation b1429092-d27d-4b59-ace4-84aa6e5d3b94*
