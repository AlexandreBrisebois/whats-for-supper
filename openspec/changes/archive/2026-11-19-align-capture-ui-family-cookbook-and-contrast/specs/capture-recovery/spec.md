# Spec Delta

## ADDED Requirements

### Requirement: Present active session failure banners with dual-mode contrast and localization

Active session capture-failure banners (`RecipeFailureBanner`) SHALL adapt automatically to Standard AA and High Contrast AAA semantic roles, display localized EN/FR copy matching the active member locale, keep Retry and Dismiss hit areas at least `48 × 48 CSS px` with visible focus indicators, and honor reduced motion.

#### Scenario: Active session failure banner renders in Standard and High Contrast modes

- **WHEN** an active session `recipe_failed` banner is displayed under French or English locale in either `standard` or `high` contrast mode
- **THEN** its copy renders in the active locale, its text, borders, and Retry/Dismiss controls meet AA (`standard`) or AAA (`high`) contrast ratios, all buttons are at least `48 × 48 CSS px` with visible `focus-visible` outlines, and entry/exit motion honors `prefers-reduced-motion: reduce`
