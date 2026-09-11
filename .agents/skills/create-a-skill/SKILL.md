---
name: create-a-skill
description: Author or revise a repository-specific WFS skill when explicitly requested. Ordinary feature work does not require skill creation.
---

# Repository skill authoring

Use the request and existing context to identify the specialist outcome, trigger,
boundaries and needed resources. Clarify only consequential missing information.

Keep universal policy with the owners in [AGENT.md](../../../AGENT.md). Link to the
relevant owner rather than duplicating authority, testing, permissions, delegation,
loading or completion rules. Do not introduce compulsory generic skills, automatic
turn-end skills, persona activation, mandatory interviews or recursive loading chains.
A reference is navigation; state the condition under which its body is needed.

Create a folder under `.agents/skills/` with `SKILL.md` and YAML frontmatter:

```yaml
name: example-specialist
description: Describe its concrete WFS capability and specific activation condition.
```

Keep the body focused on non-obvious repository decisions. Add a supporting reference
only for substantial conditional detail, and a script only for a useful repeatable
operation. Examples are optional advice, not new mandatory constraints. Avoid copied
manuals, arbitrary line quotas and unsupported efficiency claims.

Update the [registry](../README.md) with the discovery name, entrypoint and trigger.
Preserve established discovery identities when directories differ (for example,
`aws-architect` exposes `aws-well-architected`). Verify frontmatter, incoming links,
active routes and the absence of loading cascades. For executable changes, add focused
regressions before implementation and use the shared completion procedure. Record
actual checks and any unavailable native discovery observation separately.
