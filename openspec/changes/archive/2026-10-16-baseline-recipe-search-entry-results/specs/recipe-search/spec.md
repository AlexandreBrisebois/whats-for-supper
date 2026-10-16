# Spec Delta

## Purpose

Find existing household recipes through Search, with evidenced retrieval, selection and recovery boundaries.

## ADDED Requirements

### Requirement: Enter Search with optional planning and detail context

The household Search navigation SHALL open `/recipes`. The Search page SHALL initialize its text to empty and request an initial batch of 12 alternatives, forwarding supplied `addToDay` as dayIndex, weekOffset and similarTo context. An `open` recipe identity SHALL select detail independently of the initial search.

#### Scenario: Ordinary entry

- **WHEN** the person opens Search without mode parameters
- **THEN** an empty-query initial request is made and the standard search input is shown

#### Scenario: Planning entry

- **WHEN** Search opens with addToDay and weekOffset
- **THEN** the request carries that target and a planning banner offers Cancel back to `/planner`

#### Scenario: Detail link

- **WHEN** Search opens with an open recipe identity
- **THEN** that identity opens in detail while the page can load its initial results

### Requirement: Submit typed search after settling or Enter

The text input SHALL schedule a search after 500 ms without another text change. Enter SHALL clear its pending debounce, blur the input and submit the current query. The client SHALL transmit the text as supplied; server retrieval SHALL trim it without rewriting the request text.

#### Scenario: Settled typing

- **WHEN** the person changes the text again within the debounce interval
- **THEN** the pending typing timer is replaced by one for the latest value

#### Scenario: Submit now

- **WHEN** the person presses Enter
- **THEN** the current text is submitted immediately and the input loses focus

### Requirement: Represent search results and loading feedback

While the current initial or replacement search is loading, Search SHALL show a loading indicator. A current successful response SHALL display its available Top Pick separately from alternatives, with recipe names, image references and formatted times. The Top Pick SHALL show the first supplied reason label when present. Public import issue status SHALL be displayed on matching alternatives.

#### Scenario: Results available

- **WHEN** the current response supplies a Top Pick and alternatives
- **THEN** their cards render separately and the first Top Pick reason is displayed

#### Scenario: Replacement pending

- **WHEN** another search is loading
- **THEN** loading feedback replaces the results presentation

### Requirement: Offer recovery navigation for successful empty results

When a current successful response contains no Top Pick and no alternatives, Search SHALL show an empty-state message, Clear Filters and Browse Library navigation to `/browse-all-stack`. With active filters or concepts it SHALL use the filter-specific no-match message. Clear Filters SHALL apply empty filters and preferences while retaining current text and similar context.

#### Scenario: Unfiltered empty response

- **WHEN** a current successful search returns no cards with no active filters
- **THEN** the general empty message and recovery controls appear

#### Scenario: Filtered empty response

- **WHEN** a current successful search returns no cards with active filters or concepts
- **THEN** the filter-specific message appears and Clear Filters can submit the cleared selections

### Requirement: Return from Search detail to mounted results

Selecting a search card SHALL open recipe detail without replacing the mounted Search state. Closing detail SHALL dismiss it and request restoration of the recorded scroll position without a close-triggered search. Detail retrieval and editing SHALL retain recipe-library ownership, including Retrieve the selected library recipe for detail reading and the applicable detail-update requirements.

#### Scenario: Close a card

- **WHEN** the person opens a loaded card and then closes detail
- **THEN** the mounted query, filters and loaded cards remain without a close-triggered search

#### Scenario: Open another linked identity

- **WHEN** the open URL parameter changes
- **THEN** the detail selection follows the new identity

### Requirement: Refresh Search after a successful detail deletion

When detail invokes its successful-deletion callback, Search SHALL request replacement results using its current text, similar context, filters, preferences and planning target. Soft deletion eligibility and persistence SHALL follow recipe-library Soft-delete the loaded recipe when not assigned to active planner slots and Exclude soft-deleted recipes from standard library listings and search.

#### Scenario: Deleted card

- **WHEN** detail successfully deletes a recipe and invokes the callback
- **THEN** a new search is requested rather than treating old cards as authoritative

#### Scenario: Deletion rejected

- **WHEN** detail deletion fails before its success callback
- **THEN** Search does not request replacement through that callback
