## MODIFIED Requirements

### Requirement: Advertise direct household shortcuts

The manifest SHALL advertise Search at `/recipes` and Capture Meal at `/capture`, each with a 192 pixel icon. Search SHALL have short name “Search” and description “Search your recipe library”. Opening these destinations SHALL remain subject to household-identity requirements `Gate protected page entry with household access` and `Apply member context after household access`.

#### Scenario: Read shortcut destinations
- **WHEN** the ordinary manifest is requested
- **THEN** it advertises Search with short name Search and description Search your recipe library, and Capture Meal with short name Capture at those destinations
- **AND** it no longer advertises the recipe-search shortcut as Quick Find or Find

#### Scenario: Shortcut destination requires household entry
- **WHEN** a shortcut destination is requested without accepted household access
- **THEN** existing household-identity page-gate recovery applies rather than the shortcut bypassing household entry

#### Scenario: Find goes to recipe search
- **WHEN** the installed Search shortcut is opened with household access and an established member context
- **THEN** the app enters the existing `/recipes` recipe-search surface rather than the `/discovery` voting journey or the suggestion deck

#### Scenario: Preserve Capture and member selection
- **WHEN** Capture is opened or a shortcut entry lacks a usable member context
- **THEN** Capture retains `/capture` and the existing member-context entry handling applies without the shortcut selecting or inventing a member
