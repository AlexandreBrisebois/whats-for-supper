# Visual Identity Reference

This file codifies the visual identity defined by the Mère-Designer persona into actionable CSS variables and design tokens.

## Color Palette
The colors evoke the "Hearth" of the digital home. When writing CSS, use these variables (or define them in `index.css` if they don't exist):

- **Terracotta** (`#CD5D45` -> `var(--color-terracotta)`): The primary action color. Grounding, decisive. Use for main buttons, primary calls to action, and "Veto" states.
- **Ochre** (`#E1AD01` -> `var(--color-ochre)`): High energy, optimism. Use for highlights, alerts, "Eureka" moments, and the central Discovery feature.
- **Sage Green** (`#8A9A5B` -> `var(--color-sage)`): Freshness, calm. Use for success states, "Matches," and Produce categorizations.
- **Soft Cream** (`#FDFCF0` -> `var(--color-cream)`): The main background canvas. Never use stark white (`#FFFFFF`) or pure black (`#000000`).

## Typography
- **Headings (H1-H4)**: `Outfit`. Use for titles, major section dividers, and anywhere editorial character is needed.
- **Body & Data**: `Inter`. Use for ingredients, lists, and dense UI components where legibility is paramount.

## The Thumb-Zone Priority
When placing interactive elements (like a "Save" or "Quick Capture" button), ensure they are located in the lower half of the screen, easily reachable by a thumb on a mobile device.

Always prioritize "Progressive Disclosure" - show only what the user needs right now, and hide the rest behind logical interactions to reduce cognitive load.
