# Spec Delta

## ADDED Requirements

### Requirement: Use saved provenance for contextual URL repair

Eligible contextual repair of a recipe with a saved source URL SHALL supply that URL, recipe identity and normalized feedback to URL processing. Image-only repair SHALL retain its image-processing path. Existing eligibility, repeated-feedback suppression and saved-report launch-failure recovery SHALL continue to apply. Launch acceptance SHALL NOT imply completed processing or corrected content.

#### Scenario: Launch with stored URL
- **WHEN** a known member submits Ingredients or Steps with a nonblank note for a URL recipe, without a matching prior attempt, and workflow persistence succeeds
- **THEN** one linked URL attempt contains the saved URL, recipe identity and normalized feedback, and submission returns its ID with reimportStarted true

#### Scenario: Reuse or change contextual feedback
- **WHEN** identical feedback is resubmitted during an active URL attempt or after it becomes terminal
- **THEN** the active attempt is reused or the terminal retry is suppressed respectively; changed eligible terminal feedback can start a new URL attempt

#### Scenario: Recover a launch failure
- **WHEN** URL workflow launch fails before an attempt is created and the person saves again after that failure is resolved
- **THEN** the report remains saved, the failed response exposes launch failure without an import ID, and the later eligible submission can start one linked attempt using the saved URL

#### Scenario: Preserve manual and image reporting
- **WHEN** feedback contains Duplicate, lacks a nonblank note, or is eligible image-only feedback
- **THEN** the first two cases remain manual-only and eligible image-only feedback uses image processing without a fabricated URL
