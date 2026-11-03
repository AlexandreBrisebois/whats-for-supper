# Recipe library delta

## MODIFIED Requirements

### Requirement: Open the household library and offer list presentation

The bottom Recipes navigation SHALL open `/recipes`. The unified library SHALL offer stack and list presentation and SHALL keep bottom app navigation visible. Home SHALL NOT offer a separate Browse button. Access and member context SHALL follow the existing household-identity requirements.

#### Scenario: Open from Home
- **WHEN** a person on Home with the existing household access and member context activates the bottom Recipes navigation control
- **THEN** the application opens `/recipes` in Explore with collapsed search, no Search criteria and All scope, using the saved member presentation preference

#### Scenario: Select list presentation
- **WHEN** a person in Explore stack presentation activates “Show recipe list” and the preceding summary request succeeds
- **THEN** Recipes selects list presentation and requests its first page

### Requirement: Request list pages for the selected library filter

In the Explore collection, in list presentation the library SHALL request GET `/api/recipes` with `order=explore`, limit 12 and the current All/Discovery filter. All SHALL send `discoverableOnly=false` and Discovery SHALL send true. After successful summary retrieval, entry into list presentation or changing All/Discovery SHALL request page 1.

#### Scenario: Load the All list
- **WHEN** list presentation loads with the initial All filter and its preceding summary request succeeds
- **THEN** it requests page 1 with explore ordering, limit 12 and `discoverableOnly=false`

#### Scenario: Change to Discovery
- **WHEN** a person changes All to Discovery in list presentation and the preceding summary request succeeds
- **THEN** it requests page 1 with explore ordering, limit 12 and `discoverableOnly=true`

### Requirement: Offer and load library stack presentation

In the Explore collection, the library SHALL use stack presentation when the selected member has no saved list preference or current override. Selecting Show recipe stack SHALL select stack presentation. After the shared summary succeeds, stack first-page loads SHALL request explore order, limit 20 and the active All/Discovery filter.

#### Scenario: Load the default stack
- **WHEN** a member without a saved list preference enters the library and summary retrieval succeeds
- **THEN** the stack requests page 1 with order explore, limit 20 and discoverableOnly false

#### Scenario: Switch from list to stack
- **WHEN** a person selects Show recipe stack from list presentation and summary retrieval succeeds
- **THEN** stack presentation starts its page-1 load with limit 20 and the selected collection filter

### Requirement: Wrap stack navigation within available results

In the Explore collection, for a stable collection, navigation SHALL fetch missing adjacent pages and reach every eligible recipe in both directions. Next at the collection end SHALL wrap to its first card. Previous at its first card SHALL select the last card, requesting the calculated final page with limit 20 and the active filter when necessary. Pending page retrieval SHALL retain the current position.

#### Scenario: Loop forward after the last loaded card
- **WHEN** next is requested at the final collection card with no pending prefetch for more pages
- **THEN** the first collection card becomes current

#### Scenario: Wait at a pending page boundary
- **WHEN** next is requested on the final collection card while more pages are indicated and prefetch is pending
- **THEN** navigation waits at that boundary

#### Scenario: Wrap backward to loaded end
- **WHEN** previous is requested at the first card with the active total already loaded and no more pages
- **THEN** the final collection card becomes current

#### Scenario: Retrieve the final page for backward wrapping
- **WHEN** previous is requested at the first card with a positive active count and the end not loaded
- **THEN** the calculated final-page request uses explore order, limit 20 and the active filter, and its last returned card becomes current

### Requirement: Display the loaded stack position against selected total

In the Explore collection, the action bar SHALL display current global collection ordinal and the selected collection total in position / total form. The ordinal SHALL include preceding pages, including after backward wrap. Offset pagination SHALL NOT promise a stable snapshot during concurrent server mutations.

#### Scenario: Display stack depth
- **WHEN** the current global index is 2 and selected total is 24
- **THEN** the indicator reads 3 / 24

### Requirement: Offer compact GOTO filtering on Browse

Browse SHALL offer an immediate Go-To Star toggle immediately right of its existing single All/Discovery toggle in the same toolbar. Activation SHALL toggle the applied membership filter without Apply. With search controls collapsed, Recipes SHALL NOT show a Filters row. Expanding Search SHALL expose the Search Filters chooser below the toolbar, without Go-To management. Applied Go-To state SHALL be shared between the toolbar and chooser; draft state SHALL remain unapplied until Apply. Selection SHALL survive All/Discovery and stack/list changes while mounted.

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

### Requirement: Preserve Browse usability on short viewports

Recipes SHALL omit the Search controls row when collapsed and preserve the current preferred stack/card dimensions where available space permits. Expanded controls and visible bottom navigation SHALL be included in available-space calculations. Size reduction SHALL apply only when genuinely less viewport space is available, not globally lower preferred dimensions. Controls SHALL keep 48 by 48 CSS px targets, readable labels and visible focus; content SHALL reflow/scroll without horizontal overflow or traps, respecting safe areas and reduced motion.

#### Scenario: Preserve normal-phone baseline size
- **WHEN** Browse is compared with search collapsed before and after unification where the same card space is available at the same normal-phone reference viewport, content, locale, text scale and safe-area conditions
- **THEN** preferred stack/card width and height remain unchanged within 1 CSS px rounding and the image area is not reduced solely for the toolbar change
- **AND** there is no permanently visible Filters row; moving the stack upward does not count as shrinking it

#### Scenario: Adaptive fallback does not lower preferred size
- **WHEN** Browse adapts to a genuinely smaller available viewport and is then shown at the normal-phone reference viewport
- **THEN** the smaller-screen constraints do not reduce the reference viewport’s preferred stack/card size

#### Scenario: Initial short portrait view
- **WHEN** stack Browse opens at 320x568 or 390x667 CSS px at ordinary text size
- **THEN** the collapsed layout shows the toolbar, a recognizable recipe image, title, recipe-opening/selection action, stack navigation and bottom app navigation; intentional vertical scrolling is available when content cannot fit
- **AND** the extra Filters row does not occupy height

#### Scenario: Short landscape and enlarged content
- **WHEN** either presentation uses 667x375 CSS px or 200% text, including French and long recipe names
- **THEN** toolbar controls and app navigation stay available and essential body actions remain reachable by intentional content scrolling without clipping, horizontal overflow or reduced touch targets

#### Scenario: List and tablet
- **WHEN** Browse uses list presentation or iPad portrait/landscape
- **THEN** useful recipe content starts in the viewport and app navigation, paging, filter state and Search disclosure remain operable without a Browse Close button

## ADDED Requirements

### Requirement: Keep the Recipes toolbar available in both presentations

Recipes SHALL order its toolbar controls Search, All/Discovery, Go-To, Stack/List, then Recycle bin, in visual and keyboard reading order. The same toolbar SHALL remain available in Explore and Search, with controls expanded or collapsed. Search SHALL reveal its input and Filters directly below the toolbar and focus the input.

#### Scenario: Search is the first toolbar control
- **WHEN** either stack or list presentation opens or changes collection mode
- **THEN** Search precedes All/Discovery, Go-To, Stack/List and Recycle bin
- **AND** the toolbar and bottom app navigation remain available while requests are pending

#### Scenario: Activate the disclosure
- **WHEN** a person activates Search with controls collapsed
- **THEN** the input and Filters appear directly below the toolbar and the input receives focus
- **AND** opening alone does not change the collection, ordering, position or request generation

### Requirement: Select Explore for library scope without Search criteria

Without effective Search criteria, Recipes SHALL use GET `/api/recipes` with `order=explore`. Discovery and Go-To SHALL constrain library scope individually or together without activating Search. The existing eligibility, Explore ordering, filtered totals, page sizes, history-generation, wrap, prefetch and retry contracts SHALL apply to that scoped collection.

#### Scenario: Scope-only browsing
- **WHEN** text is blank, Similar is absent and no effective non-scope Search filter or Focus is applied, with Discovery and/or Go-To selected
- **THEN** Recipes requests scoped Explore pages rather than POST search
- **AND** never-cooked first, oldest cooked date next, H descending, creation descending and identity ties are preserved

#### Scenario: Complete multi-page traversal
- **WHEN** a stable Explore library containing 40 or 46 eligible recipes is traversed at 20 per stack page
- **THEN** every recipe is reachable in both directions, including first-to-last backward wrap and last-to-first forward wrap, with correct global ordinals
- **AND** list presentation uses 12 per page and reaches the complete scoped collection

### Requirement: Switch presentation without replacing active Search results

Changing stack/list SHALL use the existing member-preference contract in either collection. It SHALL reset position while retaining Search criteria, scope, planning context, loaded Search matches and continuation state. Explore SHALL retain its existing presentation-specific first-page loading behavior. Selecting the current view SHALL NOT save a new preference.

#### Scenario: Change view during Search
- **WHEN** a person switches stack to list or list to stack with loaded or pending Search results
- **THEN** the view changes and its position resets to the beginning, while criteria and loaded results/cursor are retained
- **AND** no replacement Search is submitted solely for the view change and a pending current Search may complete into the new view

#### Scenario: Return after saving a view
- **WHEN** a saved list or stack preference is loaded on a fresh ordinary Recipes entry
- **THEN** Explore starts in that presentation with empty Search criteria and default All scope

### Requirement: Enter and leave Recipes through app navigation

Recipes SHALL be a normal app destination without the former Browse overlay Close action. Normal page departure SHALL discard its session, invalidate departed responses and reset Browse traversal state. A normal return SHALL start fresh in Explore with collapsed controls, no Search criteria and All scope, retaining only existing saved member presentation preferences.

#### Scenario: Leave while work is pending
- **WHEN** a person leaves Recipes during a debounce, initial request, page request or continuation
- **THEN** departed completions cannot alter another screen or a later Recipes session
- **AND** returning normally begins a new Explore session instead of restoring the old query or cursor

#### Scenario: Dismiss detail without departure
- **WHEN** a detail sheet is dismissed while Recipes remains mounted
- **THEN** the collection, card ordinal or list scroll position and presentation remain without a dismissal-triggered collection request

### Requirement: Preserve recipe actions within the unified collection

Both collections and presentations SHALL retain existing detail, editing, membership-star, discoverability, issue-indicator, recycle-bin and assignment/recovery contracts. A confirmed deletion SHALL dismiss detail and refresh the current collection through its own data source. Failed mutation and failed subsequent read SHALL remain distinct, with read retry never repeating a confirmed mutation.

#### Scenario: Delete from Explore or Search
- **WHEN** a detail deletion succeeds in either collection
- **THEN** Explore reloads its scoped first page or Search restarts with its current criteria and planning context
- **AND** exclusion follows the successful read; rejected deletion retains detail and current cards under the recycle-bin contract

#### Scenario: Retain shared controls
- **WHEN** a person opens detail or the Recycle bin from a stack or list in either collection
- **THEN** existing editing, stars, discoverability, issue reporting/review, bin recovery and planning actions remain available under their owning contracts
- **AND** dismissing an unchanged sheet returns to the same collection position and connected trigger focus

### Requirement: Redirect legacy Browse entry with supplied context

`/browse-all-stack` SHALL redirect to `/recipes` while preserving supported `gotoOnly`, `discoverableOnly`, `focus=search`, `similarTo`, `open`, `addToDay`, `weekOffset` and `referenceWeekStartDate` context. Retired `manageGoto` SHALL NOT reopen management. Scope-only entry SHALL use Explore; Search, Similar, detail and planner entry SHALL follow their existing contextual meanings.

#### Scenario: Legacy scope entry
- **WHEN** `/browse-all-stack?gotoOnly=true&manageGoto=true` opens
- **THEN** Recipes opens scoped Explore with the Go-To toggle pressed and no management surface

#### Scenario: Legacy contextual entry
- **WHEN** a supported legacy link supplies focused Search, Similar, detail identity or planner context alongside scope
- **THEN** the redirect retains those supported values and Recipes honors them without assigning a meal on entry

## REMOVED Requirements

### Requirement: Leave the Browse overlay through its navigation controls

**Reason**: Recipes replaces the separate Browse overlay; Search is an in-screen disclosure and bottom app navigation remains available.

**Migration**: Use the Recipes toolbar to reveal Search and bottom app navigation to leave. Departure resets transient state under Enter and leave Recipes through app navigation; there is no overlay Close action.
