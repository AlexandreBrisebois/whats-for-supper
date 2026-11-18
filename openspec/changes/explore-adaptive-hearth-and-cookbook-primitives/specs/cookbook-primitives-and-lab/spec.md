# Spec Delta

## Purpose

Define the six locked semantic Cookbook UI primitives, native modal dialog contract, perceptual OKLCH token layer, and non-production four-energy bilingual specimen lab for rapid visual and ergonomic validation.

## ADDED Requirements

### Requirement: Define perceptual OKLCH lightness and warm-ink token contracts

The stylesheet SHALL define semantic CSS tokens using native `oklch(L C H)` values (with sRGB fallbacks) across warm paper surfaces, warm umber ink hierarchy (`>= 14:1` primary body, `>= 7:1` secondary, `>= 4.5:1` quiet metadata), Hearth terracotta actions, Sunlight ochre voting highlights, and Garden sage status pairs. Reading cards SHALL use warm surface layering and ambient umber elevation without `backdrop-blur`.

#### Scenario: Tokens maintain perceptual legibility across surfaces
- **WHEN** `Typography`, `Action`, and `StatusBadge` tokens resolve against `--paper-canvas` or `--paper-card`
- **THEN** every body, caption, badge, and action pairing satisfies WCAG 2.2 AA contrast without relying on semi-transparent black opacity washes or reading-card blur

### Requirement: Compose screens through the six semantic Cookbook Primitives

Prototype routes SHALL render UI exclusively through six semantic primitives (`EnergyShell`, `CookbookCard`, `CookbookSheet`, `Typography`, `Action`, `StatusBadge`) parameterized by household energy and semantic role, without raw palette color, micro-font, or ad-hoc card-radius Tailwind classes in feature files.

#### Scenario: Prototype route attempts raw styling bypass
- **WHEN** a prototype route file outside `pwa/src/components/cookbook/` introduces raw palette colors or `< 12px` font utilities
- **THEN** the automated visual contract check rejects the route until replaced with semantic Cookbook Primitives

### Requirement: Implement CookbookSheet on native modal dialog semantics

`CookbookSheet` SHALL wrap the native HTML `<dialog>` top-layer element using `showModal()`, support keyboard `Tab` focus flow and `Escape` / outside-backdrop dismissal only when no blocking mutation or partial-completion guard forbids closing, restore focus to the invoking trigger on close, and keep scrollable content above virtual keyboards inside `100dvh`.

#### Scenario: Member opens and dismisses a non-pending sheet via keyboard
- **WHEN** a member activates a trigger that opens `CookbookSheet`, presses `Tab`, and presses `Escape` while idle
- **THEN** focus moves inside the top-layer dialog, background content is inert, and pressing `Escape` closes the sheet and returns focus to the triggering control

#### Scenario: Sheet guards unconfirmed replacement work on Escape
- **WHEN** `CookbookSheet` hosts an active mutation or partial-completion state marked non-dismissible
- **THEN** pressing `Escape` or clicking the backdrop invokes the explicit confirmation/guard handler instead of silently discarding state

### Requirement: Expose a development-only four-energy bilingual specimen lab

The route `/dev/cookbook-lab` SHALL render all four Household Energies (`Playful Convergence`, `Reflective Curation`, `In-Motion Utility`, `Depleted Execution`) in English and French across `320px` (200% text), `390px`, and `834px` viewports with interactive state toggles during development/exploration runs, and SHALL return HTTP `404` when built for standard production.

#### Scenario: Developer inspects all four energies in English and French
- **WHEN** `/dev/cookbook-lab` is opened in development/exploration mode and switched between EN and FR or household states
- **THEN** canonical card, sheet, navigation, discovery, grocery, and 5:00 PM views render cleanly with zero horizontal overflow, `>= 48 CSS px` targets, and passing computed WCAG contrast

#### Scenario: Production runtime blocks specimen route
- **WHEN** `/dev/cookbook-lab` is requested under a production build (`NODE_ENV === 'production'` without explicit lab opt-in)
- **THEN** the application returns `404` not found without exposing exploration fixtures
