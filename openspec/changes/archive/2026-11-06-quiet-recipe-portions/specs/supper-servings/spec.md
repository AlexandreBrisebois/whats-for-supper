## MODIFIED Requirements

### Requirement: Report incomplete scaling without invented quantities

Missing basis, unreliable amounts and stale source SHALL remain truthful in authoritative projections, without invented quantities or complete partial totals. Recipe detail SHALL retain original text and missing-basis correction but omit generic review warnings and replacement cues. Other consumers retain their feedback. Intentional unquantified directions remain normal text; usable contributions scale independently. Reads/calculation SHALL NOT call AI.

#### Scenario: Salt to taste is normal recipe content
- **WHEN** an ingredient says salt to taste or oil for frying
- **THEN** its original direction remains normal text without a correction warning or invented number

#### Scenario: Yield is missing
- **WHEN** a dated recipe has no reliable original serving basis
- **THEN** original quantities remain visible and no complete scaled amount is claimed; recipe detail offers Set recipe portions with its saved-change explanation in the editor, while other consumers retain their existing correction/original feedback

#### Scenario: Ingredient text was edited independently
- **WHEN** current ingredient text no longer agrees with the structured supply's source basis
- **THEN** stale supply quantities are not presented as current scaled needs and the response remains unresolved; recipe detail retains original text/inspection without a generic review warning or replacement cue, while other consumers retain their existing correction/re-import feedback

#### Scenario: Remove generic detail review without changing completeness
- **WHEN** a recipe-detail preview has usable numeric lines and unreliable lines
- **THEN** verified lines scale and other lines retain original text, with no generic amounts-review row, reserved warning space, icon, badge, tooltip or color substitute
- **AND** authoritative partial/completeness data and grocery subtotal/prior-unknown warnings remain unchanged; no all-amounts-adjusted claim is added

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
- **THEN** the response exposes the unresolved condition without an invented factor or complete total; recipe detail offers missing-basis correction when applicable and retains unreliable lines verbatim without generic review warnings or replacement cues
- **AND** reliable lines and intentionally unquantified text retain the shared projection policy, with original evidence accessible

#### Scenario: Correction after an earlier preview
- **WHEN** a recipe basis or ingredient source changes while a preview is being read
- **THEN** late results cannot be presented as the current recipe projection and subsequent previews use the current saved recipe basis

### Requirement: Share one authoritative projection across consumers

Home assigned ingredients, proposed-date detail, assigned detail, cooking and groceries SHALL share server-owned scaling rules and dated portions. Temporary recipe previews SHALL use those same rules with an explicit independent count, without becoming saved date/preparation context. Assigned reads SHALL reject stale occurrence identity. Legacy original reads remain compatible; no read SHALL assign, save portions or materialize preparation.

#### Scenario: Plan and cook for six
- **WHEN** a recipe with basis two and 200 g pasta is planned for six
- **THEN** dated detail and cooking show 600 g and its grocery contribution is 600 g

#### Scenario: Proposed date before assignment
- **WHEN** an unassigned candidate is read for a date configured for four
- **THEN** its default dated projection uses four without requiring assignment or changing saved state

#### Scenario: No selected or proposed date
- **WHEN** recipe reading has no date context
- **THEN** its default is original quantities and an explicitly selected 2/4/6 preview remains a separate read-only projection

#### Scenario: Home ingredients and dated Cook agree
- **WHEN** Home Tonight and Cook refer to the same captured assigned recipe, date and effective portions
- **THEN** Home uses the shared dated projection with the same reliable amounts and completeness before display rounding, including frozen prepared portions
- **AND** late results from an earlier recipe/date/occurrence cannot replace the current list; pending, failure or changed-plan state is explicit rather than labeling original strings as scaled
- **AND** opening the ingredient list performs no assignment, portions, grocery, preparation or completion write
