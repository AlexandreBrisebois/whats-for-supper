# Spec Delta

## ADDED Requirements

### Requirement: Filter library recipes by configured GOTO membership

GET `/api/recipes` SHALL accept optional boolean `gotoOnly`. True SHALL restrict eligible recipes to identities in the configured household GOTO list before counting, ordering and pagination. False or absent SHALL add no restriction. Readiness, deletion, exact lookup and discoverability predicates SHALL continue to apply together.

#### Scenario: Membership differs from rating
- **WHEN** GOTO filtering is active with a ready configured unrated recipe and a ready loved recipe outside the configured list
- **THEN** only the configured recipe is eligible regardless of those ratings

#### Scenario: Discovery intersection
- **WHEN** both gotoOnly and discoverableOnly are true
- **THEN** only configured, ready, nondeleted and discoverable recipes contribute to returned items and total

#### Scenario: No eligible configured recipes
- **WHEN** the configured list is absent, empty or contains only missing, not-ready or deleted recipes
- **THEN** the GOTO-filtered response has no items and a total of zero

#### Scenario: Filter before pagination
- **WHEN** configured eligible recipes occur beyond the first unfiltered page
- **THEN** the first filtered page still contains those recipes up to its limit and the total counts the entire eligible filtered collection

### Requirement: Offer compact GOTO filtering on Browse

Browse SHALL offer Filters below its existing All/Discovery and presentation controls without a separate permanent GOTO toolbar button. Its chooser SHALL offer GOTO selection and access to the shared GOTO management disclosure. Apply SHALL commit the draft; Close, Escape or backdrop SHALL discard unsubmitted filter changes. GOTO selection SHALL survive All/Discovery and stack/list changes while Browse remains mounted.

#### Scenario: Apply GOTO
- **WHEN** a person selects GOTO in Browse Filters and applies
- **THEN** GOTO becomes active, the chooser closes and the selected presentation requests page one with gotoOnly true

#### Scenario: Dismiss draft
- **WHEN** a person changes GOTO selection and dismisses without applying
- **THEN** the applied filter and loaded collection remain unchanged by that draft

#### Scenario: Change mode or presentation
- **WHEN** a person switches All/Discovery or stack/list with GOTO applied
- **THEN** the new collection retains GOTO filtering and its first-page request carries both current selections

#### Scenario: Clear GOTO
- **WHEN** a person clears and applies GOTO filtering
- **THEN** Browse reloads page one using its current All/Discovery and presentation settings without a GOTO restriction

### Requirement: Keep GOTO Browse navigation within its filtered collection

With GOTO applied, Browse SHALL use returned filtered pagination totals in both All and Discovery. Every page, wrap, prefetch and retry SHALL carry the applied filter. Changing GOTO selection SHALL reset page/index and invalidate departed collection responses. A zero filtered result SHALL offer filter clearing and GOTO management without claiming the entire household library is empty.

#### Scenario: All with GOTO
- **WHEN** library summary reports 45 recipes and the GOTO-filtered page reports 3
- **THEN** Browse displays 3 as the collection total and navigation stays within those 3 recipes

#### Scenario: Departed GOTO request
- **WHEN** an earlier filtered request resolves after GOTO selection changes
- **THEN** it does not replace current cards, counts, position or feedback

#### Scenario: Empty filtered collection
- **WHEN** a current GOTO-filtered request succeeds with no eligible items
- **THEN** Browse shows GOTO-specific no-match guidance with Clear filters and management access

#### Scenario: Additional pages and recovery
- **WHEN** a GOTO-filtered list appends or a stack loads an adjacent, wrapped or retried page
- **THEN** that request retains current gotoOnly, discoverableOnly, page size and applicable history-generation context

### Requirement: Refresh GOTO Browse after confirmed local membership changes

A confirmed local GOTO membership change SHALL reload a mounted applied-GOTO Browse from page one, retaining its All/Discovery and presentation settings. A rejected save SHALL retain confirmed membership and current results. A failed reload after a successful save SHALL offer read retry without reporting the save as rejected or repeating it.

#### Scenario: Remove from detail or management
- **WHEN** removing an eligible recipe from GOTO saves successfully while Browse has GOTO applied
- **THEN** the refreshed collection excludes it and uses the new filtered total

#### Scenario: Failed refresh after saved removal
- **WHEN** removal saves but the following collection request fails
- **THEN** the saved membership remains confirmed and recovery retries retrieval rather than removal

#### Scenario: Close unchanged detail
- **WHEN** a person opens and closes detail without changing GOTO membership
- **THEN** Browse retains its current card and position without a membership-triggered refresh

### Requirement: Preserve Browse usability on short viewports

Adding the Filters row SHALL retain readable recipe content, reachable card actions, dismissal and stack/list navigation on short phone viewports. Controls SHALL NOT be clipped or text shrunk to force the added row into the fullscreen layout. Filters and management SHALL remain scrollable and dismissible under text growth and safe areas.

#### Scenario: Short portrait and landscape phones
- **WHEN** Browse displays its Filters row at 320x568, 390x667 or 667x375 CSS px in either presentation
- **THEN** recipe content, card actions and Close remain reachable without horizontal overflow, and navigation remains operable

## MODIFIED Requirements

### Requirement: Select the initial Browse total by collection mode

After a relevant first-page response succeeds, unfiltered All mode SHALL use the preceding summary total, including its zero default. Discovery mode or an applied GOTO filter SHALL use the page's nonnegative filtered pagination total, defaulting missing pagination or total to zero. Existing `Return an explore-ordered library page` owns the page total; summary and page reads do not establish an atomic snapshot.

#### Scenario: All uses summary rather than page total
- **WHEN** a relevant unfiltered All first-page response succeeds with summary total 45 and page total 10
- **THEN** the Browse collection total is 45

#### Scenario: Discovery uses filtered page total
- **WHEN** a relevant Discovery first-page response succeeds with summary total 45 and filtered page total 10
- **THEN** the Browse collection total is 10

#### Scenario: Discovery pagination total is absent
- **WHEN** a relevant Discovery first-page response succeeds without pagination or its total
- **THEN** the Browse collection total is zero even if the summary total is positive

#### Scenario: GOTO uses its filtered total
- **WHEN** GOTO is applied in All mode with summary total 45 and filtered page total 3
- **THEN** the Browse collection total is 3

### Requirement: Show an empty All-mode library result

When an unfiltered All-mode library load succeeds with an empty returned item array, the library SHALL display “Your Library is Empty” and an “Add New Recipe” link to `/capture`. This result SHALL describe the visible library collection without asserting absence of pending or deleted database records.

#### Scenario: No All-mode items are returned
- **WHEN** an unfiltered All-mode list load succeeds with no returned recipes
- **THEN** the library displays its empty-library feedback and Add New Recipe link
- **AND** following the link requests `/capture`
