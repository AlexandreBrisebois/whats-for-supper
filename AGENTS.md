# AGENTS.md – Repo Agent Profile

This file routes all AI coding agents working in the "What's For Supper" repository to the real doctrine. It does not replace the core protocol; it points to it.

## Scope

These instructions apply to any coding agent acting on this repo (Claude Code, Gemini, Kiro, GitHub Copilot, or others) and are a short index into the full constitution in `AGENT.md`.

## Required reads

Before acting, agents must read and respect:

- `AGENT.md` — the full Universal Agent Protocol and core operating model.
- `.agents/core/mission.md` — product intent and engineering posture.
- `.agents/core/contract-testing.md` — contract-first and testing governance.
- `.agents/core/execution-harness.md` — Taskfile-based execution harness.
- `.agents/core/context-loading.md` — context and scope discipline.

Tool-specific adapters and shims:

- `.agents/adapters/gemini.md` and `GEMINI.md` — Gemini CLI / Antigravity behavior.
- `.agents/adapters/claude.md` and `CLAUDE.md` — Claude Code behavior.
- `.agents/adapters/copilot.md` and `.github/copilot-instructions.md` — GitHub Copilot behavior.
- `.agents/adapters/codex.md` — OpenAI Codex behavior in this repository.
- `.kiro/steering.md` and `.kiro/specs/README.md` — Kiro behavior and spec usage.

- `.agents/skills/` — optional specialized playbooks loaded only when relevant to the active task or explicitly referenced by an adapter/spec.

## Core rules (summary)

- **Contract → Tests → Implementation.** `specs/openapi.yaml` is law. Write or update tests before logic.
- **Use the Taskfile.** Prefer `task` commands over ad-hoc shell for build, test, lint, and validation.
- **Work in bounded tasks.** Plan and execute one small, well-defined unit at a time.
- **Minimal context.** Load only what the current task requires; do not read the entire repo by default.
- **Zero drift.** Do not introduce schema drift between contracts, DTOs, mocks, and PWA models.

For full details, follow the links above. Do not invent new workflows or policies.