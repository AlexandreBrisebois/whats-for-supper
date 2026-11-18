# Spec Delta

## ADDED Requirements

### Requirement: Keep failed-capture controls readable and touch-accessible

Failed-capture rows in Settings SHALL use sentence-case headings and source preview text of at least `12 CSS px`, accessible Family Cookbook contrast, and `>= 48 CSS px` touch targets on both Retry and Clear failed capture actions.

#### Scenario: Household member reviews or clears a failed capture on mobile
- **WHEN** Settings displays one or more paused capture failures
- **THEN** section labels, friendly reasons, and preview snippets render at `>= 12 CSS px` and Retry and Clear controls each provide at least `48 × 48 CSS px` hit areas
