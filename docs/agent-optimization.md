# Agent-Optimized Development

This document explains the strategy and rationale behind the custom tooling found in `scripts/agent/` and `.agents/`.

## The Problem: Token Bloat

Large language models (LLMs) used as coding agents have a finite "context window." As an agent works, it reads files, terminal output, and conversation history. In a large repository like "What's For Supper," reading multiple C# controllers (1000+ lines) or generated SDKs just to find a single route is extremely "token-expensive."

High token usage leads to:
1. **Hallucination**: The agent loses focus as the context fills up with irrelevant code.
2. **Cost**: Higher API costs per task.
3. **Latency**: Slower response times.

## The Solution: High-Signal Tooling

Instead of forcing agents to read raw source code for discovery, we provide specialized scripts that act as the agent's "eyes" on the disk.

### 1. API Discovery (`api_tools.py --discovery`)
- **Strategy**: Scrapes C# controllers using regex to create a compact Markdown table.
- **Benefit**: An agent can "see" 30+ endpoints in ~20 lines of output instead of reading 10+ separate files.

### 2. Parity Reconciliation (`api_tools.py`)
- **Strategy**: Compares the OpenAPI Spec, the Mock API (Prism), and the Real API (C#).
- **Benefit**: Detects "Seam Drift" automatically. The agent doesn't need to manually verify if the C# implementation matches the spec; the tool gives a simple Pass/Fail matrix.

### 3. Contract-First Delegation
- **Strategy**: Gating `openapi.yaml` edits behind a specific Specialist skill.
- **Benefit**: Ensures that the "Architect" (Contract Engineer) focuses on design intent while the "Specialist" handles the mechanical integrity (examples, Kiota generation, wiring).

## Compression & Signal Policy
To maintain high efficiency without losing critical procedural guardrails, follow these rules:

1. **Signal over Minimalism**: Prioritize **"High Signal"** (verification steps, rationales, guardrails) over **"Minimum Text"**. If a consolidation results in a loss of procedural clarity, it has failed.
2. **Lean Instructions**: Keep `.agents/` skill files imperative and lean. Move all meta-commentary, self-justification, and "Why" explanations to this `docs/` folder.
3. **Machine-Readable**: Prioritize compact, machine-readable output (Markdown tables, JSON) for tools designed for agent discovery.
4. **Audit during Consolidation**: When merging or pruning files, explicitly list what was removed in the task walkthrough.

### The Signal Directive
Paste this block into core agent skills to enforce this balance:
> **⚠️ CORE DIRECTIVE: SIGNAL OVER MINIMALISM**
> When consolidating tools or optimizing context, prioritize **"High Signal"** (guardrails, verification) over **"Minimum Text"**. Do not compress away any step that ensures integrity.
