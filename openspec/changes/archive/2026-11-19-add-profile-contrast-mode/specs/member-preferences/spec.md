# Spec Delta

## MODIFIED Requirements

### Requirement: Return member preference defaults and saved values

For successful authorized family list and current-member reads, the API SHALL expose each member's browse mode, saved language, nullable cooking view, and nullable contrast mode (`standard` or `high`). New members SHALL start with `list`, unset language, unset cooking view, and unset contrast mode; clients SHALL resolve unset cooking view as All steps and unset contrast via OS `prefers-contrast: more` (`high`, else `standard`).

#### Scenario: Read a new member

- **WHEN** a newly created member is returned by a successful family read
- **THEN** browseViewMode is `list`, preferredLanguage, cookingViewMode, and contrastMode are unset, cooking uses All steps, and contrast resolves from OS `prefers-contrast: more`

#### Scenario: Read saved preferences

- **WHEN** the requested existing member has saved `stack` mode, French language, and `high` contrast mode
- **THEN** successful family list and current-member responses represent `stack`, `fr`, and `high` for that member

### Requirement: Persist contract-valid member preference updates

For an existing target member, authorized PUT /api/family/{id}/preferences SHALL update only supplied contract-valid properties: browseViewMode (`stack` or `list`), preferredLanguage (`en` or `fr`), cookingViewMode (`step-by-step` or `all-steps`), and contrastMode (`standard` or `high`). Omitted preferences and the member name SHALL be preserved. The response and later family reads SHALL return the committed profile. At least one preference SHALL be supplied.

#### Scenario: Save both preferences

- **WHEN** a request for an existing member supplies browseViewMode list and preferredLanguage fr and persistence succeeds
- **THEN** the API returns the same member ID and name with list and fr in data and later family reads expose those values

#### Scenario: Save browse mode alone

- **WHEN** a request for a French-preferring member supplies browseViewMode stack without language and persistence succeeds
- **THEN** the returned and subsequently read profile has stack mode and retains fr

#### Scenario: Save cooking view alone

- **WHEN** a request supplies cookingViewMode step-by-step and omits browse mode, language, and contrast mode
- **THEN** the saved cooking view is step-by-step while the member name, browse mode, language, and contrast mode remain unchanged

#### Scenario: Save contrast mode alone

- **WHEN** a request supplies contrastMode high and omits browse mode, language, and cooking view
- **THEN** the saved contrastMode is high while the member name, browse mode, language, and cooking view remain unchanged
- **AND** subsequent family reads expose high for that member

### Requirement: Reject invalid preferences and unavailable targets

The preference API SHALL return 400 for an unsupported supplied preference or an empty update and 404 for a nonexistent target member. Rejection SHALL not be presented by the client as a successful saved preference.

#### Scenario: Unsupported browse value

- **WHEN** a request for an existing member supplies browseViewMode carousel
- **THEN** the API returns 400

#### Scenario: Unsupported cooking view

- **WHEN** a request for an existing member supplies cookingViewMode carousel
- **THEN** the API returns 400 without changing any saved preference

#### Scenario: Unsupported contrast mode

- **WHEN** a request for an existing member supplies contrastMode ultra
- **THEN** the API returns 400 without changing any saved preference

#### Scenario: Target does not exist

- **WHEN** a preference update targets a nonexistent member ID
- **THEN** the API returns 404

## ADDED Requirements

### Requirement: Resolve contrast mode for the selected loaded member

A selected loaded member's saved `standard` or `high` contrast preference SHALL take precedence over browser-local storage and OS settings. When a selected loaded member's contrast preference is unset, the application SHALL resolve `high` if OS `prefers-contrast: more` matches and `standard` otherwise, updating immediately on member switches or OS changes.

#### Scenario: Member explicit preference overrides OS contrast

- **WHEN** OS `prefers-contrast: more` matches and the selected loaded member has saved contrastMode `standard`
- **THEN** the resolved root document contrast mode is `standard`

#### Scenario: Unset member follows OS prefers-contrast more

- **WHEN** the selected loaded member has unset contrastMode (`null`) and OS `prefers-contrast: more` matches
- **THEN** the resolved root document contrast mode is `high`
- **AND** when OS `prefers-contrast: more` does not match, the resolved root document contrast mode is `standard`

#### Scenario: Switch from high-contrast member to unset member clears inherited contrast

- **WHEN** active member selection switches from a loaded member with `high` contrast to another loaded member with unset contrastMode (`null`) while OS `prefers-contrast: more` does not match
- **THEN** the root document contrast mode changes immediately to `standard` without inheriting the previous member's `high` preference

#### Scenario: Live OS contrast change updates an unset member

- **WHEN** the selected loaded member has unset contrastMode (`null`) and the OS `prefers-contrast: more` media query changes
- **THEN** the root document contrast mode updates immediately without a page reload

### Requirement: Initialize contrast mode before first paint using local fallback and OS preference

Before member profiles load or when no member is selected, the application SHALL set `data-contrast` (`standard` or `high`) on the root document before interactive hydration using a supported browser-local choice when present, and otherwise the OS `prefers-contrast: more` setting. Storage denial SHALL fall back safely to OS preference.

#### Scenario: Reload restores active member contrast without flash

- **WHEN** an active member resolved `high` contrast and the browser reloads
- **THEN** the root document carries `data-contrast="high"` before interactive hydration without flashing `standard` first

#### Scenario: Fresh browser without saved choice follows OS contrast

- **WHEN** a browser initializes with no stored local contrast choice and no loaded member
- **THEN** the root document resolves `data-contrast="high"` when OS `prefers-contrast: more` matches and `data-contrast="standard"` otherwise

#### Scenario: Browser storage denial falls back safely

- **WHEN** reading or writing browser-local storage throws an error during initialization or preference switching
- **THEN** contrast resolution falls back to OS preference and in-memory state without runtime failure

### Requirement: Present Profile contrast as a readable preference choice

Profile SHALL present a Contrast group directly below Language with sentence-case `Standard` and `High contrast` choices (`Standard` and `Contraste élevé` in French), each at least 48 CSS px tall. The resolved choice SHALL expose pressed state true, a tonal selected surface, and a non-colour check cue; the other choice SHALL remain visibly enabled.

#### Scenario: Standard is the resolved contrast mode

- **WHEN** Profile resolves `standard` contrast in English
- **THEN** a `Contrast` group appears directly below `Language`
- **AND** `Standard` exposes a tonal selected surface, a visible check cue, and pressed state true
- **AND** `High contrast` exposes pressed state false and remains visibly available

#### Scenario: High contrast is the resolved contrast mode in French

- **WHEN** Profile resolves `high` contrast in French
- **THEN** a `Contraste` group appears directly below `Langue`
- **AND** `Contraste élevé` exposes the selected surface, check cue, and pressed state true
- **AND** `Standard` exposes pressed state false, and both complete labels wrap cleanly without horizontal overflow at 320 CSS px and 200 percent text scaling

### Requirement: Persist Profile contrast selection without altering navigation or member selection

Choosing a contrast option on Profile SHALL apply immediately, persist locally when unselected, and request a member `contrastMode` update when a member is selected. It SHALL NOT change the selected member, navigate away from Profile, or announce remote-save success; rejected saves SHALL reconcile via existing preference rollback.

#### Scenario: Select High contrast for a selected member

- **WHEN** a person activates High contrast on Profile with a selected member
- **THEN** root `data-contrast` updates to `high` immediately and PUT `/api/family/{id}/preferences` is requested with `{"contrastMode":"high"}`
- **AND** Profile retains the active member and route without announcing remote-save success

#### Scenario: Select High contrast without a selected member

- **WHEN** a person activates High contrast on Profile with no selected member
- **THEN** the browser-local choice and root `data-contrast` update to `high` without requesting a preference API update or navigating away

#### Scenario: Rejected contrast save reconciles to prior member state

- **WHEN** a member contrast update request is rejected by the API
- **THEN** existing preference rollback restores the prior member contrast preference
- **AND** root `data-contrast` and Profile's pressed choice reconcile to the prior resolved contrast without announcing remote-save success
