## ADDED Requirements

### Requirement: Export serving intent independently of recipe quantities

Ordinary export SHALL replace a versioned supper-servings.json containing the explicitly configured household default or null and all retained date overrides, inherited snapshots, concurrency versions and timestamps. An empty collection SHALL replace older exported dates. Recipe exports SHALL retain their original basis and ingredient quantities rather than a planned projection.

#### Scenario: Export six on an empty date
- **WHEN** a future empty Saturday has override six and the household default is four
- **THEN** export retains both facts independently of calendar recipe entries and recipe amounts

### Requirement: Merge serving exports without inventing portions

Supported ordinary merge restore SHALL upsert dated serving state by absolute date, validate counts and preserve represented overrides/snapshots. A present valid default, including explicit null, SHALL be restored. Missing legacy serving artifacts SHALL preserve destination serving state. Malformed/unsupported artifacts SHALL be reported and not partially applied. Repeating the same valid restore SHALL NOT duplicate dates.

#### Scenario: Legacy or invalid artifact
- **WHEN** the serving artifact is missing, malformed or unsupported
- **THEN** legacy absence leaves destination counts unchanged and invalid present content is reported without replacing them

#### Scenario: Repeated valid merge
- **WHEN** the same supported artifact is restored twice
- **THEN** one serving record exists per date with the represented default, exceptions and snapshots

### Requirement: Include serving state in independent exact recovery and demo lifecycle

Exact recovery SHALL include serving dates and the household default under its consistent snapshot boundary. Its version/schema preflight SHALL reject missing required state before publication. Successful exact restore SHALL reproduce portions membership, not merge destination-only overrides. Demo reset SHALL clear visitor date edits and restore the prepared baseline's declared usual size, with no invented profile-derived count.

#### Scenario: Exact snapshot is incomplete
- **WHEN** a format requiring supper serving state lacks its dated artifact/table
- **THEN** preflight fails before live publication without changing destination counts or plans

#### Scenario: Reset a demo edited for six
- **WHEN** a visitor changes a demo date to six and reset completes
- **THEN** visitor overrides are removed, the prepared usual-size setting is restored and the baseline plan/groceries remain coherent

### Requirement: Preserve actual preparation and frozen portions through recovery

Calendar exports and supported restore modes SHALL retain occurrence identity, actual preparation date and frozen prepared portion context. Exact recovery SHALL reproduce them; ordinary merge SHALL preserve their represented association. Legacy absence SHALL not fabricate actual preparation. Demo reset SHALL restore the prepared baseline and clear visitor preparation changes under its declared policy.

#### Scenario: Restore Friday prepared Tuesday
- **WHEN** Friday lasagna was prepared Tuesday for six portions and its backup is restored
- **THEN** Friday still shows Already prepared and Prepared Tuesday with six prepared portions; neither a second occurrence nor a Friday cooking-history date is invented

#### Scenario: Legacy Cooked entry
- **WHEN** an older export has Cooked status without actual preparation metadata
- **THEN** restore preserves that status without claiming an observed preparation date
