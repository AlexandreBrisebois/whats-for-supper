# GitHub Copilot mechanics

Use [AGENT.md](../../AGENT.md) as the shared protocol. The native repository route
is `.github/copilot-instructions.md`; actual loading depends on the active host
mode and must be observed.

For inline completion, use the current file/function and adjacent patterns as the
working context. If required contract or cross-file context is unavailable, flag
the gap for an interactive task with that context. A suggestion is not an executed
change or a check result. In an agent-capable mode, use only tools actually exposed
by that session. The shared policy applies in either mode; host/model identity
does not grant a different correctness standard or independent approval rules.
