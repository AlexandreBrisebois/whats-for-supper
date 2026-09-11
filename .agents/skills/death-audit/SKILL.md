---
name: death-audit
description: Explicitly invoked, bounded maintenance to identify and retire obsolete WFS code or documentation after verified salvage and caller migration. Not automatic session cleanup.
---

# Bounded retirement audit

Use only for an explicit maintenance invocation with named targets or boundaries.
The selected request/manifest supplies scope; follow [AGENT.md](../../../AGENT.md)
for authority. HANDOVER is a resume checkpoint, never a competing rule owner.

Inspect only target content and incoming dependencies. Look for duplicated facts,
superseded behavior, dead exports and stale procedural callers. A heuristic or
similar filename alone is not proof that content can be deleted.

Before retiring a source, record each useful unique fact, its verified code/config
or approved spec evidence, and its destination. Keep policy with its shared owner,
terms in ontology, rationale in ADRs and task evidence in specs. Summarize accurately;
do not copy obsolete instructions verbatim merely to claim lossless migration.
Preserve historical evidence as history.

Migrate active callers and discovery before deletion. Reuse a previously approved
retirement plan within its boundaries; a second generic approval interview is not
required. Unresolved unique content or consumers block that specific retirement.
Verify incoming links, discovery and affected executable behavior using applicable
Taskfile checks. Report removed paths, provenance, preservation and remaining limits.
Do not expand into unrelated cleanup or invoke this skill at every turn end.
