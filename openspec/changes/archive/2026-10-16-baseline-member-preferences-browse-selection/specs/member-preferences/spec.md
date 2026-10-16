# Spec Delta

## Purpose

Adapt the household experience using member language and browsing preferences and member-specific preview resolution, while distinguishing browser choices from persisted member settings.

## ADDED Requirements

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
