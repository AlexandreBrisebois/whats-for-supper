# recipe-search Specification

## Purpose

Let household members search and filter existing household recipes, retrieve and rank candidates, inspect Similar results, and continue or recover result navigation using published search state.

## Relocated requirement references (non-normative)

References in preserved requirements to a combined capability now resolve to these exact requirement owners. This navigation does not change their policy.

- [Soft-delete the loaded recipe when not assigned to active planner slots](../recipe-recycle-bin/spec.md#requirement-soft-delete-the-loaded-recipe-when-not-assigned-to-active-planner-slots)
- [Exclude soft-deleted recipes from standard library listings and search](../recipe-recycle-bin/spec.md#requirement-exclude-soft-deleted-recipes-from-standard-library-listings-and-search)

## Relocation provenance (non-normative)

The original preamble and qualification records above describe earlier combined-capability checkpoints. Their historical counts, exclusions and lifecycle status remain evidence, not current ownership. All applicable limitations continue to apply after relocation.

- [recipe-search evidence record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/recipe-search.md)

## Capability dependencies (non-normative)

Preserved references to the former combined owners resolve through these current capability links. Each requirement retains its original normative text.

| Capability | Requirements / scenarios |
|---|---:|
| [recipe-search](../recipe-search/spec.md) | 39 / 90 |
| [search-indexing](../search-indexing/spec.md) | 10 / 19 |
| [data-backup-and-recovery](../data-backup-and-recovery/spec.md) | 24 / 58 |
| [scheduled-maintenance](../scheduled-maintenance/spec.md) | 5 / 14 |

- [Publish lexical content before optional embedding work](../search-indexing/spec.md#requirement-publish-lexical-content-before-optional-embedding-work)
- [Persist filter snapshot and facts as one materialization](../search-indexing/spec.md#requirement-persist-filter-snapshot-and-facts-as-one-materialization)
- [Exclude soft-deleted recipes from standard library listings and search](../recipe-recycle-bin/spec.md#requirement-exclude-soft-deleted-recipes-from-standard-library-listings-and-search)
- [Select saved issue membership for review](../recipe-quality/spec.md#requirement-select-saved-issue-membership-for-review)
- [Read the explicit Search target before assignment](../meal-assignment/spec.md#requirement-read-the-explicit-search-target-before-assignment)
- [Retrieve the selected library recipe for detail reading](../recipe-library/spec.md#requirement-retrieve-the-selected-library-recipe-for-detail-reading)
- [Soft-delete the loaded recipe when not assigned to active planner slots](../recipe-recycle-bin/spec.md#requirement-soft-delete-the-loaded-recipe-when-not-assigned-to-active-planner-slots)
- [Discover and apply recipe review filters](../recipe-quality/spec.md#requirement-discover-and-apply-recipe-review-filters)
- [Present review matches as ordinary results](../recipe-quality/spec.md#requirement-present-review-matches-as-ordinary-results)

## Requirements

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

The text input SHALL resolve after 500 ms without a change. Nonblank text SHALL clear Similar before submission; blank text SHALL retain Similar unless removed. Submission with no Search criteria SHALL return to scoped Explore. Enter SHALL cancel pending debounce, blur the input and resolve current criteria. The client SHALL transmit text as supplied; the server SHALL trim for retrieval without rewriting request text.

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

On a current successful zero-match response, Search SHALL show empty feedback, Clear Filters and Clear search and browse. Active filters or concepts SHALL use filter-specific feedback. Clear Filters SHALL clear filters, preferences and Discovery/Go-To scope while retaining text and Similar. Clear search and browse SHALL clear criteria and return to scoped Explore. Zero-match Search SHALL NOT silently show Explore results.

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

### Requirement: Refresh Search after a successful detail deletion

When detail invokes its successful-deletion callback, Search SHALL request replacement results using its current text, similar context, filters, preferences and planning target. Soft deletion eligibility and persistence SHALL follow recipe-library Soft-delete the loaded recipe when not assigned to active planner slots and Exclude soft-deleted recipes from standard library listings and search.

#### Scenario: Deleted card

- **WHEN** detail successfully deletes a recipe and invokes the callback
- **THEN** a new search is requested rather than treating old cards as authoritative

#### Scenario: Deletion rejected

- **WHEN** detail deletion fails before its success callback
- **THEN** Search does not request replacement through that callback

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

### Requirement: Expose supported shortcut and grouped controls

The chooser SHALL offer Quick, Family Favorite, Never Tried and GOTO initially, with New, It's Been a While, Reported and Ready to review behind More filters unless selected. Selected secondary choices SHALL remain visible after collapse. It SHALL offer Meal, Focus and available Cuisine groups with pressed-state feedback.

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

Query, Similar, applied filters/preferences, scope, loaded results, pagination, position, presentation and planning context SHALL remain within mounted Recipes through detail, chooser use and search disclosure. Normal departure SHALL discard the session. A fresh ordinary entry SHALL start in Explore with collapsed controls and All scope; explicit URL context SHALL initialize independently. Only existing member presentation preferences SHALL persist.

#### Scenario: Return from detail

- **WHEN** detail is closed while Search remains mounted
- **THEN** the current query and active selections remain

#### Scenario: Reload Search

- **WHEN** Search mounts afresh without similarTo or open context
- **THEN** text, filters, preferences and scope begin empty, controls are collapsed and Explore is selected with the saved member presentation preference

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

### Requirement: Classify search mode from normalized effective intent

Search SHALL classify a request after normalization. Find Similar SHALL take precedence when a source recipe identity is supplied. Otherwise nonblank text, at least one nonblank concept or at least one effective filter SHALL select Explicit; only a request with none of those inputs SHALL select Discovery.

#### Scenario: Empty request object

- **WHEN** text is blank, concepts are absent and filters are null or contain only inactive default values
- **THEN** Search selects Discovery

#### Scenario: Concept-only request

- **WHEN** text is blank and normalization retains one nonblank Focus concept
- **THEN** Search selects Explicit

#### Scenario: Effective filter

- **WHEN** text and concepts are blank and one filter materially restricts eligible recipes
- **THEN** Search selects Explicit

#### Scenario: Similar takes precedence

- **WHEN** a source recipe identity is supplied with any combination of text, concepts or filters
- **THEN** Search selects Find Similar and never applies Discovery personalization

#### Scenario: Response reports the selected policy

- **WHEN** Search returns Discovery, Explicit or Find Similar results
- **THEN** response `searchMode` is respectively `discovery`, `explicit` or `similar`, never the legacy `standard` value

### Requirement: Treat only effective filter values as explicit intent

Filter-object presence SHALL NOT select Explicit by itself. Empty collections, whitespace-only strings, false opt-in flags, unsupported default values and an empty filter object SHALL be inactive. A supported nonempty selection, effective range or true opt-in flag SHALL be effective.

#### Scenario: Empty filter object

- **WHEN** a request supplies `filters: {}` with no text or concepts
- **THEN** Search selects Discovery

#### Scenario: False flags and empty selections

- **WHEN** every supplied filter is false, empty, blank or a documented inactive default
- **THEN** those values do not select Explicit

#### Scenario: Supported active value

- **WHEN** at least one supported filter contains a normalized selection, effective range or true opt-in flag
- **THEN** the filter selects Explicit and constrains eligibility

### Requirement: Order filter-only Explicit results without personalization

After hard filters, filter-only Explicit results SHALL follow a field-specific order explicitly requested by the filter, or creation descending and normalized recipe name ascending when no filter defines order. Household signals, history, Discovery affinity and semantic similarity SHALL NOT affect this order.

#### Scenario: Ordinary filter-only request

- **WHEN** an effective filter is supplied without text or concepts and no filter defines an order
- **THEN** matching recipes are ordered by creation descending and normalized name ascending

#### Scenario: Cooked-recency filter

- **WHEN** the active filter explicitly requests oldest cooked recipes
- **THEN** that cooked-recency order precedes creation and name ties

#### Scenario: Household preferences change

- **WHEN** ratings, votes or historical interest change between otherwise identical filter-only searches
- **THEN** those changes do not alter the filter-only order

### Requirement: Preserve Explicit and Similar retrieval order

Explicit and Find Similar SHALL preserve their base retrieval order after hard eligibility filters. Household ratings, votes, historical interest, report status and planner preferences SHALL NOT promote, demote or tie-break qualified candidates. Find Similar SHALL retain its distinct similarity scorer and source exclusion.

#### Scenario: Stronger result is disliked

- **WHEN** a stronger Explicit retrieval match is disliked and a weaker match is loved or liked
- **THEN** the stronger retrieval match remains ahead

#### Scenario: Historical tie

- **WHEN** Explicit candidates have equal base retrieval scores but different historical interest
- **THEN** historical interest does not resolve their order

#### Scenario: Find Similar request

- **WHEN** Find Similar returns candidates with household signals or planner context
- **THEN** similarity order remains unchanged by those signals or planner preferences

### Requirement: Apply planner constraints without preference reranking

A planner rule that is mandatory for the request SHALL constrain eligibility before candidate limits. A planner preference SHALL NOT alter Explicit or Find Similar scores or order. Discovery MAY retain its separately specified calendar guards and promotion behavior.

#### Scenario: Mandatory planner constraint

- **WHEN** a planner request declares a recipe ineligible for the target
- **THEN** that recipe is removed before the retrieval or result limit

#### Scenario: Already-planned preference

- **WHEN** an otherwise eligible Explicit or Find Similar candidate already appears in the selected week
- **THEN** that fact alone does not demote or reorder the candidate

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

### Requirement: Continue from a frozen strict-mode sequence

An Explicit or Find Similar continuation SHALL consume the ordered initial snapshot without rerunning retrieval, qualification or ranking. It SHALL recheck current hard eligibility as already specified and SHALL NOT append candidates from another representation or recovery generation.

#### Scenario: Household state changes between pages

- **WHEN** ratings, votes, history or planner preference facts change after the first page
- **THEN** a valid continuation preserves the frozen candidate order

#### Scenario: Incompatible generation

- **WHEN** continuation state does not match the request, recovery or retrieval-generation identity
- **THEN** Search rejects the continuation for restart instead of mixing generations

### Requirement: Produce reproducible offline relevance evidence

The search evaluation SHALL use a versioned privacy-safe corpus with at least 40 development and 20 held-out English/French queries. Judgments SHALL be arm-independent grades 0, 1 or 2, with named hard negatives graded 0. Default evaluation SHALL make no external provider calls.

#### Scenario: Development iteration

- **WHEN** an evaluator compares retrieval or qualification arms before held-out scoring
- **THEN** it uses only the development set and records the corpus, query set, configuration and random-seed identities

#### Scenario: Held-out decision

- **WHEN** held-out results are scored
- **THEN** labels, metric definitions, thresholds and tolerated slice regressions were frozen before arm identities were inspected

#### Scenario: Default local run

- **WHEN** repository validation runs without explicit provider authorization
- **THEN** evaluation uses committed privacy-safe fixtures and performs no paid or production provider call

### Requirement: Score relevance arms with fixed metrics

Evaluation SHALL report per-query macro candidate recall at the fused window, precision at 5, graded nDCG at 10, irrelevant-result rate, no-match false-positive rate and named hard-negative admission rate. Top Pick SHALL count as rank 1 exactly once. Critical language and intent slices SHALL be reported separately.

#### Scenario: Top Pick is present

- **WHEN** an evaluated response contains Top Pick and alternatives
- **THEN** Top Pick occupies rank 1 and is not counted again among alternatives

#### Scenario: True no-match query

- **WHEN** a query is judged to have no relevant corpus result
- **THEN** any returned candidate contributes to the no-match false-positive rate

#### Scenario: Slice regression

- **WHEN** an overall arm improves but a frozen critical slice exceeds its tolerated regression
- **THEN** the arm does not pass its decision gate

### Requirement: Choose browse only without usable search content

With no similar target, no nonblank text, no usable preference concepts and no effective filters, Search SHALL return Discovery browse results without generating a query embedding. Candidates SHALL use recipe-library readiness/deletion facts and need not have a published search document. Effective filters SHALL select filter-only Explicit instead of personalized Discovery.

#### Scenario: Blank content

- **WHEN** a request has whitespace text, only blank concepts and no effective filters without a similar target
- **THEN** the service follows Discovery browse without query embedding generation

#### Scenario: Empty filter representation

- **WHEN** an otherwise blank request supplies an empty filter object or only inactive filter values
- **THEN** the representation alone does not prevent Discovery browse

#### Scenario: Recipe not indexed

- **WHEN** an otherwise Discovery-eligible recipe has no search document
- **THEN** the missing document alone does not exclude it from Discovery browse

#### Scenario: Effective filter without search content

- **WHEN** a request has no text or concepts but supplies an effective filter
- **THEN** it follows filter-only Explicit ordering without Discovery personalization

### Requirement: Retrieve typed lexical candidates from published documents

Typed ranked search SHALL retrieve a bounded set of ready, undeleted recipes whose published nonempty canonical search documents match the query phrase or a query term. Retrieval SHALL rank lexical candidates using the document match score before later modifiers. A rating or vote boost SHALL NOT independently retrieve an otherwise absent candidate.

#### Scenario: Published text matches

- **WHEN** an eligible published document matches a query term
- **THEN** it can enter the bounded lexical candidate pool

#### Scenario: No matching document

- **WHEN** a loved recipe has no matching published lexical document and is not retrieved semantically
- **THEN** its rating alone does not add it to results

### Requirement: Attempt compatible semantic retrieval when enabled

For ranked text or concept search with semantic retrieval enabled and available dependencies, Search SHALL attempt query embedding and bounded vector retrieval. Semantic candidates SHALL require a ready document and ready embedding matching its source fingerprint, configured model, version and dimensions, in addition to hard filters and recipe eligibility.

#### Scenario: Stale or incompatible vector

- **WHEN** a candidate embedding has a different fingerprint, model, version or dimension
- **THEN** that vector is excluded from semantic candidate retrieval

#### Scenario: Compatible pool

- **WHEN** eligible vectors satisfy configured compatibility and hard filters
- **THEN** the nearest bounded candidates can participate in ranked results

### Requirement: Use Focus concepts as semantic search content

Search SHALL trim and deduplicate nonblank preference concepts, joining them with nonblank query text for semantic retrieval. With only usable concepts it SHALL use a ranked semantic attempt rather than browse. A successful concept-only semantic attempt returning no candidates SHALL remain empty instead of substituting lexical matches.

#### Scenario: Concept-only request

- **WHEN** text is blank and a nonblank fish concept is supplied
- **THEN** ranked semantic retrieval is attempted when enabled and available

#### Scenario: Semantic zero match

- **WHEN** that concept-only semantic attempt succeeds with no compatible candidates while a lexical match exists
- **THEN** the response remains empty rather than treating zero candidates as a provider failure

### Requirement: Fall back from unavailable semantic work without promising relevance

Disabled or unavailable semantic retrieval SHALL allow typed lexical serving. A semantic timeout or provider/vector exception SHALL fall back to lexical candidates; concept-only fallback SHALL search using the usable concepts. Caller cancellation observed during semantic work SHALL propagate rather than be converted to semantic-failure fallback.

#### Scenario: Typed provider failure

- **WHEN** an attempted semantic provider throws while the caller remains active
- **THEN** the already retrieved typed lexical candidates are served

#### Scenario: Concept fallback

- **WHEN** semantic work is disabled, unavailable, times out or errors for a concept-only request
- **THEN** lexical retrieval uses the nonblank concepts with the active hard filters

#### Scenario: Caller cancels

- **WHEN** the caller cancellation token is canceled during semantic work
- **THEN** cancellation propagates instead of being handled as a fallback-only timeout

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

### Requirement: Rank Similar using source recipe facts with lexical recovery

Similar SHALL use a compatible ready source embedding for candidate retrieval when enabled and available, falling back to a bounded lexical query from source facts if unavailable or failed. Candidate filters and source exclusion SHALL apply before retrieval limits. Ranking SHALL combine source/candidate ingredient, cuisine, category, meal-type, known vegetarian and time similarity with the semantic term; family rating and vote boosts SHALL not apply.

#### Scenario: Source embedding unavailable

- **WHEN** the source has no compatible ready embedding
- **THEN** source facts produce a bounded lexical candidate query with the same hard filters and source exclusion

#### Scenario: Strongly aligned recipe

- **WHEN** a candidate aligns on structured source facts while another only has a closer vector
- **THEN** the structured score participates in the final order rather than vector distance alone

#### Scenario: Family favorite unrelated

- **WHEN** a similar candidate has high family rating or votes
- **THEN** those facts do not add family-fit boosts in Similar

### Requirement: Keep semantic availability a serving option

Search SHALL honor the server semantic-enabled option and configured candidate/model/version/dimension settings. Turning semantic retrieval off SHALL retain lexical and browse paths and make Similar use its lexical recovery path. This SHALL NOT establish model relevance, successful external service access or a total-request deadline.

#### Scenario: Semantic disabled

- **WHEN** semantic retrieval is configured off
- **THEN** browse and lexical search remain available and Similar uses lexical source-fact retrieval

#### Scenario: External embedding endpoint unavailable

- **WHEN** query embedding fails for an enabled typed request
- **THEN** the lexical fallback behavior applies instead of requiring semantic success

### Requirement: Combine ranked retrieval candidates by recipe identity

For a successful semantic attempt alongside typed lexical retrieval, Search SHALL combine the bounded candidate pools by recipe identity. A candidate found in both SHALL receive its normalized weighted retrieval contributions without becoming two cards. Explicit ordering SHALL preserve the resulting base retrieval order without Discovery modifiers.

#### Scenario: Both paths retrieve the recipe

- **WHEN** lexical and semantic retrieval return the same recipe identity
- **THEN** it enters final ranking once with both retrieval contributions

#### Scenario: Semantic-only candidate in a typed search

- **WHEN** an eligible candidate is returned only by successful semantic retrieval
- **THEN** it can enter the combined ranked pool without an exact lexical match

#### Scenario: Household signal differs

- **WHEN** combined Explicit candidates have different ratings, vote counts or historical interest
- **THEN** those Discovery signals do not modify their fused retrieval order

### Requirement: Keep browse rediscovery eligibility on the server

Browse promotion eligibility SHALL require positive saved affinity, a saved last-cooked event date at or before the configured rediscovery cutoff, and no calendar guard. The cutoff SHALL use server UTC today and the configured interval. Active Planned, Locked or AwaitingConsensus entries dated today or later, and Cooked entries in the selected server week, SHALL block promotion without removing ordinary result membership.

#### Scenario: No cooked evidence

- **WHEN** a candidate has positive affinity but no saved last-cooked event date
- **THEN** it is not browse-promotion eligible

#### Scenario: Active future calendar entry

- **WHEN** an otherwise eligible candidate has an active future assignment
- **THEN** it remains an ordinary candidate but is not promotion eligible

#### Scenario: Skipped entry only

- **WHEN** an otherwise eligible candidate has only a Skipped entry and no blocking event
- **THEN** that entry does not block browse promotion

### Requirement: Order browse promotion before ordinary rediscovery

Within the POST Discovery search path, the API SHALL rank eligible promotion candidates by affinity descending then saved cooked-event date ascending. Other candidates SHALL order by never-cooked first, last-cooked date ascending, weekly household interest H descending, creation descending and identity. Without a review filter, the initial bounded window SHALL select the first report-free eligible promotion as Top Pick and remove it from alternatives.

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

### Requirement: Bound alternatives and reject unsupported requests

POST search SHALL default to 12 alternatives and reject supplied limits outside 1 through 50 with 400. A Top Pick SHALL be separate from that alternatives count. A nonempty excludedIngredients list SHALL return 400 rather than promise exclusions. The browser adapter SHALL accept raw or data-enveloped successful responses and retain HTTP failure status for continuation recovery.

#### Scenario: Out-of-range limit

- **WHEN** a household search supplies limit 99
- **THEN** the server returns 400

#### Scenario: Unsupported exclusion

- **WHEN** a household search supplies a nonempty excludedIngredients list
- **THEN** the server returns 400

#### Scenario: Top Pick plus alternatives

- **WHEN** a successful response has enough candidates for the requested alternatives and a Top Pick
- **THEN** Top Pick does not consume an alternative slot

### Requirement: Load continuation through the result sentinel

In list presentation, an intersecting result sentinel with nextCursor SHALL request continuation using current criteria and planning context. Legacy POST browse SHALL retain 24-alternative continuation and ranked paths 12, separate from Explore offset pages. Stack navigation beyond loaded matches SHALL use the same cursor and context. Only one continuation SHALL be in flight per search generation.

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

### Requirement: Keep ranked continuation eligibility narrower than a fresh search

Ranked continuation SHALL retain its initial candidate order while rechecking current recipe readiness, deletion and the supported current recipe-field predicates, including Cuisine and Meal. It SHALL NOT promise reranking or replacement of stored display fields, report status or promotion flags from a fresh search.

#### Scenario: Cuisine changes

- **WHEN** an unserved ranked candidate no longer satisfies selected Cuisine or Meal at continuation time
- **THEN** it is excluded by the eligibility recheck

#### Scenario: Ranked state changes

- **WHEN** ranking or display facts change after the initial ranked search
- **THEN** continuation does not establish fresh ordering or fresh display fields

### Requirement: Reject unavailable or incompatible continuation state

A continuation token SHALL be rejected with 409 and restart guidance when missing from the current process store, expired, evicted or incompatible with the request fingerprint. Fingerprinting SHALL include query, similar target, planner target, filters and preferences while allowing continuation page size to differ. Cursor availability SHALL be bounded to process-local retained state with a ten-minute entry lifetime and capacity limit.

#### Scenario: Unknown token

- **WHEN** a search supplies a token absent from the current process
- **THEN** the response is 409 with restart guidance

#### Scenario: Changed preferences

- **WHEN** a retained token is reused with changed preferences
- **THEN** the token is rejected with restart guidance

#### Scenario: Changed batch size

- **WHEN** a retained compatible token is reused with only a valid limit change
- **THEN** that limit difference alone does not invalidate the fingerprint

### Requirement: Retain cards and expose continuation retry or restart

A continuation request failure for the current search generation SHALL retain loaded cards. A 409 SHALL expose Restart search, submitting a fresh initial request with current search context; other failures SHALL expose Load more retry using the cursor. These actions SHALL offer another attempt without promising successful recovery.

#### Scenario: Continuation expired

- **WHEN** a current continuation request returns 409
- **THEN** loaded cards remain and Restart search is offered

#### Scenario: Continuation fails otherwise

- **WHEN** a current continuation request fails with another status
- **THEN** loaded cards remain and Load more retry is offered

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

### Requirement: Retry a failed initial or replacement search

A current failed initial or replacement request SHALL show a search error and Retry instead of successful-empty guidance. Retry SHALL submit the current query, filters, preferences, similar target and planner context without requiring re-entry. A new request SHALL clear the prior error. Obsolete request failures SHALL NOT replace current results or errors.

#### Scenario: Refresh fails and retry succeeds
- **WHEN** an invalidation refresh fails and the person retries successfully
- **THEN** error and Retry replace loading, retained input is submitted again and current returned cards are displayed

#### Scenario: Valid empty result
- **WHEN** the current request succeeds without cards
- **THEN** existing successful-empty guidance appears without an error or retry claim

### Requirement: Keep history stable across continuation

Historical ranking SHALL apply only to Discovery and remain stable throughout a valid Discovery continuation chain. Explicit and Find Similar SHALL exclude history from ordering and preserve their initial ordered snapshots. A changed required generation SHALL preserve the compatible snapshot or cause explicit restart rather than silently append a reordered sequence.

#### Scenario: Window turns Monday
- **WHEN** the historical window changes between Discovery pages
- **THEN** the chain uses its original historical inputs or requests restart without silent duplicates or omissions

#### Scenario: Revote between pages
- **WHEN** a closed historical week is updated after page one
- **THEN** the old Discovery chain is pinned or rejected for restart and existing cards remain until recovery

#### Scenario: Typed continuation
- **WHEN** an Explicit continuation loads after new history arrives
- **THEN** stored order is preserved and existing eligibility rechecks remain in force

#### Scenario: Similar continuation
- **WHEN** Find Similar continuation loads after household or planner preference facts change
- **THEN** stored similarity order is preserved

### Requirement: Present compact regular Search cards

Regular Search cards SHALL use compact Browse list styling: edge-to-edge 4:3 images, small corners, padded names up to two lines and readable formatted time. Narrow mobile SHALL retain two columns. Supplied issue badges SHALL remain visible. An initial topPick SHALL appear once as the first ordinary card. Stack SHALL show the same order with shared stack cards. No spotlight, reason or Surprise Me control SHALL appear.

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

### Requirement: Make expanded Search recognizable and localized

When Search controls are expanded, the input SHALL show a magnifier, a localized example placeholder and a soft light surface with a visible terracotta focus state. The field SHALL retain its accessible Search name, current text and existing Enter, debounce, disclosure and focus-return behavior.

#### Scenario: Expand Search in either view
- **WHEN** a person expands Search in stack or list presentation in English or French
- **THEN** the field appears directly below the toolbar with its magnifier and localized example, and receives visible focus
- **AND** expansion alone does not submit or replace the current collection

#### Scenario: Return to a hidden active Search
- **WHEN** a current Search is active and its controls are hidden, then the person reopens them
- **THEN** the existing active marker disappears from the collapsed control, the field retains its criteria and focus returns to the input without changing results, position or pending work

### Requirement: Show applied Search selections and ordinary result context

Expanded Search SHALL show Filters with a visible count of applied selections and an accessible count description, counting shared scope choices once. A loaded nonempty Search list SHALL have a modest localized Results heading above its ordinary cards. Stack SHALL retain its compact position context. These cues SHALL not promote any result or change recovery actions.

#### Scenario: Applied filters in either presentation
- **WHEN** filters or scope selections are applied and Search controls are expanded in stack or list
- **THEN** Filters shows the applied count in text or digits as well as an accessible description
- **AND** draft selections dismissed without Apply do not change that count

#### Scenario: Ordinary list results
- **WHEN** a current Search returns one or more matches in list presentation
- **THEN** a localized Results heading introduces the compact ordinary cards in returned order
- **AND** the former Top Pick, when supplied, remains exactly one ordinary card without a spotlight, reason, Surprise Me or other promotion

#### Scenario: Empty or loading result state
- **WHEN** Search is loading or returns zero matches
- **THEN** the existing loading or empty recovery message remains the primary content instead of an empty Results section

### Requirement: Show planner target in a compact independent Recipes context

Planner-targeted Recipes SHALL show a compact, localized context row identifying the target day above the toolbar. It SHALL remain separate from Filters and visible whether Search controls are expanded or hidden, in stack and list. Search field and Filters SHALL still open directly below the toolbar. At ordinary phone text size the row's single-line height SHALL be no greater than 52 CSS px; long or enlarged text SHALL wrap and remain scrollable rather than clip.

#### Scenario: Enter from Planner or Home
- **WHEN** Recipes opens with a supported `addToDay` and `weekOffset` target from Planner or Home
- **THEN** a “Choosing for Monday” style localized context identifies the target day above the toolbar and the first recipe begins higher than with the former large banner
- **AND** the target identity, week context and existing selection action are unchanged

#### Scenario: Filters expand or change
- **WHEN** Filters opens, is dismissed, or applies selections that change its count or wrapping
- **THEN** the planning context keeps its independent position and target, without becoming part of the Filters row or changing the active Search session

#### Scenario: Hide Search or change view
- **WHEN** Search controls hide or reopen, or the person changes stack/list while planning
- **THEN** the compact context remains visible and the target, loaded results, current position and existing disclosure behavior are preserved

#### Scenario: Leave or recover the planning path
- **WHEN** the person activates the existing Cancel action or the calendar target needs its existing Retry action
- **THEN** Cancel returns to Planner and Retry remains available without inventing a Change-day action
- **AND** choosing a recipe continues through the existing assignment and occupied-slot recovery path

#### Scenario: French and enlarged content
- **WHEN** the day label or actions grow in French, at 200% text or on a short screen
- **THEN** the row reflows with visible focus, at least 48×48 CSS px action targets and no clipped text, horizontal overflow or dock overlap
- **AND** the first recipe and cancellation remain reachable by intentional scrolling when they cannot both fit initially
