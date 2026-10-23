# Member preferences Specification

## Purpose

Adapt the household experience using member language and browsing preferences and member-specific preview resolution, while distinguishing browser choices from persisted member settings.

Promotion MP-P01 (2026-10-16) accepts the five member-preferences deltas selected
by the user: language-selection, browse-selection, api-persistence, preview-choices
and preview-resolution. Their 26 requirements and 57 scenarios are promoted without
changing their wording. Evidence BSL-member-preferences-001–016, source identities,
actual test substitutions and mappings remain in the [capability plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/member-preferences.md).

U-MP01–13 and X-MP01–04 remain non-normative limitations and exclusions, including
browser/member translation divergence, save/refresh races, deployment/build input
qualification, contract requiredness/error/nullability disagreements and owner
boundaries. The language-only implementation behavior was explicitly accepted;
that decision does not amend OpenAPI. A10 implementation support is not runtime
verification. Runtime/API/PostgreSQL/browser/device qualification remains not-run
under A34. Source changes remain active; no archival or application edits occur.

## Requirements

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

### Requirement: Initialize library presentation from the selected member

On library entry without a page-local override for the selected member, the application SHALL choose list presentation when that loaded member's saved browse mode is list, and stack presentation otherwise.

#### Scenario: Saved list selection
- **WHEN** the library opens with a loaded selected member whose browse mode is list and no applicable local override
- **THEN** it selects list presentation

#### Scenario: Missing or other saved mode
- **WHEN** the library opens without a matching loaded member or without a saved list preference and no applicable local override
- **THEN** it selects stack presentation

### Requirement: Change browse presentation and request member persistence

The library SHALL offer stack and list controls. Choosing the other presentation SHALL switch immediately, reset the current card index and end-card state, and request the selected member's browseViewMode update when a member is selected. Selecting the active presentation SHALL leave the preference unchanged.

#### Scenario: Choose list from stack
- **WHEN** the person chooses list from stack with a selected member
- **THEN** list presentation is selected immediately, the card index resets to zero, end-card state clears and a member browseViewMode list update is requested

#### Scenario: Choose stack without a member
- **WHEN** the person chooses stack from list without a selected member
- **THEN** stack is selected locally without a preference API request

#### Scenario: Choose the already active presentation
- **WHEN** the person activates the selected presentation control
- **THEN** no new preference update is requested

### Requirement: Scope the browse override to its selected member

A page-local browse presentation choice SHALL take precedence over the saved mode only for the member selection associated with that choice. When another member is selected, the page SHALL resolve that member's saved mode unless an applicable page-local choice exists.

#### Scenario: Switch to another member
- **WHEN** a page-local list override belongs to one member and another loaded member with saved stack mode becomes selected
- **THEN** the other member is shown in stack presentation

### Requirement: Restore saved browse mode after a fresh load

After a successful browse preference save, a fresh library entry with a newly loaded selected member profile and no applicable page-local override SHALL use that member's saved mode. Saving browse mode SHALL preserve the member name and language.

#### Scenario: Reopen after successful list save
- **WHEN** list was saved successfully and the selected member profile is loaded on a fresh library entry
- **THEN** list presentation is selected with the saved member name and language unchanged

### Requirement: Return member preference defaults and saved values

For successful authorized family list and current-member reads, the API SHALL expose each returned member's browse mode and saved language preference when present. Newly created members SHALL start with stack mode and no preferred language.

#### Scenario: Read a new member
- **WHEN** a newly created member is returned by a successful family read
- **THEN** browseViewMode is stack and preferredLanguage is unset

#### Scenario: Read saved preferences
- **WHEN** the requested existing member has saved list mode and French language
- **THEN** successful family list and current-member responses represent list and fr for that member

### Requirement: Persist contract-valid member preference updates

For an existing target member, authorized PUT /api/family/{id}/preferences with stack or list and optional en or fr SHALL save the supplied preferences, preserve the member name and return the updated profile in data. A browse-only update SHALL preserve the saved language.

#### Scenario: Save both preferences
- **WHEN** a request for an existing member supplies browseViewMode list and preferredLanguage fr and persistence succeeds
- **THEN** the API returns the same member ID and name with list and fr in data and later family reads expose those values

#### Scenario: Save browse mode alone
- **WHEN** a request for a French-preferring member supplies browseViewMode stack without language and persistence succeeds
- **THEN** the returned and subsequently read profile has stack mode and retains fr

### Requirement: Reject invalid browse preferences and unavailable targets

The preference API SHALL return 400 for an existing member's unsupported browse mode and 404 for a nonexistent target member. Rejection SHALL not be presented by the client as a successful saved preference.

#### Scenario: Unsupported browse value
- **WHEN** a request for an existing member supplies browseViewMode carousel
- **THEN** the API returns 400

#### Scenario: Target does not exist
- **WHEN** a preference update targets a nonexistent member ID
- **THEN** the API returns 404

### Requirement: Reconcile a single client preference save with its response

For a loaded member, a single preference save SHALL optimistically update that member, replace it with the returned profile on success, and restore its prior profile and record an error on rejection. If the member is absent locally it SHALL return without sending the save. A response without a member ID SHALL count as a failed save.

#### Scenario: Save succeeds
- **WHEN** a loaded member preference is changed and a valid updated profile is returned
- **THEN** the optimistic profile is replaced with the confirmed returned profile

#### Scenario: Save rejects or response lacks identity
- **WHEN** a single save fails or returns no member ID
- **THEN** the prior loaded profile is restored and an error is recorded

#### Scenario: Target is not locally loaded
- **WHEN** a save is requested for a member absent from the local family list
- **THEN** no preference API request is sent

### Requirement: Load a member preview snapshot and clear previous choices

On protected-app member selection, the client SHALL clear its preview snapshot and load flags for that selection. With no selected member it SHALL keep an empty snapshot without a request. Window focus SHALL refresh the selected member's snapshot. While absent or loading, a feature with no enabled snapshot entry SHALL resolve disabled.

#### Scenario: Load or refresh a selected member
- **WHEN** a member becomes selected or the protected app receives window focus with a selected member
- **THEN** the previous snapshot clears and the client requests GET /api/feature-flags for the current member context

#### Scenario: Clear member selection
- **WHEN** selection becomes empty
- **THEN** the snapshot clears without a flag request and absent flags resolve disabled

### Requirement: Disclose only available opt-in preview controls

Settings SHALL show a collapsed Preview features section with the count of opt-in flags, omitting it when no opt-in flags and no load error exist. Expanding SHALL expose named switches and descriptions for opt-in flags only, with disclosure state and control association available to assistive technology.

#### Scenario: Opt-in flags are available
- **WHEN** Settings receives opt-in and fixed-mode flags
- **THEN** only opt-in flags contribute to the count and expanded named switches

#### Scenario: No available previews
- **WHEN** no opt-in flags and no snapshot error exist
- **THEN** Settings omits the section

### Requirement: Apply a preview choice only after confirmation

Changing an available preview switch SHALL send PATCH /api/feature-flags/{key} with enabled, retain the confirmed choice until success, disable duplicate pending changes for that flag and show saving feedback. Success SHALL replace that flag with the server response and announce the saved enabled or disabled state.

#### Scenario: Save is pending
- **WHEN** a member requests an available preview change and the request is pending
- **THEN** the confirmed switch value remains, the switch is disabled and saving feedback appears

#### Scenario: Save succeeds
- **WHEN** the server confirms a preview change
- **THEN** the confirmed response replaces the flag, pending state clears and saved enabled or disabled feedback is announced

### Requirement: Recover from preview load and save failures

A failed snapshot load SHALL clear flags and display a load-error alert with Retry in Settings. An ordinary save failure SHALL retain the confirmed choice, release pending state and offer retry feedback for that flag. A 409 save conflict SHALL refresh the snapshot and release the pending flag even if that refresh fails.

#### Scenario: Snapshot load fails and retries
- **WHEN** loading the member snapshot fails
- **THEN** absent flags resolve disabled and Settings displays an alert with Retry that requests another snapshot

#### Scenario: Save rejects
- **WHEN** a preview save rejects without 409
- **THEN** the confirmed choice remains, the switch becomes available again and save-error feedback offers another attempt

#### Scenario: Deployment changes during save
- **WHEN** a save returns 409
- **THEN** the client refreshes flags and clears pending state whether the refresh succeeds or fails

### Requirement: Discard preview results from a previous member selection

After selection changes, preview load and mutation responses or failures from an older member-selection generation SHALL not alter the current member's flags or errors. Switching away and back SHALL not make a prior generation's response current again.

#### Scenario: Previous member save resolves late
- **WHEN** a save for one selection resolves after another member has been loaded
- **THEN** it does not overwrite the current member's flags, pending changes or errors

#### Scenario: Switch away and back
- **WHEN** a member is deselected by switching to another member and later selected again before an old save resolves
- **THEN** that old save response is discarded

### Requirement: Show preview text using available translations and server fallback

Preview controls SHALL use catalog text for known preview names, descriptions and feedback in the active translation-lookup locale, and retain server-provided names and descriptions when the corresponding translation key is unavailable.

#### Scenario: French preview feedback
- **WHEN** translation lookup uses French for a known preview
- **THEN** its name, description, saving/error feedback and saved-state announcements use available French catalog text

#### Scenario: Unknown preview metadata
- **WHEN** an opt-in flag has server-provided metadata but no matching catalog entries
- **THEN** the controls use that server-provided metadata

### Requirement: Resolve registered preview deployment modes fail closed

For single-page-recipe-steps, the server SHALL read WFS_FEATURE_SINGLE_PAGE_RECIPE_STEPS. Modes SHALL be trimmed and case-insensitive. Missing, blank, off or invalid values SHALL resolve off; opt-in and on SHALL select those modes. The retired planner-hold-to-move and preview-pdf-recipe-import keys SHALL NOT be registered or returned, and their former deployment variables SHALL have no effect.

#### Scenario: Enabled and optional modes
- **WHEN** a registered preview is configured with padded uppercase ON or OPT-IN
- **THEN** the server resolves on or opt-in respectively

#### Scenario: Default or invalid mode
- **WHEN** a registered preview setting is missing, blank, off or unrecognized
- **THEN** it resolves off

### Requirement: Give deployment mode precedence over member overrides

An effective preview SHALL be enabled in on mode and disabled in off mode regardless of any stored member override. In opt-in mode it SHALL use the member's stored boolean choice, defaulting to disabled without a choice. Fixed-mode flags SHALL not offer an editable opt-in choice; opt-in snapshots SHALL provide the choice, name and description.

#### Scenario: Fixed modes ignore stored choices
- **WHEN** a saved member choice is false in on mode or true in off mode
- **THEN** effective enabled is true or false respectively and the fixed-mode flag does not offer an editable opt-in choice

#### Scenario: Optional mode uses member choice
- **WHEN** an opt-in flag has a saved true, saved false or absent choice for the member
- **THEN** effective enabled and reported memberEnabled are true, false or false respectively and descriptive metadata is available

### Requirement: Read the registered snapshot for the bound member

Authorized GET /api/feature-flags with an established bound member SHALL return the registered effective flags in data.items, resolving choices for that member. A request with no bound member identity SHALL return 401. Unknown stored keys SHALL not become registered snapshot entries.

#### Scenario: Member-specific snapshot
- **WHEN** two established members request snapshots and only one has opted into an optional flag
- **THEN** only that member's snapshot enables that optional flag

#### Scenario: Missing context
- **WHEN** an authorized snapshot request has no bound member identity
- **THEN** the endpoint returns 401

#### Scenario: Stored unregistered key
- **WHEN** a member has a stored override whose key is not registered
- **THEN** the registered snapshot does not expose that key

### Requirement: Persist overrides only for registered opt-in previews

Authorized PATCH /api/feature-flags/{key} with a bound existing member and registered opt-in key SHALL insert or update that member/key choice and return its effective flag in data. Unknown keys SHALL return 404; registered fixed-mode keys SHALL return 409 without changing the stored override. A request without bound member context SHALL return 401.

#### Scenario: Insert and replace one member choice
- **WHEN** a member enables an opt-in flag and later disables that same flag successfully
- **THEN** one member/key choice records the latest boolean and the response reports its effective disabled state
- **AND** another member's choice is unchanged

#### Scenario: Unknown flag or fixed mode
- **WHEN** an authorized existing member updates an unknown key or a registered off/on key
- **THEN** the endpoint returns 404 or 409 respectively without saving a new choice

#### Scenario: No bound identity
- **WHEN** an authorized override request supplies no bound member context
- **THEN** the endpoint returns 401

#### Scenario: Member unavailable for opt-in
- **WHEN** a request with a bound nonexistent member targets a registered opt-in key
- **THEN** it returns 404 without saving an override

### Requirement: Retain member choices while a deployment mode overrides them

Reading a flag or rejecting a non-opt-in mutation SHALL leave its saved member choice intact. If the deployment later runs in opt-in mode against the same stored choices, resolution SHALL use the retained choice.

#### Scenario: Restore a retained opt-in choice
- **WHEN** a true member choice exists while off mode suppresses it and the deployment later resolves the key as opt-in
- **THEN** that member's effective flag is enabled without a new member choice

### Requirement: Select consumer experience using effective preview enablement

Cooking SHALL select its preview experience using effective enabled, rather than the stored member choice alone, and use the accepted cooking single-page/focused-reading requirements. Planner deliberate activation is unconditional under meal-rescheduling and SHALL NOT consume preview enablement. PDF acquisition is unconditional for eligible established members under recipe-capture and SHALL NOT consume preview enablement.

#### Scenario: Effective cooking mode
- **WHEN** the cooking flag resolves enabled or disabled
- **THEN** cooking follows “Read all instructions under the effective single-page flag” or “Navigate one focused instruction at a time” respectively

#### Scenario: Retired Planner preview data
- **WHEN** the planner preview key is absent from a snapshot or remains in legacy stored overrides
- **THEN** it does not alter Planner activation and is not offered as an editable preview

#### Scenario: Retired PDF preview data
- **WHEN** the PDF preview key is absent from a snapshot or remains in legacy stored overrides
- **THEN** it does not alter PDF acquisition and is not offered as an editable preview
