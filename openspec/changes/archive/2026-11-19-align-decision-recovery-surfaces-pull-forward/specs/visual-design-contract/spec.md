# Spec Delta

## ADDED Requirements

### Requirement: Style inline decision, recovery, and status surfaces with Family Cookbook tokens

Inline decision panels, conflict recovery cards, and status or error banners SHALL use opaque Family Cookbook surfaces (`bg-white` with `border-chrome-line` or Hearth blush/border), shared `Button` variants, sentence-case `font-heading` headings, `>= 48 CSS px` interactive targets, and visible `ink-body` focus outlines.

#### Scenario: Neutral, hearth, and garden surface roles distinguish outcome states

- **WHEN** a Tier 1 inline decision, conflict recovery, or status surface renders for confirmation, pending progress, or failure recovery
- **THEN** neutral decision containers use opaque `bg-white` with `border-chrome-line`, quiet status notices use tonal Garden styling, and alert or conflict recovery cards use Hearth tint and border tokens with shared `Button` actions

#### Scenario: Interactive targets and focus outlines satisfy Standard AA and High Contrast AAA

- **WHEN** inline recovery buttons, close controls, retry triggers, and conflict toggles render in Standard and High Contrast modes
- **THEN** each interactive control exposes at least `48 × 48 CSS px` hit geometry, a visible `focus-visible` `ink-body` outline with at least `3:1` contrast, and composites passing `assertCookbookVisualA11y` at `'aa'` and `'aaa'`

#### Scenario: Narrow 320px viewports at 200% text scaling remain readable without overflow

- **WHEN** any Tier 1 decision or recovery surface renders at `320 CSS px` width with `200%` text scaling in English or French
- **THEN** button labels and recovery messages wrap cleanly without horizontal clipping or overflow (`scrollWidth <= clientWidth`)
