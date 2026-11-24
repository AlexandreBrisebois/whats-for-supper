# Spec Delta

## MODIFIED Requirements

### Requirement: Confirm and lock failed-capture clearing

Activating a row's Clear icon control SHALL reveal an inline confirmation state for that row (`bg-white` with `border-hearth-line`, never a native browser `window.confirm` dialog) presenting localized consequence copy and an equal two-column button pair: `Keep` (`variant="secondary"`, left) and `Clear capture` (`variant="danger"` blush with trash icon, right) before sending `DELETE /api/captures/failures/{id}` using the loaded failure ID. Activating `Keep` SHALL dismiss the inline confirmation without sending a clear request. After accepting `Clear capture`, Clear SHALL be disabled for that row until the request settles. This per-row lock SHALL NOT imply locking Retry or coordinating concurrent retry and clear requests.

#### Scenario: Cancel clear confirmation

- **WHEN** a person activates a row's Clear trigger and then activates `Keep`
- **THEN** the row returns to its normal `Retry` and Clear controls without invoking `window.confirm` and no `DELETE` request is sent

#### Scenario: Confirm clear and wait

- **WHEN** a person activates `Clear capture` in the inline confirmation row
- **THEN** `DELETE` targets the failure ID and that row's Clear confirmation controls are disabled while awaiting its result

### Requirement: Keep failed-capture controls readable and touch-accessible

Failed-capture rows in Settings SHALL use sentence-case headings and source preview text of at least `12 CSS px`, accessible Family Cookbook contrast, and `>= 48 CSS px` touch targets across all actions. In normal state, each row SHALL place `Retry` (`flex-1` primary Hearth) on the left and separate the `48 × 48 CSS px` blush-danger `Clear failed capture` trash button to the trailing right edge; in inline confirmation state, `Keep` and `Clear capture` SHALL render side by side with safe `Keep` on the left and danger-blush `Clear capture` on the right.

#### Scenario: Household member reviews or clears a failed capture on mobile

- **WHEN** Settings displays one or more paused capture failures on viewports down to `320 CSS px`
- **THEN** section labels, friendly reasons, and preview snippets render at `>= 12 CSS px`, `Retry` fills the primary left span separated from the trailing `48 × 48 CSS px` Clear button, and activating Clear reveals `>= 48 CSS px` `Keep` (left) and `Clear capture` (right) controls without horizontal overflow

### Requirement: Present active session failure banners with dual-mode contrast and localization

Active session capture-failure banners (`RecipeFailureBanner`) SHALL render as calm Era 3 Hearth recovery cards (`bg-terracotta-50` with `border-hearth-line`, without a `border-l-4` stripe or a duplicate top-right close icon), adapt automatically to Standard AA and High Contrast AAA semantic roles, display localized EN/FR copy without em-dashes matching the active member locale, keep `Retry` (primary) and single `Dismiss` (secondary) hit areas at least `48 × 48 CSS px` with visible focus indicators, and honor reduced motion.

#### Scenario: Active session failure banner renders in Standard and High Contrast modes

- **WHEN** an active session `recipe_failed` banner is displayed under French or English locale in either `standard` or `high` contrast mode
- **THEN** it renders as a single-dismiss Hearth recovery card without a left-border stripe or duplicate `X` button, its localized copy contains no em-dashes, its text, borders, and `Retry` / `Dismiss` controls meet AA (`standard`) or AAA (`high`) contrast ratios with `>= 48 × 48 CSS px` targets and visible `focus-visible` outlines, and entry/exit motion honors `prefers-reduced-motion: reduce`
