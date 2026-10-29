# Spec Delta

## ADDED Requirements

### Requirement: Expose GOTO within Search Filters

Search Filters SHALL offer GOTO as an initially visible boolean selection and offer the shared GOTO management disclosure without a separate permanent toolbar entry. Existing draft, Apply, Clear, dismissal and active-count semantics SHALL include GOTO. A fresh ordinary mount SHALL initialize it inactive.

#### Scenario: Apply with existing context
- **WHEN** a person applies GOTO alongside a text query, other filters or planning context
- **THEN** the replacement search carries gotoOnly true together with that context and counts GOTO as one active filter

#### Scenario: Discard a changed draft
- **WHEN** a person changes GOTO in the chooser and dismisses without Apply
- **THEN** the active filter and search results remain unchanged by that draft

#### Scenario: Clear selections
- **WHEN** a person clears filters and applies
- **THEN** GOTO becomes inactive alongside the other cleared selections while query text remains

#### Scenario: Consistent filter presentation
- **WHEN** the chooser displays GOTO beside existing filters
- **THEN** it uses their selected/unselected visual vocabulary and explicit selected state without introducing a dedicated yellow GOTO action

### Requirement: Apply configured GOTO membership across search retrieval paths

POST `/api/recipes/search` SHALL accept `filters.gotoOnly`. True SHALL constrain candidates to current configured household GOTO identities before candidate limits and pagination, together with existing eligibility and constraints. False or absent SHALL be inactive. GOTO-only requests SHALL use filter-only Explicit policy; supplied text, concepts or Similar context SHALL retain their existing retrieval policies.

#### Scenario: Filter-only GOTO
- **WHEN** gotoOnly is true without text, concepts or Similar target
- **THEN** the response uses Explicit policy and the existing filter-only order among eligible configured recipes

#### Scenario: Lexical, semantic or Similar search
- **WHEN** one of those retrieval paths runs with gotoOnly true
- **THEN** every retrieved candidate, including any Top Pick, belongs to the configured list before the path's candidate limit

#### Scenario: GOTO and Family Favorite differ
- **WHEN** a configured ready unrated recipe and an unconfigured loved recipe otherwise match the search
- **THEN** GOTO alone admits the configured recipe and excludes the unconfigured recipe; adding Family Favorite further intersects eligibility

#### Scenario: Empty or unavailable recipe identities
- **WHEN** no configured identity is currently eligible, including an empty list or only missing, not-ready or deleted recipes
- **THEN** the search succeeds without matches rather than falling back to ordinary candidates

### Requirement: Preserve GOTO selection and eligibility through Search continuation

Search continuation fingerprints SHALL include normalized GOTO selection. A changed selection SHALL require restart under the existing 409 response. A valid ranked continuation SHALL retain its frozen order while rechecking current GOTO membership, readiness and deletion. Newly configured recipes SHALL require a fresh search rather than being inserted into an existing ranked sequence.

#### Scenario: Changed filter with old cursor
- **WHEN** a cursor from a search without GOTO filtering is reused with gotoOnly true
- **THEN** the server returns the existing incompatible-continuation 409 with restart guidance

#### Scenario: Removal between pages
- **WHEN** an unserved ranked recipe leaves the configured list before a GOTO-filtered continuation
- **THEN** it is excluded without reordering the remaining frozen candidates

#### Scenario: Addition between pages
- **WHEN** a new recipe joins the configured list after a ranked snapshot was created
- **THEN** the existing continuation does not insert it and a fresh search evaluates its eligibility

### Requirement: Refresh applied GOTO Search after confirmed local membership changes

A confirmed local membership save SHALL refresh mounted applied-GOTO Search with current query, filters, preferences, Similar and planning context, replacing its continuation chain. Obsolete successes SHALL not replace the new result generation. A failed save SHALL retain confirmed membership; a failed refresh after a successful save SHALL offer read retry without repeating the save.

#### Scenario: Detail removal succeeds
- **WHEN** a person removes a recipe from GOTO in Search detail and the save succeeds with GOTO applied
- **THEN** the replacement search retains current context and excludes that recipe

#### Scenario: Old continuation finishes later
- **WHEN** an old continuation succeeds after the membership-triggered replacement starts
- **THEN** it does not append to the replacement generation

#### Scenario: Read retry after save
- **WHEN** membership saves but replacement search fails
- **THEN** Search exposes its normal Retry with current inputs without representing the saved action as rejected or resubmitting it

## MODIFIED Requirements

### Requirement: Expose supported shortcut and grouped controls

The chooser SHALL offer Quick, Family Favorite, Never Tried and GOTO initially, with New, It's Been a While, Reported and Ready to review behind More filters unless selected. Selected secondary choices SHALL remain visible after collapse. It SHALL offer Meal, Focus and available Cuisine groups with pressed-state feedback.

#### Scenario: Retain visible selection

- **WHEN** the person selects Reported then collapses More filters
- **THEN** the selected Reported choice remains visible

#### Scenario: Reveal additional vocabulary

- **WHEN** configured Focus choices exceed six or unpromoted cuisines exist
- **THEN** disclosure controls expose additional choices and selected additional choices remain visible when collapsed
