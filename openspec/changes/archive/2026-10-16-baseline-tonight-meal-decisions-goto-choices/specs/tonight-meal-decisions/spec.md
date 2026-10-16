# Spec Delta

## Purpose

Help ordinary households understand tonight’s supper and choose or recover a meal using existing planning, recipe and cooking capabilities.

## ADDED Requirements

### Requirement: Choose a random ready GOTO for Home

Active GOTO retrieval SHALL select a random configured recipe that exists, is not deleted and has persisted readiness. A successful result SHALL contain that configured item with ready status and use its image URL or the standard recipe hero URL when absent. Readiness SHALL follow recipe-library’s Represent persisted recipe attribution and readiness requirement.

#### Scenario: Ready and pending configured
- **WHEN** the configured list includes a ready recipe and a pending recipe
- **THEN** GET /api/goto/active returns the eligible ready recipe under data with ready status

#### Scenario: No eligible recipe
- **WHEN** no configured recipe exists with nondeleted ready state
- **THEN** active retrieval returns 404 without offering a pending recipe

### Requirement: Handle unavailable active GOTO without blocking Tonight choices

Home SHALL load an active GOTO on mount. An active-read error, including the no-ready 404, SHALL leave no active GOTO. When supper choices are displayed without a GOTO, Home SHALL offer its Add a GOTO link to Profile, Quick Find and Order In. A ready active choice SHALL offer Make This Tonight through the existing Tonight assignment behavior.

#### Scenario: No ready result
- **WHEN** active retrieval returns 404 while Tonight offers supper choices
- **THEN** Home still offers Quick Find, Order In and Profile setup without a GOTO confirmation action

#### Scenario: Confirm ready choice
- **WHEN** a person activates Make This Tonight for the ready active recipe
- **THEN** Tonight assignment receives that configured recipe identity

### Requirement: Read and replace the household GOTO list

Protected GET /api/goto SHALL return the stored household list under data; PUT /api/goto SHALL replace that list with the submitted items and return it under data after saving. The browser SHALL update its stored list only after PUT resolves. Access SHALL follow household-identity’s Authenticate protected API requests independently requirement.

#### Scenario: Replace and reread
- **WHEN** an authorized submitted list saves and is subsequently read
- **THEN** the read represents the saved items and descriptions

#### Scenario: Replacement rejects
- **WHEN** the browser list PUT rejects
- **THEN** that save does not apply its submitted list to browser settings

### Requirement: Offer GOTO setup and list removal

Family GOTO settings SHALL load the list, display ready items by description and pending items with pending feedback. Add a GOTO SHALL offer Search the Library, Describe a Dish and Take a Photo. Search SHALL open Recipes; description and photo SHALL open capture with GOTO intent and the selected mode. Closing the add sheet SHALL not create a recipe.

#### Scenario: Choose library
- **WHEN** a person chooses Search the Library in the add sheet
- **THEN** Recipes opens without launching Quick Find

#### Scenario: Choose acquisition
- **WHEN** a person chooses Describe a Dish or Take a Photo
- **THEN** capture opens with intent=goto and mode=describe or mode=photo respectively

#### Scenario: Dismiss setup
- **WHEN** a person closes the add sheet before choosing an acquisition path
- **THEN** the sheet closes without creating a recipe

### Requirement: Remove a configured GOTO without deleting its recipe

Settings removal SHALL submit the list with matching recipe identities filtered out, marking the selected removal pending until the request settles. Rejection SHALL log the error and release pending presentation without this action deleting the recipe or reporting successful removal.

#### Scenario: Removal succeeds
- **WHEN** the replacement list excluding the selected recipe saves
- **THEN** the selected GOTO disappears from the loaded list while its recipe is retained

#### Scenario: Removal rejects
- **WHEN** the list replacement rejects
- **THEN** pending removal ends and the prior browser list remains

### Requirement: Register acquired recipes as pending GOTO choices

After GOTO-intent capture returns a recipe identity, the client SHALL append a pending GOTO item through a separate list replacement. Description capture SHALL use the entered name, photo capture Your captured recipe and URL capture Recipe from link. Recipe acquisition, background acceptance and readiness SHALL remain recipe-capture and background-processing owned.

#### Scenario: Description or photo returns identity
- **WHEN** GOTO-intent description or photo capture returns a recipe identity and list save resolves
- **THEN** the saved list includes that pending identity with its corresponding description

#### Scenario: URL returns identity
- **WHEN** URL capture is submitted with GOTO intent and returns a recipe identity
- **THEN** a separate list replacement appends that identity with Recipe from link and pending status

### Requirement: Keep GOTO capture success available for explicit departure

After GOTO capture and list registration resolve, the capture success view SHALL remain available without automatic Home navigation and offer Back to Settings. This waiting view SHALL NOT establish that synthesis or recipe readiness has completed.

#### Scenario: Registration succeeds
- **WHEN** GOTO description submission and its list replacement resolve
- **THEN** the success screen offers the GOTO preparation state without automatic navigation

#### Scenario: Return explicitly
- **WHEN** a person activates Back to Settings in that GOTO success view
- **THEN** navigation targets Profile Settings

### Requirement: Toggle the loaded recipe in the GOTO list

Recipe detail SHALL offer a pressed GOTO action when the loaded recipe is in the configured list and an add action otherwise. Activation SHALL remove the matching item or append its identity, name, image and represented readiness, then save the replacement list. Pending save SHALL disable that action; completion SHALL show success or failure feedback.

#### Scenario: Add loaded recipe
- **WHEN** a person activates Set as GOTO for an absent loaded recipe and saving resolves
- **THEN** the list contains its identity and the action reports successful addition

#### Scenario: Remove or fail
- **WHEN** a person toggles an existing GOTO or its save rejects
- **THEN** successful saving reports removal; rejection reports Could not update GOTO and releases the pending action
