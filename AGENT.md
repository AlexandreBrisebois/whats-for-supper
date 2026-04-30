# AGENT.md — Universal Agent Protocol

This document is the **constitution** for all human and AI agents working in the “What’s For Supper” (WFS) repository.  
It defines why this repo exists, how we build it, and where specialized instructions live.

It does **not** attempt to restate every detail in the modular instruction files — it routes you to them.

---

## 1. Purpose

“What's For Supper” (WFS) is a **premium, high‑performance Meal Planning Progressive Web App (PWA)**.  
The goal is to turn the dreaded “What’s for supper?” question into a high‑quality, reliable experience: planning, grocery lists, and execution feel **consistent and trustworthy**, not fragile.

This repo exists to ship and maintain that experience — not experiments, not throwaway code.

---

## 2. Core doctrine

All work in this repo is governed by the following non‑negotiable principles:

- **Contract‑First Development (OpenAPI is law)**  
  `specs/openapi.yaml` is the ultimate source of truth for backend contracts and PWA expectations.

- **Test‑First Development**  
  You must write or update tests **before** implementing logic. Features without tests are not considered real features.

- **Zero Drift & Schema Integrity**  
  Backend DTOs, mocks, and PWA models must match the OpenAPI spec exactly.  
  No silent divergence between:
  - `specs/openapi.yaml`
  - backend models/DTOs
  - mock API
  - PWA types

- **Premium Engineering Posture**  
  No zombie code, no speculative abstractions, no “while I’m in here” refactors outside the current task’s scope.

For detailed doctrine, see:

- `.agents/core/mission.md`
- `.agents/core/contract-testing.md`

---

## 3. Authority order

When making any change, follow this authority chain:

1. **Contract / Spec**  
   - `specs/openapi.yaml`  
   - Any other formal specs

2. **Feature Spec (if present)**  
   - `./.kiro/specs/<feature>.md`

3. **Tests**  
   - Unit, integration, and end‑to‑end tests that enforce the contract.

4. **Implementation**  
   - Backend, mock API, PWA code.

**Never** implement logic that contradicts the contract or feature spec.  
If you find a mismatch:

- Fix the **contract/spec first**,  
- then tests,  
- then implementation.

If a feature spec conflicts with the contract or core doctrine, the contract/doctrine wins. Flag the conflict; do not “fix” it locally.

---

## 4. Execution model (Taskfile as harness)

The **Taskfile is the execution surface** for this repo.  
If a `task` exists, use it instead of raw shell commands.

Key commands (see `.agents/core/execution-harness.md` for details):

- `task agent:reconcile` — keep contracts and generated clients in sync.
- `task agent:drift` — detect schema drift across contracts, DTOs, mocks, and PWA.
- `task agent:slice -- <route>` — load a vertical slice (Contract ↔ Backend ↔ Client).
- `task agent:test:impact` — run only tests affected by your changes.
- `task test` — run the full test suite.
- `task review` — formatting, linting, type‑checking, and tests before merge.

Execution rules:

- Prefer `task` commands over ad‑hoc shell **always**.
- Do not invent new workflows when a `task` target already exists.
- A change is *not* complete until:
  - `task agent:drift` passes,
  - `task agent:test:impact` (and `task test` when impact is unclear) passes,
  - `task review` passes.

For full guidance, see `.agents/core/execution-harness.md`.

---

## 5. Context model (scope & hygiene)

Agents must load the **minimum necessary context** to safely complete the current task.

Principles:

- **Targeted over global**  
  Prefer:
  - current spec / current task,
  - relevant contracts,
  - the directly impacted code,
  - selective history (handover/journal) only when resolving ambiguity.

- **Sequential over “load everything”**  
  Work one bounded task at a time. Decompose big work into smaller tasks rather than expanding context indefinitely.

- **Summarize and narrow**  
  Between steps, summarize what matters and drop what doesn’t, instead of carrying forward the whole repo.

For detailed rules, see `.agents/core/context-loading.md`.

---

## 6. Instruction map (single doctrine, modular adapters)

This repo uses a **modular instruction system**. Shared doctrine lives in `.agents/core`, and each tool has a thin adapter plus a native shim.

### Shared core (tool‑agnostic)

- `.agents/core/mission.md`  
  Product intent and engineering posture.

- `.agents/core/contract-testing.md`  
  Contract‑first, test‑first, zero‑drift governance and Definition of Done.

- `.agents/core/execution-harness.md`  
  Taskfile‑based execution model and safe operating rules.

- `.agents/core/context-loading.md`  
  Context, scope, and atomic delegation discipline.

### Tool‑specific adapters

- **Gemini**  
  - `.agents/adapters/gemini.md` — behavior for Gemini CLI / Antigravity agents.  
  - `GEMINI.md` — Gemini‑native entrypoint.

- **Claude Code**  
  - `.agents/adapters/claude.md` — behavior for Claude Code (planning, overreach controls, completion gates).  
  - `CLAUDE.md` — Claude‑native entrypoint.

- **GitHub Copilot**  
  - `.agents/adapters/copilot.md` — behavior and limitations for Copilot (local completions, no architecture).  
  - `.github/copilot-instructions.md` — GitHub‑native repository instructions.

- **Kiro**  
  - `.kiro/steering.md` — steering rules for Kiro, bound to the core doctrine.  
  - `.kiro/specs/README.md` — how to structure feature specs under `.kiro/specs/`.

**Rule:**  
When there is a conflict between a local instruction and a core file, the core file wins.  
When there is a conflict between a tool adapter and the core doctrine, the doctrine wins.

### Specialized skills

The repo may include task-specific skills under `.agents/skills/`.
These are opt-in operational playbooks for specialized work (for example: design review, prompt decomposition, end-of-session review, contract work, or testing).
Skills are loaded only when the active adapter or feature spec explicitly calls for them; they do not override core doctrine.

Authority remains:
Contract / Spec → Feature Spec → Tests → Implementation → Skill-guided execution details.

---

## 7. Tool routing

Use tool‑native shims to enter the system:

- Gemini CLI / Antigravity → `GEMINI.md`
- Claude Code → `CLAUDE.md`
- GitHub Copilot → `.github/copilot-instructions.md`
- Kiro → `.kiro/steering.md` + `.kiro/specs/`

Cross‑tool router:

- `AGENTS.md` — standardized index for tools that recognize AGENTS.md.  
  It points here (`AGENT.md`) and to the core + adapters.

**For humans and “full” agents (Claude, Gemini in chat, etc.):**

1. Start with this `AGENT.md` to understand the repo’s philosophy and operating model.
2. Then follow the links in the Instruction Map for detailed behavior.

---

## 8. How to work here (human or AI)

When you start a piece of work:

1. **Clarify the feature**  
   - If a Kiro spec exists: read `.kiro/specs/<feature>.md`.  
   - If not: create one following `.kiro/specs/README.md` for anything non‑trivial.

2. **Anchor in doctrine**  
   - Re‑read `.agents/core/contract-testing.md` and `.agents/core/execution-harness.md` if you are about to change contracts, tests, or execution paths.

3. **Plan small**  
   - Define a bounded task with a clear “done” state.  
   - For multi‑file or cross‑cutting work, write a short plan and get explicit approval (for agents: emit a plan and wait).

4. **Execute with the harness**  
   - Use `task` commands, not raw shell, for build/test/lint/validation.

5. **Validate & record**  
   - Run drift and impact tests, then `task review`.  
   - Update the relevant Kiro spec’s **Tasks** and **Notes / Decisions** sections as you go.

If at any point you’re unsure whether to act or ask: **ask**.  
When in doubt, propose options rather than making irreversible changes.

---

This document is the **single place** that defines what “good” looks like in this repo.  
All other instruction files exist to implement these principles for specific tools and workflows — not to replace them.