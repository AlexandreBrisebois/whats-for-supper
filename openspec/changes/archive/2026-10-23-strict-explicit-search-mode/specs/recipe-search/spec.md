# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Apply family signals only to retrieved standard ranked candidates

**Reason**: Household rating and vote modifiers can move weaker explicit matches ahead of stronger retrieval matches; they are now Discovery-only signals.

**Migration**: Preserve the existing bounded family-signal behavior in unconstrained Discovery and remove it from Explicit and Find Similar ordering.

### Requirement: Demote ranked candidates already shown in the target week

**Reason**: Score demotion is a planner preference reranker and conflicts with strict Explicit and Find Similar ordering.

**Migration**: Express mandatory planner rules as hard eligibility constraints before limits; do not apply already-planned score demotion to Explicit or Find Similar.

### Requirement: Augment standard ranked Search without replacing relevance

**Reason**: Historical-interest tie-breaking is secondary personalization and no longer applies to Explicit search.

**Migration**: Retain historical ranking only in unconstrained Discovery and preserve the base retrieval order for Explicit and Find Similar.
