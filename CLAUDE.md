# Claude Code entrypoint

The shared harness owns all policy. This file explains how Claude Code reaches
it and adds no rules of its own.

## On entry

1. Read [AGENT.md](AGENT.md) and [context loading](.agents/core/context-loading.md).
   Load other `.agents/core/` files only when the context-loading table calls for them.
2. Read the [Claude adapter](.agents/adapters/claude.md) for host mechanics.

## Repository skills

`.claude/skills/` holds generated shims for the shared skills in
`.agents/skills/`. Each shim routes to its source skill. Regenerate them with
`task agent:skills:claude` and never edit them by hand.

## Commands and memory

Run project commands through `Taskfile.yml` as the
[execution harness](.agents/core/execution-harness.md) describes. Claude memory
follows [context loading](.agents/core/context-loading.md): verified repository
facts belong with their owner documents, not in memory.
