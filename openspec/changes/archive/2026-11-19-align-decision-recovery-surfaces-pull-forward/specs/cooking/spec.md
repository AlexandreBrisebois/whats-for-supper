# Spec Delta

## MODIFIED Requirements

### Requirement: Preserve cooking work when serving context changes remotely

Before the cook checks ingredients, advances instructions, or edits steps, remote serving or recipe revisions SHALL apply automatically without interrupting cooking. Once cooking work is underway, Cook's Mode SHALL preserve checks, position, and drafts, unify updated-quantities and preparation review into a single Era 3 bar with one pull-forward `<Button>`, and style inline projection/completion/step/view errors with Family Cookbook tokens.

#### Scenario: Remote update before cooking progress applies automatically

- **WHEN** another household member changes dated servings or recipe content before the cook has checked any ingredient, navigated away from the initial step, or started editing a step
- **THEN** Cook's Mode updates to the latest coherent projection automatically without displaying a manual `Refresh quantities` prompt

#### Scenario: Portions increase while cooking is open

- **WHEN** the cook has already checked ingredients, advanced steps, or opened a step draft and another household member changes that supper from four to six
- **THEN** Cook's Mode preserves the cook's checks, position, and draft and displays a single Era 3 bar with one pull-forward `<Button>` to refresh quantities cleanly

#### Scenario: Preparation conflict unifies with quantity refresh into one Era 3 bar

- **WHEN** preparation submission detects changed quantities or a plan conflict while cooking work is underway
- **THEN** Cook's Mode surfaces one unified Era 3 Hearth bar with one primary pull-forward `<Button>` (`Refresh quantities` or `Review current supper`) rather than stacking two separate recovery bars

#### Scenario: Inline cooking errors use Family Cookbook tokens and 48px Retry buttons

- **WHEN** dated projection loading, step editing, cooking completion, or saving cooking view preference fails
- **THEN** each inline alert uses Hearth styling and `>= 48 CSS px` shared `<Button>` retry actions with `outline-ink-body` focus rings
