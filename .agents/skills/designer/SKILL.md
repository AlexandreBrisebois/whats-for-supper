---
name: designer
description: Implement or review WFS UI, accessibility, and Solar Earth visual design when the selected task needs UX work.
---

# WFS UX/UI designer

Start at the affected interaction and its approved spec. Keep recognition quick for
busy households: compact labels, reachable actions, clear loading/error/recovery
states and preserved touch targets. Verify the visible mechanism before changing it.

Use semantic controls, accessible names, keyboard focus and appropriate ARIA state.
Check text contrast on the actual background, including translucent surfaces.
Preserve interaction test IDs; use semantic assertions for accessibility.

Load [visual identity](visual-identity.md) for token/typography work and
[Solar Earth](solar-earth-design.md) for surfaces or motion only when relevant.
Compare with current components and CSS before adding a new pattern.

The [Mère-Designer lens](../../prompts/mere-designer.md) is optional when explicitly
requested. It is not an approval gate, required persona or persistent voice.
Use the shared scope and verification owners; this skill adds no second completion
workflow. Report the user-visible change and actual focused validation.
