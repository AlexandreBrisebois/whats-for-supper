# Spec Delta

## MODIFIED Requirements

### Requirement: Advertise direct household shortcuts

The manifest SHALL advertise Vote Together at `/discovery` (short name “Vote”, description “Vote on supper ideas with your family”), Search at `/recipes?focus=search` (short name “Search”, description “Search your recipe library”) and Capture Meal at `/capture`, each with a 192 pixel icon. Opening these destinations SHALL remain subject to household-identity requirements `Gate protected page entry with household access` and `Apply member context after household access`.

#### Scenario: Read shortcut destinations
- **WHEN** the ordinary manifest is requested
- **THEN** it advertises Vote Together with short name Vote at `/discovery`, Search with short name Search and description Search your recipe library at `/recipes?focus=search`, and Capture Meal with short name Capture at `/capture`
- **AND** it no longer advertises the recipe-search shortcut as Quick Find or Find

#### Scenario: Vote Together opens family discovery
- **WHEN** the installed Vote shortcut is opened with household access and an established member context
- **THEN** the app opens `/discovery` so the household member can vote on supper ideas

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

### Requirement: Offer manual Beta context on Welcome

Welcome SHALL select manual release context from server-resolved installation identity: Beta with non-demo identity offers Beta, installation Demo retains Demo, and stable non-demo offers neither. It SHALL NOT automatically open an explanation or use runtime health to select Welcome context. Beta SHALL replace its tiny Welcome note, not duplicate it, without granting access.

#### Scenario: Beta Welcome without interaction
- **WHEN** Welcome renders with server-resolved Beta channel and non-demo installation identity
- **THEN** one Beta band appears above the login form without an open explanation or duplicate tiny Beta note
- **AND** activating it opens the same Beta copy and dismissal controls as the app shell without submitting the form

#### Scenario: Welcome identity remains separate from runtime policy
- **WHEN** Welcome resolves installation Demo, stable non-demo or Beta non-demo identity, irrespective of a later app-shell runtime status
- **THEN** its manual presentation follows that installation identity without claiming API mode or feature availability
- **AND** Demo-on-Beta retains one Demo explanation with the accessible Beta-channel description and no Beta introduction

#### Scenario: Beta preserves ordinary login
- **WHEN** a Beta-only visitor opens, closes or reopens the Welcome explanation
- **THEN** the editable passphrase, ordinary family-passphrase helper, existing validation/retry feedback and explicit Enter behavior are preserved; Beta does not prefill a Demo passphrase or show Demo-prefill wording
- **AND** Start exploring only dismisses the explanation, while the branding heading remains `What's for Supper?` in English and French
