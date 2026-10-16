# Spec Delta

## Purpose

Adapt the household experience using member language and browsing preferences and member-specific preview resolution, while distinguishing browser choices from persisted member settings.

## ADDED Requirements

### Requirement: Initialize browser language from a supported local choice

Without a supported selected-member language, the application SHALL resolve English or French from a supported browser-local choice, falling back to the configured default. The default SHALL be French only when NEXT_PUBLIC_DEFAULT_LOCALE equals fr, and English otherwise. Browser language detection SHALL offer a choice rather than automatically replacing this locale.

#### Scenario: Browser has a supported saved choice
- **WHEN** the locale provider initializes with browser-local locale en or fr and no supported member preference
- **THEN** that saved locale is used

#### Scenario: Browser choice is absent or unsupported
- **WHEN** the provider initializes without a supported saved locale and no supported member preference
- **THEN** it uses the configured default, including English for absent or other default values

### Requirement: Resolve language for the selected loaded member

A selected loaded member's en or fr preference SHALL take precedence over the provider's browser-local fallback. Switching selected members SHALL resolve against the newly selected loaded profile; a missing profile or unsupported member language SHALL use the local fallback.

#### Scenario: Member overrides browser choice
- **WHEN** a loaded selected member prefers French while the browser fallback is English
- **THEN** consumers of the resolved member locale receive French

#### Scenario: Switch member or lose a supported profile
- **WHEN** selection changes to a loaded member preferring English or to a member without a supported loaded preference
- **THEN** the resolved locale becomes English or the browser-local fallback respectively

### Requirement: Choose English or French on Profile

Profile SHALL offer English and French controls, distinguish the resolved selection, and save the chosen language in browser-local storage. With a selected member it SHALL also request that member's language preference update. Without a selected member it SHALL change only the browser-local choice.

#### Scenario: Select French for a member
- **WHEN** a person selects French on Profile with a selected member
- **THEN** French is saved locally and a preference update containing preferredLanguage fr is requested for that member

#### Scenario: Choose English without a member
- **WHEN** a person selects English with no selected member
- **THEN** English is saved locally without requesting a member preference update

### Requirement: Persist a language-only member update as current behavior

For an existing member, the current preference API implementation SHALL accept a request containing only preferredLanguage en or fr, persist that language, preserve the member name and browse mode, and return the updated profile. This describes the explicitly accepted implementation behavior despite the recorded OpenAPI required-field disagreement.

#### Scenario: Save French without a browse field
- **WHEN** an authorized PUT /api/family/{id}/preferences for an existing member supplies only preferredLanguage fr and persistence succeeds
- **THEN** the response returns that member with French and unchanged name and browse mode
- **AND** subsequent family reads expose the saved language

#### Scenario: Restore persisted choice after loading
- **WHEN** a browser reloads and successfully loads and selects a member whose saved language is English
- **THEN** the resolved member locale becomes English regardless of the browser-local fallback

### Requirement: Offer a browser-language proposal without persisting a member update

When neither a browser-local language choice nor a dismissal marker exists, the protected app SHALL offer a proposal after two seconds if the browser's primary language is English or French and differs from the resolved locale. Accepting SHALL save the local choice and dismissal; dismissing SHALL save dismissal without changing language. Neither action SHALL update the member preference API.

#### Scenario: Supported different browser language
- **WHEN** browser language is fr-FR, resolved locale is English and both local markers are absent
- **THEN** a French proposal appears after the delay

#### Scenario: Accept or dismiss the proposal
- **WHEN** the person accepts the proposal or dismisses it
- **THEN** the proposal closes and dismissal is remembered in that browser
- **AND** only acceptance saves the proposed local language, with no member preference API request

#### Scenario: Suppress an inapplicable proposal
- **WHEN** a local choice or dismissal marker exists, the primary browser language is unsupported, or it matches the resolved locale
- **THEN** initialization does not schedule a language proposal

### Requirement: Fall back to supplied translation text when a key is unavailable

Translation lookup SHALL use an explicitly supplied locale when present and otherwise the browser-local/default locale. When a key does not resolve to a string it SHALL return the caller's fallback text.

#### Scenario: Explicit locale and missing key
- **WHEN** a translation is requested with an explicit supported locale and its key is absent or not a string
- **THEN** the supplied fallback text is returned

#### Scenario: Lookup without explicit locale
- **WHEN** translation is requested without an explicit locale
- **THEN** lookup uses the supported browser-local choice or configured default
