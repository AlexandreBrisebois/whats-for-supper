# Recipe library — ratings and notes delta

## ADDED Requirements

### Requirement: Initialize recipe-detail ratings and notes controls

After successful library detail loading, the sheet SHALL offer a Notes textarea and rating choices Dislike=1, Like=2 and Love=3. Notes SHALL initialize from returned notes, using empty text for null or absence. Rating SHALL initialize from the returned value, using 0 for absence; 0 means Unknown with no rating choice selected. Each choice SHALL expose its label and pressed state.

#### Scenario: Load existing notes and rating
- **WHEN** library detail loads with notes “Family favorite” and rating 2
- **THEN** Notes contains “Family favorite”, Like is pressed, and Dislike and Love are not pressed

#### Scenario: Load absent notes and rating
- **WHEN** detail loads without notes or rating values
- **THEN** Notes is empty and none of the three rating choices is pressed

#### Scenario: Offer the three rating meanings
- **WHEN** successfully loaded library detail displays its rating control
- **THEN** it offers Dislike, Like and Love mapped to 1, 2 and 3 respectively, with no separate Unknown button

### Requirement: Select or clear the loaded recipe rating

Activating a rating choice SHALL immediately select its value locally and request PATCH `/api/recipes/{id}` with that rating for the loaded recipe ID. Activating the currently selected choice SHALL clear the selection locally and submit rating 0. The rating action SHALL omit notes and unrelated recipe fields from its payload.

#### Scenario: Select a different rating
- **WHEN** a person activates Love while Like is selected for loaded recipe R
- **THEN** Love becomes pressed immediately and PATCH targets R with rating 3

#### Scenario: Clear the current rating
- **WHEN** a person activates the currently selected Dislike choice
- **THEN** no choice remains pressed and PATCH submits rating 0 for that recipe

#### Scenario: Select from Unknown
- **WHEN** a person activates Like while no choice is selected
- **THEN** Like becomes pressed and PATCH submits rating 2 without notes or unrelated recipe fields

### Requirement: Submit changed recipe notes after the editing delay

Editing Notes SHALL immediately display the entered text. When it differs from the loaded recipe's notes, treating absent notes as empty text, the sheet SHALL schedule submission after 800 ms. A further notes edit before dispatch SHALL replace the pending submission with the latest differing text. Submission SHALL PATCH the loaded recipe ID with exact notes text, without trimming, and omit rating and unrelated recipe fields.

#### Scenario: Submit exact notes text
- **WHEN** Notes changes to “  More sauce  ”, differs from the loaded notes, and remains unchanged with the sheet mounted until its 800 ms timer fires
- **THEN** PATCH submits notes “  More sauce  ” for the loaded recipe without rating or unrelated recipe fields

#### Scenario: Clear initially nonempty notes
- **WHEN** a person clears nonempty loaded notes and the empty input remains until its submission timer fires
- **THEN** PATCH submits notes as an empty string rather than null

#### Scenario: Replace a pending notes edit
- **WHEN** a person changes Notes to one differing value and then another before the first timer fires, with the final text still differing from the loaded notes
- **THEN** the first pending submission is cancelled and the final text is submitted after its own 800 ms delay if the sheet remains mounted and no further change intervenes

### Requirement: Persist supplied recipe ratings and exact notes

For an authorized PATCH of an existing recipe, when persistence and response completion succeed, the API SHALL store a supplied non-null rating in the supported 0–3 range and supplied non-null notes on that recipe. Notes SHALL retain their exact text, including whitespace and empty strings. These SHALL be recipe-level facts rather than member-specific ratings or notes; existing library fact/read ownership applies.

#### Scenario: Store a rating or clear it to Unknown
- **WHEN** a successful authorized PATCH supplies rating 3 or rating 0 for an existing recipe
- **THEN** the recipe stores Love or Unknown respectively without creating a member-specific rating

#### Scenario: Store notes without trimming
- **WHEN** a successful authorized PATCH supplies notes “  More sauce  ”
- **THEN** the recipe stores that exact notes text

#### Scenario: Durably clear notes with empty text
- **WHEN** a successful authorized PATCH supplies an empty notes string for a recipe with nonempty notes
- **THEN** its stored notes become an empty string, available through existing persisted-detail reading

### Requirement: Preserve omitted recipe content during ratings and notes updates

Omitted or null rating and notes values SHALL leave those stored facts unchanged. A successful rating-only or notes-only PATCH SHALL retain other recipe content, attribution, readiness and deletion state, subject to existing update timestamp and directly connected side effects. This extends existing partial-update ownership without changing its other field rules.

#### Scenario: Preserve null and omitted facts
- **WHEN** a successful authorized PATCH omits rating or notes, or supplies either as null
- **THEN** each omitted or null fact retains its stored value

#### Scenario: Preserve unrelated recipe content
- **WHEN** a successful authorized PATCH changes only rating or only notes
- **THEN** the other fact and unrelated recipe content, attribution, readiness and deletion state remain unchanged

### Requirement: Retain local ratings and notes display on successful completion

When a rating or notes PATCH resolves successfully while the sheet remains mounted with no intervening edits, the sheet SHALL retain the locally selected rating and entered notes. Completion SHALL NOT require applying the PATCH response or requesting another detail GET, and SHALL leave the sheet open.

#### Scenario: Complete an update with the sheet open
- **WHEN** a rating or notes PATCH resolves successfully while the sheet remains mounted with no intervening edits
- **THEN** the sheet remains open with its local rating and notes, without response reconciliation or a completion GET
