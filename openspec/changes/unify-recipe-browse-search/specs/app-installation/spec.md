# App installation delta

## MODIFIED Requirements

### Requirement: Advertise direct household shortcuts

The manifest SHALL advertise Search at `/recipes?focus=search` and Capture Meal at `/capture`, each with a 192 pixel icon. Search SHALL have short name “Search” and description “Search your recipe library”. Opening these destinations SHALL remain subject to household-identity requirements `Gate protected page entry with household access` and `Apply member context after household access`.

#### Scenario: Read shortcut destinations
- **WHEN** the ordinary manifest is requested
- **THEN** it advertises Search with short name Search and description Search your recipe library, and Capture Meal with short name Capture at those destinations, with Search explicitly requesting expanded controls
- **AND** it no longer advertises the recipe-search shortcut as Quick Find or Find

#### Scenario: Shortcut destination requires household entry
- **WHEN** a shortcut destination is requested without accepted household access
- **THEN** existing household-identity page-gate recovery applies rather than the shortcut bypassing household entry

#### Scenario: Find goes to recipe search
- **WHEN** the installed Search shortcut is opened with household access and an established member context
- **THEN** the app enters `/recipes` with Search controls expanded and the input focused rather than the `/discovery` voting journey or the suggestion deck

#### Scenario: Preserve Capture and member selection
- **WHEN** Capture is opened or a shortcut entry lacks a usable member context
- **THEN** Capture retains `/capture` and the existing member-context entry handling applies without the shortcut selecting or inventing a member

#### Scenario: Shortcut retains search-entry meaning
- **WHEN** the current app-controlled manifest is read and its Search shortcut is activated
- **THEN** its URL is `/recipes?focus=search` while ordinary bottom Recipes navigation remains `/recipes` with collapsed controls
- **AND** expanding controls alone leaves Explore active until Search criteria are supplied

#### Scenario: Existing installation metadata
- **WHEN** an existing installed app has not yet refreshed its OS-owned shortcut URL
- **THEN** the app makes no guarantee of immediate shortcut replacement; explicit `focus=search` entry remains supported
