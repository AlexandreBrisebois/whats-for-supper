# Recipe search delta

## MODIFIED Requirements

### Requirement: Enter Search with optional planning and detail context

Recipes navigation SHALL open `/recipes` in Explore with collapsed controls and empty Search criteria. `focus=search`, Home Search and planner Search SHALL expand controls; supplied Similar SHALL activate Search. An `open` identity SHALL select detail independently of collection loading. Planning context SHALL retain its existing target, reference week, cancellation and assignment meanings.

#### Scenario: Ordinary entry
- **WHEN** the person opens Search without mode parameters
- **THEN** Explore is loaded from GET `/api/recipes?order=explore`, All scope is selected and search controls are collapsed

#### Scenario: Planning entry
- **WHEN** Search opens with addToDay and weekOffset
- **THEN** controls open expanded, the target remains available to Search and selection, and a planning banner offers Cancel back to `/planner`

#### Scenario: Detail link
- **WHEN** Search opens with an open recipe identity
- **THEN** that identity opens in detail while the page loads its collection; detail receives focus before any background search input

#### Scenario: Home selects today
- **WHEN** an unplanned Home pivot opens Search with today’s authoritative day index, week zero and reference week
- **THEN** controls open expanded and the same planning banner, filters, selection and cancellation behavior apply as when the planner opens Search for that day
- **AND** successful selection follows the existing planner success return and occupied-slot recovery, without a new Home/Today mode

### Requirement: Submit typed search after settling or Enter

The text input SHALL schedule collection resolution after 500 ms without another text change. Nonblank typed text SHALL clear Similar before either debounced or Enter submission; blank text SHALL retain Similar unless explicitly removed. With no remaining Search criteria, submission SHALL return to scoped Explore. Enter SHALL clear its pending debounce, blur the input and resolve the current query and remaining criteria. The client SHALL transmit the text as supplied; server retrieval SHALL trim it without rewriting the request text.

#### Scenario: Settled typing

- **WHEN** the person changes the text again within the debounce interval
- **THEN** the pending typing timer is replaced by one for the latest value

#### Scenario: Submit now

- **WHEN** the person presses Enter
- **THEN** the current text is submitted immediately and the input loses focus

#### Scenario: Type over Similar
- **WHEN** a person types nonblank text while Similar is active, then waits 500 ms or presses Enter
- **THEN** both paths submit text without a similar target, retaining other applied filters, scope and planning context
- **AND** no earlier Similar debounce can submit afterward

#### Scenario: Submit with no Search criteria
- **WHEN** submitted text is blank and Similar, Focus and non-scope Search filters are absent
- **THEN** the active collection becomes Explore with the current Discovery/Go-To scope rather than an empty-query POST search


### Requirement: Represent search results and loading feedback

While the current initial or replacement Search is loading, Recipes SHALL show loading feedback in either presentation. A successful initial response SHALL display `topPick` first, followed by alternatives in response order, deduplicated by identity. All SHALL be ordinary results without a spotlight, promotional reasons, Surprise Me or client random promotion. Returned names, descriptions, images, formatted times and issue indicators SHALL be retained where applicable.

#### Scenario: Results available

- **WHEN** the current response supplies a Top Pick and alternatives
- **THEN** the combined sequence renders in the selected stack or compact list presentation with Top Pick identity included once and no promotional reason displayed

#### Scenario: Replacement pending

- **WHEN** another search is loading
- **THEN** loading feedback replaces the results presentation

### Requirement: Offer recovery navigation for successful empty results

When a current successful response contains no Top Pick and no alternatives, Search SHALL show an empty-state message, Clear Filters and an explicit Clear search and browse action within Recipes. With active filters or concepts it SHALL use the filter-specific no-match message. Clear Filters SHALL clear filters and preferences including Discovery/Go-To scope, retaining text and Similar. Clear search and browse SHALL clear Search criteria and return to Explore retaining current scope. A zero-match success SHALL NOT silently substitute Explore results.

#### Scenario: Unfiltered empty response

- **WHEN** a current successful search returns no cards with no active filters
- **THEN** the general empty message and recovery controls appear

#### Scenario: Filtered empty response

- **WHEN** a current successful search returns no cards with active filters or concepts
- **THEN** the filter-specific message appears and Clear Filters can submit the cleared selections

#### Scenario: Empty while controls are hidden
- **WHEN** an active Search succeeds without matches after its controls have been hidden
- **THEN** the empty result stays visible with recovery actions and the active-search indication
- **AND** revealing controls restores the current values without replacement submission


### Requirement: Return from Search detail to mounted results

Selecting a search card SHALL open recipe detail without replacing the mounted Search state. Closing detail SHALL dismiss it and request restoration of the recorded list scroll position or stack position without a close-triggered search. Detail retrieval and editing SHALL retain recipe-library ownership, including Retrieve the selected library recipe for detail reading and the applicable detail-update requirements.

#### Scenario: Close a card

- **WHEN** the person opens a loaded card and then closes detail
- **THEN** the mounted query, Similar, filters, scope, planning context, disclosure state, presentation, pagination and loaded cards remain at their recorded position without a close-triggered search

#### Scenario: Open another linked identity

- **WHEN** the open URL parameter changes
- **THEN** the detail selection follows the new identity

### Requirement: Apply or discard filter drafts

Search SHALL offer one Filters chooser for narrow and wide layouts. Opening SHALL copy active filters, preferences and scope selections into a draft. Apply SHALL replace active selections, close the chooser and resolve the collection using current query, Similar and planning context: scope-only criteria use Explore; effective Search criteria use Search. Closing by Close, Escape or backdrop SHALL discard unsubmitted changes.

#### Scenario: Dismiss selection

- **WHEN** the person changes a draft then closes the chooser
- **THEN** active selections and search requests remain unchanged by that draft

#### Scenario: Apply selection

- **WHEN** the person selects Quick and applies
- **THEN** Quick becomes active and a new search carries quickOnly

#### Scenario: Apply scope alone
- **WHEN** only Discovery and/or Go-To remain selected after Apply with blank text and no Similar or Focus
- **THEN** the chooser closes, toolbar scope reflects those applied values and Recipes loads scoped Explore
- **AND** changing or dismissing an unapplied scope draft never changes toolbar scope or results


### Requirement: Clear selections without clearing the search text

Clear filters within the chooser SHALL clear draft filters and preferences including both Discovery and Go-To scope selections, taking effect on Apply. Search SHALL count selected array values, true boolean filters and Focus concepts in its active count. Query text SHALL remain independent of filter reset.

#### Scenario: Clear then dismiss

- **WHEN** the person clears a draft and closes without Apply
- **THEN** the active selections remain

#### Scenario: Apply cleared draft

- **WHEN** the person clears then applies
- **THEN** active filters, preferences and scope selections are empty, text and Similar are retained, and source selection follows the remaining criteria

### Requirement: Keep mounted search state through detail and chooser use

Query, Similar, applied filters/preferences, scope, loaded results, pagination, position, presentation and planning context SHALL remain within mounted Recipes through detail, chooser use and search disclosure. Normal departure SHALL discard the session. A fresh ordinary entry SHALL start in Explore with collapsed controls and All scope; explicit URL context SHALL initialize independently. Only existing member presentation preferences SHALL persist.

#### Scenario: Return from detail

- **WHEN** detail is closed while Search remains mounted
- **THEN** the current query and active selections remain

#### Scenario: Reload Search

- **WHEN** Search mounts afresh without similarTo or open context
- **THEN** text, filters, preferences and scope begin empty, controls are collapsed and Explore is selected with the saved member presentation preference

### Requirement: Present strict-mode Top Pick without promotion

For Explicit and Find Similar, the API `topPick` field SHALL be only the first qualified candidate. If rank 1 is ineligible for Top Pick presentation, Search SHALL omit Top Pick and retain rank 1 first in ordinary results. It SHALL NOT scan lower ranks for a replacement. The API Discovery response path SHALL retain its separate promotion contract; Recipes SHALL flatten any supplied initial `topPick` into ordinary results.

#### Scenario: Rank one has an active report

- **WHEN** the first Explicit candidate is ineligible for Top Pick presentation and rank two is eligible
- **THEN** Top Pick is absent, rank one remains the first ordinary result and rank two is not promoted

#### Scenario: Rank one is eligible

- **WHEN** the first Explicit or Find Similar candidate is eligible for Top Pick presentation
- **THEN** it is returned in the API `topPick` field and omitted once from the API alternatives; Recipes displays it as the first ordinary result

#### Scenario: Review filter

- **WHEN** a review filter requires ordinary-result presentation
- **THEN** Top Pick is absent and retrieval order is preserved

### Requirement: Select ranked Top Pick separately from browse promotion flags

Explicit and Find Similar SHALL order candidates by their base retrieval order and applicable explicit field order. Top Pick SHALL be rank 1 only when rank 1 is presentation-eligible. If rank 1 is ineligible or a review filter is active, Top Pick SHALL be absent and the full ordered sequence SHALL remain ordinary results. Browse promotion flags SHALL apply only to the API Discovery response path and SHALL NOT create a Recipes spotlight or random promotion.

#### Scenario: Highest ranked has a report

- **WHEN** a reported Explicit candidate ranks first and an ordinary report-free candidate follows
- **THEN** Top Pick is absent and the reported candidate remains first in ordinary results

#### Scenario: Rank one is eligible

- **WHEN** the first Explicit or Find Similar candidate is presentation-eligible
- **THEN** it populates the API `topPick` field without changing the relative order of remaining candidates; Recipes displays it as the first ordinary result

#### Scenario: All candidates reported

- **WHEN** every Explicit or Find Similar candidate has an active report
- **THEN** Top Pick is absent and the complete ordered sequence remains ordinary results

#### Scenario: Review mode

- **WHEN** a review filter is active
- **THEN** recipe-quality Present review matches as ordinary results applies and no Top Pick is selected

### Requirement: Order browse promotion before ordinary rediscovery

Within POST search’s Discovery response path, the API SHALL rank promotion-eligible candidates first by affinity descending and saved cooked-event date ascending. Remaining ordering SHALL use never-cooked recipes first, recipe last-cooked date ascending, H descending from weekly-household-interest, creation descending and identity. With no active review filter, its initial bounded candidate window SHALL select the first promotion-eligible report-free candidate as Top Pick, removing it from alternatives.

#### Scenario: Two eligible favorites

- **WHEN** eligible candidates differ in saved affinity
- **THEN** the larger affinity ranks first

#### Scenario: No promotable candidate in initial window

- **WHEN** the initial candidate window has no eligible report-free candidate
- **THEN** Top Pick is absent and ordinary alternatives remain

#### Scenario: Equal ordinary cooking dates

- **WHEN** ordinary candidates share a last-cooked date
- **THEN** H descending, then creation descending and identity break the remaining ties

#### Scenario: Unified Explore does not use Search promotion
- **WHEN** Recipes has no effective Search criteria, including Discovery/Go-To scope-only selection
- **THEN** it uses GET Explore ordering rather than this POST Discovery promotion path


### Requirement: Enter Similar from loaded detail

Activating Find similar in Recipes detail SHALL dismiss detail, expand search controls, clear text and any pending typing debounce, and submit the loaded recipe identity as the similar target while retaining active filters, preferences, scope, presentation and planning context. Similar SHALL exclude the source recipe and return no candidates when that source is missing, deleted or not ready.

#### Scenario: Find similar action

- **WHEN** the person activates Find similar on a loaded recipe
- **THEN** detail closes and an empty-query request identifies that recipe as similar target

#### Scenario: Source unavailable

- **WHEN** the source is missing, deleted or not ready when Similar is evaluated
- **THEN** no similar candidates are returned

#### Scenario: Recognize and remove Similar
- **WHEN** Similar is active with controls expanded
- **THEN** a localized removable Similar indicator identifies its context without requiring the source name to be available
- **AND** removing it retains text, filters, scope and planner context and resolves Search or Explore from the remaining criteria


### Requirement: Load continuation through the result sentinel

In list presentation, when a current response has nextCursor and an observer reports the result sentinel intersecting, Search SHALL request continuation with current query, filters, preferences, similar and planning context. The legacy POST browse response path SHALL retain 24-alternative continuation and ranked paths 12; these are not Explore offset pages. Stack continuation SHALL use the same current cursor and request context when navigating beyond loaded matches. Only one continuation SHALL be in flight for that search generation.

#### Scenario: Repeated observer notifications

- **WHEN** the sentinel is reported intersecting repeatedly while its generation continuation is pending
- **THEN** only one continuation request starts

#### Scenario: No cursor

- **WHEN** the response supplies no nextCursor
- **THEN** Search presents no continuation sentinel or request through that cursor

### Requirement: Append current continuation without repeating loaded alternatives

A continuation success belonging to the current search and promotion generation SHALL append alternatives whose identities are absent from the complete loaded result sequence including the initial topPick, retain the existing Top Pick and adopt the next cursor. A ranked continuation SHALL not return another Top Pick. Exhaustion SHALL be represented by no next cursor.

#### Scenario: Page arrives

- **WHEN** a current continuation contains both an already loaded alternate identity and a new one
- **THEN** the existing identity is not appended again and the new one is appended in response order without moving the current position

#### Scenario: Ranked pool exhausted

- **WHEN** the final ranked snapshot page is returned
- **THEN** it has no Top Pick or next cursor

### Requirement: Suppress obsolete search success without claiming network cancellation

Initial, replacement and continuation outcomes SHALL be ignored after departure or when their captured collection identity, search generation or invalidation version no longer matches current state. This SHALL cover success, failure and pending-feedback updates without promising network cancellation. Hiding or reopening controls SHALL NOT change those identities or invalidate current work.

#### Scenario: Older initial browse finishes

- **WHEN** a newer text search has already advanced the search generation
- **THEN** the old initial success cannot replace the newer results

#### Scenario: Old continuation finishes

- **WHEN** a replacement search or promotion invalidation occurred before continuation success
- **THEN** that success is not appended to current data

### Requirement: Restart mounted browse after received promotion invalidation

When mounted Recipes has an active Search and observes a newer promotion generation, it SHALL withhold obsolete cards and refresh browse, typed and Similar results using current query, filters, preferences, similar target and planner context. This SHALL also apply while an initial or replacement request is pending. Invalidation delivery remains with household-live-updates; server eligibility and ranking remain authoritative.

#### Scenario: Browse invalidated
- **WHEN** a mounted browse observes a newer promotion generation
- **THEN** old cards are withheld and a replacement initial request is scheduled with active context

#### Scenario: Ranked data invalidated
- **WHEN** a mounted typed or Similar response becomes obsolete
- **THEN** a replacement initial request retains current search context and displays its current successful results without retyping

#### Scenario: Invalidation before a response
- **WHEN** invalidation arrives during an initial or replacement request
- **THEN** a fresh request starts with current context and the obsolete request cannot replace its results or error presentation

#### Scenario: Repeated events and later typing
- **WHEN** another invalidation or new search supersedes a pending refresh
- **THEN** only current-generation outcomes are displayed; completed refreshes and later typing do not themselves repeat an already handled invalidation

#### Scenario: Search invalidated with controls hidden
- **WHEN** Search invalidation arrives with active text, Similar or filters while controls are hidden
- **THEN** the current-context replacement proceeds with controls remaining hidden and obsolete outcomes suppressed

#### Scenario: Explore is active
- **WHEN** a collection refresh is required while Recipes is in Explore
- **THEN** it follows Browse’s current scope, history-generation and retained-card/retry rules without creating an empty-query POST search


### Requirement: Present compact regular Search cards

Regular Search cards SHALL use the compact Browse list presentation: edge-to-edge 4:3 images, small rounded corners, padded content with names visible up to two lines and readable formatted time. Narrow mobile layouts SHALL retain two columns with compact spacing. Supplied issue badges SHALL remain visible. An initial topPick SHALL use the same ordinary card treatment and appear exactly once before alternatives. Stack presentation SHALL show that same ordered sequence using the shared stack cards with returned descriptions. No spotlight, reason or Surprise Me control SHALL appear.

#### Scenario: Narrow results with Top Pick
- **WHEN** Search shows a Top Pick and ordinary alternatives at 360, 390 or 430 CSS pixels
- **THEN** ordinary cards match Browse list image treatment and content spacing including the former Top Pick as the first ordinary card
- **AND** long names occupy up to two lines and issue badges remain inside their images

#### Scenario: No Top Pick
- **WHEN** Search returns ordinary alternatives without a Top Pick
- **THEN** the same compact grid displays them in their returned order without inventing a promoted card

#### Scenario: Return from compact card detail
- **WHEN** a person opens a compact card and closes its detail
- **THEN** the mounted query, selections and cards retain their existing return behavior and compact geometry without a close-triggered search

### Requirement: Expose GOTO within Search Filters

Search Filters SHALL offer GOTO as an initially visible boolean selection without Go-To management, pending-management rows or Add a Go-To acquisition actions. Existing draft, Apply, Clear, dismissal and active-count semantics SHALL include GOTO. A fresh ordinary mount SHALL initialize it inactive. Its applied value SHALL match the toolbar Go-To scope; Go-To alone SHALL use Explore, while a POST request with Go-To SHALL retain its existing filter-only or ranked API policy.

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

## ADDED Requirements

### Requirement: Resolve collection mode independently of control visibility

Effective nonblank text, Similar, Focus or another supported Search filter SHALL select POST `/api/recipes/search`, constrained by applied Discovery/Go-To scope. Scope selections alone SHALL select GET Explore. Expanding or collapsing controls SHALL NOT change collection mode. Search ranking, retrieval, semantic fallback, review eligibility and cursor contracts SHALL remain unchanged.

#### Scenario: Expand over Explore
- **WHEN** a person reveals Search without entering or applying criteria
- **THEN** the same Explore collection, ordering, pagination and position remain without a Search request

#### Scenario: Search within scope
- **WHEN** text, Similar, Focus or Quick is active alongside Discovery and/or Go-To
- **THEN** POST search carries the existing discoverableOnly/gotoOnly constraints with Search criteria and any planner target
- **AND** both presentations display the Search order rather than reordering matches into Explore order

#### Scenario: Remove the last Search criterion
- **WHEN** submitted or applied criteria contain only library scope
- **THEN** the collection returns to scoped Explore, even if controls remain expanded

### Requirement: Hide and restore Search without altering its session

Closing Search SHALL hide only its input, Filters and Similar indicator. It SHALL retain criteria, applied filters/preferences, scope, results, pagination, position, presentation and planning context. Reopening SHALL restore current values and focus the input. Hiding SHALL NOT submit a request, cancel pending debounce or invalidate an in-flight request.

#### Scenario: Hide during debounce
- **WHEN** nonblank text has a pending 500 ms debounce and the person hides Search before it fires
- **THEN** that debounce still submits its current criteria once on schedule and the result can settle while controls remain hidden

#### Scenario: Hide during request or continuation
- **WHEN** a current initial, replacement or continuation request is pending and Search is hidden then reopened
- **THEN** no disclosure-triggered request or invalidation occurs and the current result, cursor, position and presentation are preserved on completion
- **AND** any current failure still uses its normal error/retry state

#### Scenario: Hide loaded Search
- **WHEN** a person at a later Search stack card or scrolled list position hides and reopens controls
- **THEN** the same query, Similar, applied filters, loaded results, pagination, position and view remain; opening focuses the input without resetting collection position

### Requirement: Indicate active Search when its controls are collapsed

The collapsed Search toolbar control SHALL visibly and accessibly distinguish active Search from ordinary Explore without relying on colour alone. It SHALL expose disclosure expansion separately from active collection state and provide a localized accessible description of active Search. Planning context SHALL remain visible independently of disclosure.

#### Scenario: Active collapsed state
- **WHEN** Search is active but controls are collapsed, including a zero-match, loading or failed Search
- **THEN** the Search icon has a persistent non-colour active indicator, an accessible active-search description and collapsed disclosure state

#### Scenario: Collapsed Explore state
- **WHEN** only Discovery/Go-To scope is active with controls collapsed
- **THEN** the Search control is collapsed without claiming an active Search; scope controls retain their selected states

### Requirement: Clear Search explicitly while retaining library scope

Clear search and browse SHALL clear text, Similar, Focus and other non-scope Search filters/preferences, cancel obsolete debounce, invalidate Search requests/cursors and load Explore from its beginning. It SHALL retain current Discovery/Go-To scope, presentation and planner context. Hiding Search SHALL NOT perform this action.

#### Scenario: Clear active Search
- **WHEN** a person activates Clear search and browse while Search is loaded, pending, empty or failed
- **THEN** scoped Explore replaces it without stale Search results or errors arriving later
- **AND** scope, presentation, planning context and current disclosure visibility are retained

### Requirement: Synchronize applied scope and discard unapplied scope drafts

Toolbar scope SHALL apply immediately. Filters SHALL initialize from current applied scope and commit scope only on Apply. Clear Filters SHALL clear both scope selections and all filter/preference selections, retaining text and Similar. Dismissing a chooser draft SHALL discard it without requests or changes to applied scope.

#### Scenario: Toolbar to chooser and back
- **WHEN** Go-To or Discovery is toggled in the toolbar, then Filters is opened
- **THEN** the draft reflects that scope; applying a changed scope updates the toolbar and reloads the correct collection from the beginning

#### Scenario: Clear Filters with and without remaining intent
- **WHEN** Clear Filters is applied with text or Similar still active
- **THEN** Search continues without scope or filter/preference constraints
- **AND** if neither text nor Similar remains, Explore starts in All scope

### Requirement: Navigate Search stacks within cursor boundaries

A Search stack SHALL move backward only through loaded matches and forward through the current cursor continuation, without Explore wrapping. It SHALL stop at the beginning and exhausted end, retaining position while a boundary request is pending or fails. Before exhaustion its position display SHALL distinguish loaded matches and availability of more; an exact total SHALL be shown only once no next cursor remains.

#### Scenario: Reach the first match
- **WHEN** previous navigation is requested at Search index zero
- **THEN** no wrap or request for a calculated last Explore page occurs

#### Scenario: Continue beyond loaded matches
- **WHEN** next is requested at the last loaded Search match with a cursor
- **THEN** at most one compatible continuation is requested and the card remains until a following unique match is available
- **AND** success appends in order; backward navigation can revisit loaded matches without another request

#### Scenario: Exhaustion or continuation failure
- **WHEN** a final page has no cursor, or a boundary continuation fails
- **THEN** exhaustion stops at the final match with an exact distinct served-result total; failure retains the current card and shows retry or Restart search for 409 without claiming exhaustion

### Requirement: Keep Search disclosure accessible and responsive

Search disclosure SHALL use semantic keyboard-operable controls with visible focus, 48 CSS px toolbar targets, correct expansion state and localized names. Expanded controls, planning banner, both presentations and recovery actions SHALL reflow or scroll above safe-area-aware app navigation. Reduced motion SHALL preserve the same actions and state transitions.

#### Scenario: Keyboard disclosure and sheet return
- **WHEN** Search is opened by keyboard, hidden, or Filters/detail/bin is explicitly dismissed
- **THEN** opening focuses the input; hiding from inside its region returns focus to Search; sheet dismissal returns focus to its connected trigger or an appropriate current result
- **AND** route departure never restores focus to a departed trigger and hidden input/Filters are absent from the tab order

#### Scenario: Locale and available space
- **WHEN** either presentation is used in English or French at short portrait, landscape, tablet or 200% text sizes
- **THEN** toolbar reading order, active-state meaning, input, Filters, recovery actions and bottom navigation remain usable without clipped essential content or horizontal overflow

## REMOVED Requirements

### Requirement: Use server eligibility for local Surprise Me

**Reason**: The unified Recipes destination presents one ordered ordinary result stream and no longer promotes a random loaded alternative.

**Migration**: Browse the returned stream in stack or list. Keep the existing API promotion fields for compatibility; do not use them for a spotlight, Surprise Me or random reorder.
