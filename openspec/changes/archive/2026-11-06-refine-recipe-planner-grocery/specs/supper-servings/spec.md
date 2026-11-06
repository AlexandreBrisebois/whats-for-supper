## MODIFIED Requirements

### Requirement: Share one authoritative projection across consumers

Proposed-date detail, assigned detail, cooking and groceries SHALL share server-owned scaling rules and dated portions. Temporary recipe previews SHALL use those same rules with an explicit independent count, without becoming saved date/preparation context. Assigned reads SHALL reject stale occurrence identity. Legacy original reads remain compatible; no read SHALL assign, save portions or materialize preparation.

#### Scenario: Plan and cook for six
- **WHEN** a recipe with basis two and 200 g pasta is planned for six
- **THEN** dated detail and cooking show 600 g and its grocery contribution is 600 g

#### Scenario: Proposed date before assignment
- **WHEN** an unassigned candidate is read for a date configured for four
- **THEN** its default dated projection uses four without requiring assignment or changing saved state

#### Scenario: No selected or proposed date
- **WHEN** recipe reading has no date context
- **THEN** its default is original quantities and an explicitly selected 2/4/6 preview remains a separate read-only projection

### Requirement: Preserve confirmed prepared portions

Explicit preparation SHALL freeze the occurrence's effective portions or its unconfigured original-basis context. Later usual-portion changes SHALL not rescale that prepared meal. Prepared dates SHALL be read-only in Portions. No separate leftovers amount SHALL travel with a meal; unprepared movement continues to use the destination date's portions.

#### Scenario: Default changes after preparation
- **WHEN** Friday lasagna was prepared Tuesday for six and the household default later changes to four
- **THEN** Friday retains six prepared portions and its ingredient/grocery contribution is not reduced by that default edit

## ADDED Requirements

### Requirement: Keep previews independent of saved serving and preparation state

An explicit 2/4/6 preview SHALL project the identified recipe's reliable quantities from its saved positive basis. It SHALL return its basis, target and completeness without dated write/preparation authority. A preview SHALL never save recipe quantities, defaults, overrides, assignments, prepared snapshots, grocery totals or check state, and SHALL not trigger grocery refresh work.

#### Scenario: Repeated preview and odd saved count
- **WHEN** a recipe planned for five is previewed for two, six and four repeatedly
- **THEN** each preview derives from original amounts, five remains saved, and neither repeated reads nor display rounding compound quantities

#### Scenario: Preview an already prepared supper
- **WHEN** a supper has frozen prepared portions seven and a different preview is selected
- **THEN** seven and the actual preparation date remain saved and identifiable, while the separate preview grants no new completion or portions-editing action

#### Scenario: Missing basis and partial ingredients
- **WHEN** the recipe lacks a valid basis or contains unreliable amount/source data
- **THEN** the response and UI expose the unresolved condition without an invented factor or complete total
- **AND** reliable lines and intentionally unquantified text retain the shared projection policy, with original evidence accessible

#### Scenario: Correction after an earlier preview
- **WHEN** a recipe basis or ingredient source changes while a preview is being read
- **THEN** late results cannot be presented as the current recipe projection and subsequent previews use the current saved recipe basis

### Requirement: Keep preview errors separate from planning recovery

Preview validation, unavailable recipe and read failures SHALL remain explicit and retryable where appropriate. A failed preview SHALL not imply a saved portions change failed, clear a planning recovery stage or overwrite a good dated/prepared context. Unsupported preview counts SHALL be rejected without writes.

#### Scenario: Preview fails while dated context is loaded
- **WHEN** a six-portion preview fails for a recipe planned for five
- **THEN** failure offers retry or return to planned quantities and does not label stale preview numbers as six or invalidate the five-portion plan

#### Scenario: Invalid request or unknown recipe
- **WHEN** a preview request has an unsupported target or an unavailable recipe identity
- **THEN** the read fails with the documented validation/not-found result and no saved state or refresh job changes
