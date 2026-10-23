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

For Explicit and Find Similar, Top Pick SHALL be only the first qualified candidate. If rank 1 is ineligible for Top Pick presentation, Search SHALL omit Top Pick and retain rank 1 first in ordinary results. It SHALL NOT scan lower ranks for a replacement. Discovery SHALL retain its separate promotion contract.

#### Scenario: Rank one has an active report

- **WHEN** the first Explicit candidate is ineligible for Top Pick presentation and rank two is eligible
- **THEN** Top Pick is absent, rank one remains the first ordinary result and rank two is not promoted

#### Scenario: Rank one is eligible

- **WHEN** the first Explicit or Find Similar candidate is eligible for Top Pick presentation
- **THEN** it is presented as Top Pick and omitted once from ordinary alternatives

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

Activating Find similar in Search detail SHALL dismiss detail, clear the visible query and submit the loaded recipe identity as the similar target while retaining active filters, preferences and planning context. Similar SHALL exclude the source recipe and return no candidates when that source is missing, deleted or not ready.

#### Scenario: Find similar action

- **WHEN** the person activates Find similar on a loaded recipe
- **THEN** detail closes and an empty-query request identifies that recipe as similar target

#### Scenario: Source unavailable

- **WHEN** the source is missing, deleted or not ready when Similar is evaluated
- **THEN** no similar candidates are returned

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

Browse SHALL rank promotion-eligible candidates first by affinity descending and saved cooked-event date ascending. Remaining ordering SHALL use never-cooked recipes first, recipe last-cooked date ascending, H descending from weekly-household-interest, creation descending and identity. With no active review filter, its initial bounded candidate window SHALL select the first promotion-eligible report-free candidate as Top Pick, removing it from alternatives.

#### Scenario: Two eligible favorites

- **WHEN** eligible candidates differ in saved affinity
- **THEN** the larger affinity ranks first

#### Scenario: No promotable candidate in initial window

- **WHEN** the initial candidate window has no eligible report-free candidate
- **THEN** Top Pick is absent and ordinary alternatives remain

#### Scenario: Equal ordinary cooking dates

- **WHEN** ordinary candidates share a last-cooked date
- **THEN** H descending, then creation descending and identity break the remaining ties

### Requirement: Select ranked Top Pick separately from browse promotion flags

Explicit and Find Similar SHALL order candidates by their base retrieval order and applicable explicit field order. Top Pick SHALL be rank 1 only when rank 1 is presentation-eligible. If rank 1 is ineligible or a review filter is active, Top Pick SHALL be absent and the full ordered sequence SHALL remain ordinary results. Browse promotion flags SHALL apply only to Discovery.

#### Scenario: Highest ranked has a report

- **WHEN** a reported Explicit candidate ranks first and an ordinary report-free candidate follows
- **THEN** Top Pick is absent and the reported candidate remains first in ordinary results

#### Scenario: Rank one is eligible

- **WHEN** the first Explicit or Find Similar candidate is presentation-eligible
- **THEN** it becomes Top Pick without changing the relative order of remaining candidates

#### Scenario: All candidates reported

- **WHEN** every Explicit or Find Similar candidate has an active report
- **THEN** Top Pick is absent and the complete ordered sequence remains ordinary results

#### Scenario: Review mode

- **WHEN** a review filter is active
- **THEN** recipe-quality Present review matches as ordinary results applies and no Top Pick is selected

### Requirement: Use server eligibility for local Surprise Me

Surprise Me SHALL choose only a loaded alternative carrying true server promotion eligibility, without import issue status and different from the current Top Pick. It SHALL replace the displayed Top Pick locally, remove the chosen alternative and return the previous Top Pick to alternatives when present. It SHALL NOT request search or persist a meal assignment.

#### Scenario: Eligible alternate exists

- **WHEN** the person activates Surprise Me with eligible loaded alternatives
- **THEN** one eligible alternative becomes the displayed Top Pick without a search or assignment request

#### Scenario: No eligible alternate

- **WHEN** all loaded alternatives are unflagged or have issue status
- **THEN** Surprise Me is disabled with an unavailable explanation and retains the result set

#### Scenario: Obsolete promotion generation

- **WHEN** loaded data belongs to a prior promotion generation
- **THEN** it cannot be used by Surprise Me

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

When a current response has nextCursor and an observer reports the result sentinel intersecting, Search SHALL request continuation with current query, filters, preferences, similar and planning context. Browse SHALL request 24 alternatives and ranked paths 12. Only one continuation SHALL be in flight for that search generation.

#### Scenario: Repeated observer notifications

- **WHEN** the sentinel is reported intersecting repeatedly while its generation continuation is pending
- **THEN** only one continuation request starts

#### Scenario: No cursor

- **WHEN** the response supplies no nextCursor
- **THEN** Search presents no continuation sentinel or request through that cursor

### Requirement: Append current continuation without repeating loaded alternatives

A continuation success belonging to the current search and promotion generation SHALL append alternatives whose identities are absent from already loaded alternatives, retain the existing Top Pick and adopt the next cursor. A ranked continuation SHALL not return another Top Pick. Exhaustion SHALL be represented by no next cursor.

#### Scenario: Page arrives

- **WHEN** a current continuation contains both an already loaded alternate identity and a new one
- **THEN** the existing alternate is not appended again and the new one is appended

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

Initial, replacement and continuation successes SHALL be ignored when their captured search generation or promotion version no longer matches current state. The initial effect SHALL also ignore completion after its cleanup. These guards SHALL NOT establish cancellation of browser network requests or suppression of every obsolete failure presentation.

#### Scenario: Older initial browse finishes

- **WHEN** a newer text search has already advanced the search generation
- **THEN** the old initial success cannot replace the newer results

#### Scenario: Old continuation finishes

- **WHEN** a replacement search or promotion invalidation occurred before continuation success
- **THEN** that success is not appended to current data

### Requirement: Restart mounted browse after received promotion invalidation

When mounted Search observes a newer promotion generation, it SHALL withhold obsolete cards and refresh browse, typed and Similar results using current query, filters, preferences, similar target and planner context. This SHALL also apply while an initial or replacement request is pending. Invalidation delivery remains with household-live-updates; server eligibility and ranking remain authoritative.

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

Regular Search cards SHALL use the compact Browse list presentation: edge-to-edge 4:3 images, small rounded corners, padded content with names visible up to two lines and readable formatted time. Narrow mobile layouts SHALL retain two columns with compact spacing. Supplied issue badges SHALL remain visible. Top Pick SHALL retain its distinct hero, reason and Surprise Me control.

#### Scenario: Narrow results with Top Pick
- **WHEN** Search shows a Top Pick and ordinary alternatives at 360, 390 or 430 CSS pixels
- **THEN** ordinary cards match Browse list image treatment and content spacing while Top Pick remains distinct
- **AND** long names occupy up to two lines and issue badges remain inside their images

#### Scenario: No Top Pick
- **WHEN** Search returns ordinary alternatives without a Top Pick
- **THEN** the same compact grid displays them in their returned order without inventing a promoted card

#### Scenario: Return from compact card detail
- **WHEN** a person opens a compact card and closes its detail
- **THEN** the mounted query, selections and cards retain their existing return behavior and compact geometry without a close-triggered search
