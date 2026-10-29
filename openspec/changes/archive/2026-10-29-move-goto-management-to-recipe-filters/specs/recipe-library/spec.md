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

Browse SHALL offer an immediate Go-To Star toggle immediately right of its existing single All/Discovery toggle in the same toolbar. Activation SHALL toggle the applied membership filter without Apply. Browse SHALL NOT show the extra Filters row, filter flyout or Go-To management. Selection SHALL survive All/Discovery and stack/list changes while mounted.

#### Scenario: Toggle GOTO
- **WHEN** a person activates the unpressed Star filter
- **THEN** it becomes pressed and the current presentation requests page one with gotoOnly true without opening a sheet
- **AND** no recipe membership or meal assignment changes

#### Scenario: Change mode or presentation
- **WHEN** a person switches All/Discovery or stack/list with GOTO active
- **THEN** the first-page request retains GOTO and the current mode/presentation semantics
- **AND** All/Discovery remains one mode toggle, not tabs or an All/Discovery/GOTO mode selector

#### Scenario: Clear GOTO
- **WHEN** a person activates the pressed Star or clears the GOTO empty-state filter
- **THEN** Browse reloads page one without GOTO, retaining the other selections

#### Scenario: Accessible filter state
- **WHEN** the toolbar is displayed in English or French
- **THEN** Star has a localized membership-filter name, aria-pressed, keyboard activation, visible focus and selected meaning beyond colour
- **AND** it remains distinct from a recipe’s membership star

### Requirement: Keep GOTO Browse navigation within its filtered collection

With GOTO applied, Browse SHALL use returned filtered pagination totals in both All and Discovery. Every page, wrap, prefetch and retry SHALL carry the applied filter. Changing GOTO selection SHALL reset page/index and invalidate departed collection responses. A zero filtered result SHALL offer filter clearing and guidance to star recipes without claiming the entire household library is empty.

#### Scenario: All with GOTO
- **WHEN** library summary reports 45 recipes and the GOTO-filtered page reports 3
- **THEN** Browse displays 3 as the collection total and navigation stays within those 3 recipes

#### Scenario: Departed GOTO request
- **WHEN** an earlier filtered request resolves after GOTO selection changes
- **THEN** it does not replace current cards, counts, position or feedback

#### Scenario: Empty filtered collection
- **WHEN** a current GOTO-filtered request succeeds with no eligible items
- **THEN** Browse shows GOTO-specific no-match guidance with Clear Go-To and guidance to star recipes without reopening management

#### Scenario: Additional pages and recovery
- **WHEN** a GOTO-filtered list appends or a stack loads an adjacent, wrapped or retried page
- **THEN** that request retains current gotoOnly, discoverableOnly, page size and applicable history-generation context

### Requirement: Refresh GOTO Browse after confirmed local membership changes

A confirmed local GOTO membership change SHALL reload a mounted applied-GOTO Browse from page one, retaining its All/Discovery and presentation settings. A rejected save SHALL retain confirmed membership and current results. A failed reload after a successful save SHALL offer read retry without reporting the save as rejected or repeating it.

#### Scenario: Remove from recipe detail
- **WHEN** removing an eligible recipe from GOTO saves successfully while Browse has GOTO applied
- **THEN** the refreshed collection excludes it and uses the new filtered total

#### Scenario: Failed refresh after saved removal
- **WHEN** removal saves but the following collection request fails
- **THEN** the saved membership remains confirmed and recovery retries retrieval rather than removal

#### Scenario: Close unchanged detail
- **WHEN** a person opens and closes detail without changing GOTO membership
- **THEN** Browse retains its current card and position without a membership-triggered refresh

### Requirement: Preserve Browse usability on short viewports

Browse SHALL recover space by removing the extra Filters row first and preserve current preferred stack/card dimensions on the normal phone viewport. Size reduction SHALL apply only when genuinely less viewport space is available, not globally lower preferred dimensions. Controls SHALL keep 48 by 48 CSS px targets, readable labels and visible focus; content SHALL reflow/scroll without horizontal overflow or traps, respecting safe areas and reduced motion.

#### Scenario: Preserve normal-phone baseline size
- **WHEN** Browse is compared before and after the toolbar change at the same normal-phone reference viewport, content, locale, text scale and safe-area conditions
- **THEN** preferred stack/card width and height remain unchanged within 1 CSS px rounding and the image area is not reduced solely for the toolbar change
- **AND** the removed Filters row recovers space; moving the stack upward does not count as shrinking it

#### Scenario: Adaptive fallback does not lower preferred size
- **WHEN** Browse adapts to a genuinely smaller available viewport and is then shown at the normal-phone reference viewport
- **THEN** the smaller-screen constraints do not reduce the reference viewport’s preferred stack/card size

#### Scenario: Initial short portrait view
- **WHEN** stack Browse opens at 320x568 or 390x667 CSS px at ordinary text size
- **THEN** the initial viewport shows the toolbar, a recognizable recipe image, title, recipe-opening/selection action and stack navigation without scrolling first
- **AND** the extra Filters row does not occupy height

#### Scenario: Short landscape and enlarged content
- **WHEN** either presentation uses 667x375 CSS px or 200% text, including French and long recipe names
- **THEN** toolbar dismissal and navigation stay available and essential body actions remain reachable by intentional content scrolling without clipping, horizontal overflow or reduced touch targets

#### Scenario: List and tablet
- **WHEN** Browse uses list presentation or iPad portrait/landscape
- **THEN** useful recipe content starts in the viewport and navigation, paging, filter state and Close remain operable

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
