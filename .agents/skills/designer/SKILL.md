---
name: designer
description: Implement or review WFS journeys, information architecture, interactions, content, accessibility and Shared Table / Family Cookbook UI when the selected task needs UX work.
---

# WFS UX/UI designer

Start at the affected task, interaction and approved spec. Identify the people,
context, success and current shared patterns; verify the visible mechanism before
changing it. Protect trust and understandable outcomes before persuasion or polish.

Use the capabilities relevant to the scope: task/journey analysis, information
architecture, interaction/state/recovery design, content and bilingual design,
and proportionate usability research/validation. Accessibility crosses each one.
A small correction does not require all methods or a new set of artifacts.

Keep recognition quick: clear labels, reachable actions, understandable shared
state and preserved work. Cover relevant loading, empty, error and recovery states;
leave no dead ends, including a clear way to finish or leave. Check English/French
meaning and text expansion for affected copy. Separate product task completion
from marketing promises; neither establishes the other.

Use semantic controls, accessible names, keyboard focus and appropriate ARIA state.
Check text contrast on the actual background, including translucent surfaces;
do not rely on color alone. Preserve touch targets (`>= 48 x 48 CSS px`), reduced-motion
support and interaction test IDs; use semantic assertions for accessibility. Use Canadian
practical guidance and the chosen WCAG 2.2 AA target without claiming blanket
compliance from partial checks.

## Required Guidance & Visual Contract Workflow

1. **Normative tokens & surfaces:** Load [visual identity](visual-identity.md) for the dual-mode Standard AA (`:root`) and High Contrast AAA (`:root[data-contrast="high"]`) semantic role matrix, warm charcoal ramp, typography floor (`>= 12 CSS px`), and Do/Do Not rules, and [Family Cookbook surfaces and motion](cookbook-surfaces-and-motion.md) for card/sheet anatomy, semantic surface/button/switch/focus tokens, opaque High Contrast `.glass-nav`, targets, and motion. Also reference [designer judgment and guidance](../../../docs/agent-designer-identity.md) and the [North Star](../../../docs/creative-direction-north-star.md) when needed.
2. **Modern web platform guidance:** Before writing or updating HTML/CSS, client-side UI interactions, overlays/dialogs, forms, or focus/contrast styles, invoke the `modern-web-guidance` skill (`search` + `retrieve`) so platform patterns (`:focus-visible`, Forced Colors `outline`, `min-*` target sizing, predefined sRGB tokens vs low-chroma `oklch` neutral pitfalls) follow current standards.
3. **Automated & browser verification:** Verify code edits against the static ratchet in [visual-contract.test.ts](../../../pwa/src/test/visual-contract.test.ts) and [tokens.test.ts](../../../pwa/src/test/tokens.test.ts) (reducing/removing `LEGACY_ERA_ALLOWLIST` entries as legacy files migrate). For rendered UI review and accessibility checks, use the `a11y-debugging` skill (Chrome DevTools MCP snapshot, focus order, tap-target, and contrast snippets) alongside `assertCookbookVisualA11y` in [visual-a11y-contract.ts](../../../pwa/e2e/visual-a11y-contract.ts), exercising both Standard (`contrastLevel: 'aa'`, default) and High Contrast (`contrastLevel: 'aaa'`).
4. **Reference alignment:** Compare with clean Era 3 components ([TonightMenuCard](../../../pwa/src/components/home/TonightMenuCard.tsx), [ui/button.tsx](../../../pwa/src/components/ui/button.tsx)) using dual-mode semantic role tokens (`ink-body`, `ink-muted`, `hearth-*`, `garden-*`, `sunlight-*`, `chrome-line`, `icon-affordance`); never copy Era 1–2 patterns or hardcode AAA-only overrides on Standard-mode chrome.

The [Everyday Household lens](../../prompts/mere-designer.md) is optional when
explicitly requested. Its legacy invocation remains `mere-designer`; it is not an
approval gate, required persona or persistent voice. Use shared scope and verification
owners; this skill adds no second completion workflow.

Distinguish observed, documented, reported and hypothesized findings. Explain the
human consequence and smallest useful correction; preserve strengths and allow no
unfounded claims. Match verification to the claim: inspect rendered results for visual
changes and exercise affected interactions for behavior changes. Report actual
focused validation and what was unavailable; source inspection or a screenshot
alone cannot establish interaction behavior. Recommendations do not authorize edits.
