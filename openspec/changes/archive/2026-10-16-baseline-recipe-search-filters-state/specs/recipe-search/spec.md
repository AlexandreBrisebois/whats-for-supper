# Spec Delta

## Purpose

Find existing household recipes through Search, with evidenced retrieval, selection and recovery boundaries.

## ADDED Requirements

### Requirement: Apply or discard filter drafts

Search SHALL offer one Filters chooser for narrow and wide layouts. Opening SHALL copy active filters and preferences into a draft. Apply SHALL replace active selections, close the chooser and request search with current query, similar and planning context. Closing by Close, Escape or backdrop SHALL discard unsubmitted changes.

#### Scenario: Dismiss selection

- **WHEN** the person changes a draft then closes the chooser
- **THEN** active selections and search requests remain unchanged by that draft

#### Scenario: Apply selection

- **WHEN** the person selects Quick and applies
- **THEN** Quick becomes active and a new search carries quickOnly

### Requirement: Clear selections without clearing the search text

Clear filters within the chooser SHALL clear draft filters and preferences, taking effect on Apply. Search SHALL count selected array values, true boolean filters and Focus concepts in its active count. Query text SHALL remain independent of filter reset.

#### Scenario: Clear then dismiss

- **WHEN** the person clears a draft and closes without Apply
- **THEN** the active selections remain

#### Scenario: Apply cleared draft

- **WHEN** the person clears then applies
- **THEN** active filters and preferences are empty and the current query is retained

### Requirement: Expose supported shortcut and grouped controls

The chooser SHALL offer Quick, Family Favorite and Never Tried initially, with New, It's Been a While, Reported and Ready to review behind More filters unless selected. Selected secondary choices SHALL remain visible after collapse. It SHALL offer Meal, Focus and available Cuisine groups with pressed-state feedback.

#### Scenario: Retain visible selection

- **WHEN** the person selects Reported then collapses More filters
- **THEN** the selected Reported choice remains visible

#### Scenario: Reveal additional vocabulary

- **WHEN** configured Focus choices exceed six or unpromoted cuisines exist
- **THEN** disclosure controls expose additional choices and selected additional choices remain visible when collapsed

### Requirement: Separate Focus preferences from hard selections

Non-vegetarian Focus controls SHALL populate preference concepts. Vegetarian SHALL populate vegetarianOnly. Meal and Cuisine SHALL populate their respective filter arrays. Applying combinations SHALL preserve these separate representations instead of converting Focus to an exact ingredient filter.

#### Scenario: Combined selection

- **WHEN** the person applies fish Focus, Vegetarian, Supper and Japanese
- **THEN** the request carries fish as a concept and vegetarianOnly, mealTypes and cuisines as filters

#### Scenario: Toggle off

- **WHEN** the person toggles a selected choice off and applies
- **THEN** that choice no longer contributes a selected value

### Requirement: Constrain cuisine and meal groups together

Search SHALL normalize nonblank Cuisine and Meal filter values by trimming, case folding and deduplicating. Values within a group SHALL be alternatives; supplied groups SHALL constrain results together. A missing recipe field SHALL not match a selected group. Ranked database retrieval SHALL apply these constraints before its candidate limit.

#### Scenario: Multiple values

- **WHEN** Japanese or Italian and Supper or Lunch are selected
- **THEN** eligible recipes must match one cuisine and at least one selected meal type

#### Scenario: No matching group

- **WHEN** a candidate matches cuisine but none of the selected meal types
- **THEN** it is excluded before the ranked candidate limit

### Requirement: Apply supported boolean filters from stored facts

Search SHALL combine active supported boolean filters: New uses creation within 30 days of the current UTC instant; Never Tried uses no last-cooked date; Family Favorite uses rating at least Like plus discoverability or non-null notes; Vegetarian uses known true; It's Been a While requires a last-cooked date. Quick SHALL restrict initial browse and ranked database retrieval to supported durations of at most 30 minutes.

#### Scenario: Contradictory cooking filters

- **WHEN** Never Tried and It's Been a While are both active
- **THEN** no recipe satisfies both date predicates

#### Scenario: Unknown vegetarian classification

- **WHEN** Vegetarian is active for a candidate with unknown vegetarian value
- **THEN** the candidate is excluded

#### Scenario: Duration unknown

- **WHEN** Quick is active for a candidate whose duration cannot satisfy the serving path duration predicate
- **THEN** the candidate is excluded

### Requirement: Use report membership without a separate review route

Search SHALL consume recipe-quality Select saved issue membership for review for Reported and Ready to review membership and precedence. Its text, hard filters and Focus retrieval SHALL continue to constrain those candidates. Discover and apply recipe review filters and Present review matches as ordinary results remain with recipe-quality; Search adds no Needs review route.

#### Scenario: Both report choices

- **WHEN** Reported and Ready to review are applied together
- **THEN** only ready-to-review report members can match

#### Scenario: Reported with other constraints

- **WHEN** Reported and Vegetarian are active with a query
- **THEN** results must satisfy the report predicate, vegetarian fact and retrieval criteria

### Requirement: Keep mounted search state through detail and chooser use

Query, applied filters and preferences SHALL remain in the mounted Search page through detail open/close and chooser dismissal. A new page mount SHALL initialize these selections empty; similarTo and open context SHALL initialize from the URL. This SHALL NOT establish storage persistence across remount or browser reload.

#### Scenario: Return from detail

- **WHEN** detail is closed while Search remains mounted
- **THEN** the current query and active selections remain

#### Scenario: Reload Search

- **WHEN** Search mounts afresh without similarTo or open context
- **THEN** text, filters and preferences begin empty

### Requirement: Load filter vocabulary without blocking built-in choices

On the first Filters opening in a Search mount, Search SHALL request filter vocabulary. A successful response SHALL supply configured Focus order, fixed Meal choices and stored promoted/all Cuisine lists. If unavailable, built-in Focus and Meal choices SHALL remain usable. Missing or malformed materialized Cuisine state SHALL return empty Cuisine lists and null generatedAt rather than discover the catalog on that request.

#### Scenario: No materialized state

- **WHEN** filter vocabulary is read without a usable saved Cuisine snapshot
- **THEN** the server returns configured Focus, fixed Meals and empty Cuisine lists with null generatedAt

#### Scenario: Metadata request fails

- **WHEN** the browser filter metadata request rejects
- **THEN** the chooser retains built-in Focus and Meal choices

#### Scenario: Stored snapshot is old

- **WHEN** the saved Cuisine snapshot has an old generatedAt
- **THEN** the endpoint returns that snapshot without a freshness or catalog-recompute guarantee

### Requirement: Use validated filter configuration defaults

Filter vocabulary SHALL preserve a valid configured Focus list order, requiring unique nonblank IDs, nonblank concepts and labels for custom IDs. Invalid or absent configuration SHALL use built-in Beef, Poultry, Pork, Fish, Pasta and Vegetarian definitions. The server rediscovery interval SHALL default to 28 days unless configured within 7 through 365 days.

#### Scenario: Invalid custom definition

- **WHEN** configured custom Focus has no nonblank label or duplicates an ID
- **THEN** the entire Focus list falls back to built-ins

#### Scenario: Invalid interval

- **WHEN** the rediscovery interval is absent or outside 7 through 365
- **THEN** server browse eligibility uses the 28-day default
