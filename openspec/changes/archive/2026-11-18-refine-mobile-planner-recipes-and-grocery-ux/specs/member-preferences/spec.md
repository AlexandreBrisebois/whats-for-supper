## MODIFIED Requirements

### Requirement: Initialize library presentation from the selected member

On library entry without a page-local override for the selected member, the application SHALL choose `stack` presentation when that loaded member's saved browse mode is `stack`, and `list` presentation otherwise.

#### Scenario: Saved list selection
- **WHEN** the library opens with a loaded selected member whose browse mode is `list` and no applicable local override
- **THEN** it selects list presentation

#### Scenario: Missing or other saved mode
- **WHEN** the library opens without a matching loaded member or without a saved `stack` preference and no applicable local override
- **THEN** it selects list presentation

#### Scenario: Saved stack selection
- **WHEN** the library opens with a loaded selected member whose saved browse mode is `stack` and no applicable local override
- **THEN** it selects stack presentation

### Requirement: Return member preference defaults and saved values

For successful authorized family list and current-member reads, the API SHALL expose each returned member's browse mode, saved language and nullable cooking view preference. Newly created members SHALL start with `list` mode, no preferred language and no explicit cooking view; clients SHALL interpret an absent cooking view as All steps.

#### Scenario: Read a new member
- **WHEN** a newly created member is returned by a successful family read
- **THEN** browseViewMode is `list`, preferredLanguage and cookingViewMode are unset, and cooking uses All steps

#### Scenario: Read saved preferences
- **WHEN** the requested existing member has saved `stack` mode and French language
- **THEN** successful family list and current-member responses represent `stack` and `fr` for that member
